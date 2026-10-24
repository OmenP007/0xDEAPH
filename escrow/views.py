import logging
import secrets
from pathlib import Path
from urllib.parse import unquote, urlsplit

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.http import FileResponse, Http404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import (
    CreateAPIView,
    ListCreateAPIView,
    RetrieveAPIView,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import APIKey, Dispute, KYCVerification, Offer, Paiement
from .permissions import IsAdmin, IsClient, IsDeveloper, IsOwnerOrAdmin
from .serializers import (
    APIKeyCreateSerializer,
    APIKeySerializer,
    ConfirmDeliverySerializer,
    DeveloperRegistrationSerializer,
    DeveloperTokenObtainPairSerializer,
    DisputeCreateSerializer,
    DisputeResolveSerializer,
    DisputeSerializer,
    KYCReviewSerializer,
    KYCVerificationSerializer,
    OfferCheckoutSerializer,
    OfferPublicSerializer,
    OfferSerializer,
    PaiementSerializer,
    PaiementStatusSerializer,
    UserRegistrationSerializer,
)
from .services import GeniusPayError, GeniusPayService, auto_release_expired_escrows

logger = logging.getLogger(__name__)

DOCS_DIRECTORY = Path(__file__).resolve().parent / "docs"
DOCS_FILES = {"index.html", "future_update.html"}


# ─── Santé ────────────────────────────────────────────────────────────────────

@extend_schema(tags=["Santé"])
class HealthView(APIView):
    """Point de contrôle de disponibilité de l'API."""
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        return Response({"status": "ok"})


# ─── Documentation HTML ───────────────────────────────────────────────────────

def serve_documentation(request, filename: str):
    if filename not in DOCS_FILES:
        raise Http404
    return FileResponse(
        (DOCS_DIRECTORY / filename).open("rb"),
        content_type="text/html; charset=utf-8",
    )


# ─── Inscription ──────────────────────────────────────────────────────────────

@extend_schema(tags=["Authentification"])
class RegisterView(CreateAPIView):
    """Crée un nouveau compte utilisateur standard."""
    serializer_class   = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_scope     = "auth"


# ─── Espace Développeur ───────────────────────────────────────────────────────

@extend_schema(tags=["Espace Développeur"])
class DeveloperTokenObtainPairView(TokenObtainPairView):
    """Authentification JWT dédiée aux développeurs (refuse clients et vendeurs)."""
    serializer_class = DeveloperTokenObtainPairSerializer


@extend_schema(tags=["Espace Développeur"])
class DeveloperRegisterView(CreateAPIView):
    """Inscription dédiée aux développeurs (rôle developer attribué par défaut)."""
    serializer_class   = DeveloperRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_scope     = "auth"


# ─── Paiements ────────────────────────────────────────────────────────────────

@extend_schema(tags=["Paiements"])
class PaiementListCreateView(ListCreateAPIView):
    """
    GET  — Liste les paiements impliquant l'utilisateur connecté.
    POST — Crée un nouveau paiement sous séquestre (rôle client requis).
    """
    serializer_class   = PaiementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Paiement.objects.filter(
                Q(buyer=self.request.user) | Q(seller=self.request.user)
            )
            .select_related("buyer", "seller")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        if self.request.user.role != "client":
            raise PermissionDenied("Seul un client peut initier un paiement.")

        paiement: Paiement = serializer.save(buyer=self.request.user)

        # Initiation auprès de GeniusPay
        try:
            escrow_id = GeniusPayService().initiate_escrow(paiement)
            paiement.escrow_id = escrow_id
            paiement.save(update_fields=["escrow_id"])
        except GeniusPayError as exc:
            logger.error("GeniusPay initiation échouée pour paiement #%s : %s", paiement.pk, exc)
            # On ne bloque pas la création — l'escrow_id restera vide jusqu'au retry.


@extend_schema(tags=["Paiements"])
class PaiementDetailView(RetrieveAPIView):
    """Détail d'un paiement (accessible à l'acheteur, au vendeur et aux admins)."""
    serializer_class   = PaiementSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if user.role == "deaph" or user.is_staff:
            return Paiement.objects.select_related("buyer", "seller").all()
        return Paiement.objects.filter(
            Q(buyer=user) | Q(seller=user)
        ).select_related("buyer", "seller")


@extend_schema(tags=["Paiements"])
class PaiementReleaseView(APIView):
    """
    POST — Libère les fonds vers le vendeur.
    Réservé à l'acheteur (client) du paiement concerné.
    Transition : BLOCKED → RELEASED.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: int) -> Response:
        paiement = self._get_paiement(pk, request.user)

        if paiement.buyer != request.user:
            raise PermissionDenied("Seul l'acheteur peut libérer les fonds.")

        if not paiement.can_transition_to("RELEASED"):
            raise ValidationError(
                f"Impossible de libérer un paiement en statut « {paiement.status} »."
            )

        # Protection contre la race condition (double-click, requêtes concurrentes)
        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            paiement_locked = Paiement.objects.select_for_update().get(pk=paiement.pk)
            if not paiement_locked.can_transition_to("RELEASED"):
                raise ValidationError(
                    f"Statut modifié concurremment : {paiement_locked.status}."
                )
            try:
                GeniusPayService().release_funds(paiement_locked.escrow_id)
            except GeniusPayError as exc:
                logger.error(
                    "GeniusPay release échoué pour escrow_id=%s : %s",
                    paiement_locked.escrow_id, exc,
                )
                raise ValidationError(f"Erreur GeniusPay : {exc}")

            paiement_locked.status = "RELEASED"
            paiement_locked.save(update_fields=["status", "updated_at"])

        logger.info(
            "[Audit] Paiement #%s libéré par l'acheteur #%s",
            paiement_locked.pk, request.user.pk,
        )
        return Response(PaiementStatusSerializer(paiement_locked).data)

    @staticmethod
    def _get_paiement(pk: int, user) -> Paiement:
        try:
            return Paiement.objects.get(pk=pk)
        except Paiement.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Paiement introuvable.")


@extend_schema(tags=["Paiements"])
class PaiementRefundView(APIView):
    """
    POST — Rembourse l'acheteur.
    Réservé aux administrateurs.
    Transition : BLOCKED → REFUNDED.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    throttle_scope     = "sensitive"

    def post(self, request: Request, pk: int) -> Response:
        try:
            paiement = Paiement.objects.get(pk=pk)
        except Paiement.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Paiement introuvable.")

        if not paiement.can_transition_to("REFUNDED"):
            raise ValidationError(
                f"Impossible de rembourser un paiement en statut « {paiement.status} »."
            )

        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            paiement_locked = Paiement.objects.select_for_update().get(pk=paiement.pk)
            if not paiement_locked.can_transition_to("REFUNDED"):
                raise ValidationError(
                    f"Statut modifié concurremment : {paiement_locked.status}."
                )

            try:
                GeniusPayService().refund_buyer(paiement_locked.escrow_id)
            except GeniusPayError as exc:
                logger.error("GeniusPay refund échoué pour escrow_id=%s : %s", paiement_locked.escrow_id, exc)
                raise ValidationError(f"Erreur GeniusPay : {exc}")

            paiement_locked.status = "REFUNDED"
            paiement_locked.save(update_fields=["status", "updated_at"])

        logger.info(
            "[Audit] Paiement #%s remboursé par l'administrateur #%s",
            paiement_locked.pk, request.user.pk,
        )
        return Response(PaiementStatusSerializer(paiement_locked).data)


# ─── Clés API ─────────────────────────────────────────────────────────────────

@extend_schema(tags=["Clés API"])
class APIKeyListCreateView(APIView):
    """
    GET  — Liste les clés API de l'utilisateur connecté.
    POST — Crée une nouvelle clé API (le secret est affiché une seule fois).
    Réservé aux développeurs et administrateurs.
    """
    permission_classes = [IsAuthenticated, IsDeveloper]

    def get(self, request: Request) -> Response:
        keys = APIKey.objects.filter(user=request.user).order_by("-created_at")
        return Response(APIKeySerializer(keys, many=True).data)

    def post(self, request: Request) -> Response:
        serializer = APIKeyCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        api_key = serializer.save(user=request.user)
        return Response(
            APIKeyCreateSerializer(api_key).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Clés API"])
class APIKeyRevokeView(APIView):
    """DELETE — Révoque (désactive) une clé API."""
    permission_classes = [IsAuthenticated, IsDeveloper]

    def delete(self, request: Request, pk: int) -> Response:
        try:
            api_key = APIKey.objects.get(pk=pk, user=request.user)
        except APIKey.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Clé API introuvable.")

        api_key.is_active = False
        api_key.save(update_fields=["is_active"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Webhook GeniusPay ────────────────────────────────────────────────────────

@extend_schema(tags=["Webhooks"])
class GeniusPayWebhookView(APIView):
    """
    POST — Endpoint de réception des notifications webhooks de GeniusPay.
    Traite les événements de paiement et de virement :
    - payment.success   → passe le paiement à BLOCKED (fonds sécurisés)
    - cashout.completed → passe le paiement à RELEASED (fonds virés)
    - payment.refunded  → passe le paiement à REFUNDED (remboursement)
    """
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        # En-têtes officiels GeniusPay :
        # - X-Webhook-Signature
        # - X-Webhook-Timestamp
        # - X-Webhook-Event
        signature = (
            request.headers.get("X-Webhook-Signature")
            or request.META.get("HTTP_X_WEBHOOK_SIGNATURE")
            or request.headers.get("X-GeniusPay-Signature")
            or request.headers.get("X-Geniuspay-Signature")
            or request.headers.get("X-Signature")
            or request.META.get("HTTP_X_GENIUSPAY_SIGNATURE")
            or request.META.get("HTTP_X_SIGNATURE")
        )

        timestamp = (
            request.headers.get("X-Webhook-Timestamp")
            or request.META.get("HTTP_X_WEBHOOK_TIMESTAMP")
        )

        event_header = (
            request.headers.get("X-Webhook-Event")
            or request.META.get("HTTP_X_WEBHOOK_EVENT")
        )

        # Log structuré (PAS de print en production — uniquement logger)
        logger.info(
            "[Webhook] GeniusPay — event=%s ts=%s sig_present=%s ip=%s",
            event_header,
            timestamp,
            bool(signature),
            request.META.get("REMOTE_ADDR", "unknown"),
        )

        # Vérification de la signature HMAC SHA-256 officielle GeniusPay
        if not GeniusPayService.verify_webhook_signature(request.body, signature, timestamp=timestamp):
            logger.warning(
                "[Security] Webhook GeniusPay avec signature invalide rejetée. "
                "sig=%s ts=%s ip=%s",
                signature[:20] + "..." if signature and len(signature) > 20 else signature,
                timestamp,
                request.META.get("REMOTE_ADDR", "unknown"),
            )
            return Response(
                {"error": "Signature de webhook invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = request.data
        if not isinstance(payload, dict):
            return Response(
                {"error": "Corps de la requête invalide."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Si l'événement est passé dans l'en-tête X-Webhook-Event
        if event_header and not payload.get("event") and not payload.get("type"):
            payload["event"] = event_header

        success, message = GeniusPayService.handle_webhook_event(payload)
        return Response(
            {"status": "received", "detail": message},
            status=status.HTTP_200_OK,
        )


# ─── Litiges (Disputes) ───────────────────────────────────────────────────────

@extend_schema(tags=["Litiges"])
class PaiementDisputeView(APIView):
    """
    POST — Ouvre un litige sur un paiement sous séquestre.
    Réservé à l'acheteur du paiement lorsque le statut est BLOCKED.
    Suspend l'auto-release et bloque la libération directe des fonds.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, pk: int) -> Response:
        serializer = DisputeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            try:
                paiement = Paiement.objects.select_for_update().get(pk=pk)
            except Paiement.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound("Paiement introuvable.")

            if paiement.buyer != request.user and not (request.user.role == "deaph" or request.user.is_staff):
                raise PermissionDenied("Seul l'acheteur peut ouvrir un litige sur cette transaction.")

            if paiement.status != "BLOCKED":
                raise ValidationError(
                    f"Impossible d'ouvrir un litige sur un paiement en statut « {paiement.status} » (seul un paiement BLOCKED est éligible)."
                )

            if hasattr(paiement, "dispute"):
                raise ValidationError("Un litige a déjà été ouvert pour cette transaction.")

            dispute = Dispute.objects.create(
                paiement=paiement,
                opened_by=request.user,
                reason=serializer.validated_data["reason"],
                details=serializer.validated_data["details"],
                status="OPEN",
            )

            paiement.status = "DISPUTED"
            paiement.auto_release_at = None
            paiement.save(update_fields=["status", "auto_release_at", "updated_at"])

        logger.info(
            "[Audit] Litige #%s ouvert sur Paiement #%s par l'utilisateur #%s",
            dispute.pk, paiement.pk, request.user.pk,
        )
        return Response(DisputeSerializer(dispute).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Litiges"])
class DisputeDetailResolveView(APIView):
    """
    GET  — Consulte les détails d'un litige.
    POST — Résout le litige (arbitrage réservé aux administrateurs).
           Actions : 'release' (libérer vers le vendeur) ou 'refund' (rembourser l'acheteur).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: int) -> Response:
        dispute = self._get_dispute(pk)
        # Accessible à l'acheteur, au vendeur ou aux administrateurs
        user = request.user
        if not (user.role == "deaph" or user.is_staff or dispute.paiement.buyer == user or dispute.paiement.seller == user):
            raise PermissionDenied("Accès refusé à ce litige.")
        return Response(DisputeSerializer(dispute).data)

    def post(self, request: Request, pk: int) -> Response:
        dispute = self._get_dispute(pk)
        user = request.user
        if not (user.role == "deaph" or user.is_staff):
            raise PermissionDenied("Seul un administrateur peut arbitrer un litige.")

        if dispute.status.startswith("RESOLVED"):
            raise ValidationError("Ce litige a déjà été résolu.")

        serializer = DisputeResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data["action"]
        notes = serializer.validated_data.get("resolution_notes", "")

        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            dispute_locked = Dispute.objects.select_for_update().select_related("paiement").get(pk=pk)
            if dispute_locked.status.startswith("RESOLVED"):
                raise ValidationError("Ce litige a déjà été résolu.")

            paiement = dispute_locked.paiement

            if action == "release":
                try:
                    if paiement.escrow_id:
                        GeniusPayService().release_funds(paiement.escrow_id)
                except GeniusPayError as exc:
                    logger.error("GeniusPay release échoué pour litige #%s : %s", dispute_locked.pk, exc)

                paiement.status = "RELEASED"
                dispute_locked.status = "RESOLVED_RELEASE"

            elif action == "refund":
                try:
                    if paiement.escrow_id:
                        GeniusPayService().refund_buyer(paiement.escrow_id)
                except GeniusPayError as exc:
                    logger.error("GeniusPay refund échoué pour litige #%s : %s", dispute_locked.pk, exc)

                paiement.status = "REFUNDED"
                dispute_locked.status = "RESOLVED_REFUND"

            dispute_locked.resolution_notes = notes
            dispute_locked.resolved_at = timezone.now()
            dispute_locked.save()
            paiement.save()

        logger.info(
            "[Audit] Litige #%s résolu par admin #%s avec action '%s'",
            dispute_locked.pk, request.user.pk, action,
        )
        return Response(DisputeSerializer(dispute_locked).data)

    @staticmethod
    def _get_dispute(pk: int) -> Dispute:
        try:
            return Dispute.objects.select_related("paiement", "opened_by").get(pk=pk)
        except Dispute.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Litige introuvable.")


# ─── Déblocage Automatique (Auto-Release) ──────────────────────────────────────

@extend_schema(tags=["Paiements"])
class PaiementAutoReleaseView(APIView):
    """
    POST — Déclenche le déblocage automatique des paiements dont le délai de séquestre (3 jours) est expiré.
    Accessible aux administrateurs ou aux tâches programmées (Cron / Celery).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request: Request) -> Response:
        released_ids = auto_release_expired_escrows()
        return Response({
            "status": "success",
            "released_count": len(released_ids),
            "released_payment_ids": released_ids,
        })


# ─── Module KYC (Know Your Customer) ──────────────────────────────────────────

@extend_schema(tags=["KYC (Conformité)"])
class KYCView(APIView):
    """
    GET  — Consulte le statut de vérification d'identité de l'utilisateur connecté.
    POST — Soumet ou met à jour sa pièce d'identité pour validation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        try:
            kyc = request.user.kyc
            return Response(KYCVerificationSerializer(kyc).data)
        except KYCVerification.DoesNotExist:
            return Response({"status": "NONE", "detail": "Aucun dossier KYC soumis."})

    def post(self, request: Request) -> Response:
        serializer = KYCVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        kyc, created = KYCVerification.objects.update_or_create(
            user=request.user,
            defaults={
                "id_type": serializer.validated_data["id_type"],
                "id_number": serializer.validated_data["id_number"],
                "full_name": serializer.validated_data["full_name"],
                "document_url": serializer.validated_data.get("document_url", ""),
                "status": "PENDING",
                "rejection_reason": "",
                "submitted_at": timezone.now(),
            },
        )

        return Response(
            KYCVerificationSerializer(kyc).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


@extend_schema(tags=["KYC (Conformité)"])
class KYCDocumentView(APIView):
    """Télécharge un justificatif local au propriétaire ou à un administrateur."""
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get(self, request: Request, pk: int) -> FileResponse:
        try:
            kyc = KYCVerification.objects.select_related("user").get(pk=pk)
        except KYCVerification.DoesNotExist:
            raise Http404

        self.check_object_permissions(request, kyc)

        parsed_url = urlsplit(kyc.document_url)
        if parsed_url.scheme or parsed_url.netloc or parsed_url.query or parsed_url.fragment:
            raise Http404

        document_path = unquote(parsed_url.path)
        media_prefix = "/media/kyc/"
        if not document_path.startswith(media_prefix) or "\\" in document_path or "\x00" in document_path:
            raise Http404

        media_root = Path(settings.MEDIA_ROOT).resolve()
        relative_path = document_path.removeprefix("/media/")
        try:
            file_path = (media_root / relative_path).resolve(strict=True)
            file_path.relative_to(media_root)
        except (OSError, RuntimeError, ValueError):
            raise Http404

        if not file_path.is_file():
            raise Http404

        response = FileResponse(
            file_path.open("rb"),
            as_attachment=True,
            filename=file_path.name,
            content_type="application/octet-stream",
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


@extend_schema(tags=["KYC (Conformité)"])
class KYCReviewView(APIView):
    """
    POST — Valide ou rejette un dossier KYC.
    Réservé aux administrateurs (rôle 'deaph' ou staff).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request: Request, pk: int) -> Response:
        try:
            kyc = KYCVerification.objects.get(pk=pk)
        except KYCVerification.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Dossier KYC introuvable.")

        serializer = KYCReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        kyc.status = new_status
        kyc.rejection_reason = serializer.validated_data.get("rejection_reason", "")
        kyc.reviewed_at = timezone.now()
        kyc.reviewed_by = request.user
        kyc.save()

        return Response(KYCVerificationSerializer(kyc).data)


# ─── Offres & Liens de Paiement (Paylinks) ────────────────────────────────────

@extend_schema(tags=["Offres (Paylinks)"])
class OfferListCreateView(APIView):
    """
    GET  — Liste les offres de vente créées par l'utilisateur connecté.
    POST — Crée une nouvelle offre et génère un lien de paiement unique (ex: OFF-82A1-9F2B).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        offers = Offer.objects.filter(seller=request.user).order_by("-created_at")
        serializer = OfferSerializer(offers, many=True, context={"request": request})
        return Response(serializer.data)

    def post(self, request: Request) -> Response:
        if request.user.role not in ("seller", "member", "deaph") and not request.user.is_staff:
            raise PermissionDenied("Seuls les vendeurs ou membres peuvent créer des offres de vente.")
        serializer = OfferSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        offer = serializer.save(seller=request.user)
        return Response(
            OfferSerializer(offer, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Offres (Paylinks)"])
class OfferPublicDetailView(APIView):
    """
    GET — Consultation publique d'un Paylink (sans mot de passe).
          Permet à l'acheteur d'examiner le produit, le prix et le statut KYC du vendeur.
    """
    permission_classes = [AllowAny]

    def get(self, request: Request, code: str) -> Response:
        try:
            offer = Offer.objects.select_related("seller").get(code=code.strip().upper(), is_active=True)
        except Offer.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Offre introuvable ou inactive.")

        return Response(OfferPublicSerializer(offer).data)


@extend_schema(tags=["Offres (Paylinks)"])
class OfferCheckoutView(APIView):
    """
    POST — L'acheteur finalise la commande sur un Paylink.
           Crée un Paiement sous séquestre lié à l'offre avec instantané immuable du prix
           et des conditions, puis initie le séquestre auprès de GeniusPay.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, code: str) -> Response:
        serializer = OfferCheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            try:
                offer = Offer.objects.select_for_update().select_related("seller").get(
                    code=code.strip().upper(), is_active=True
                )
            except Offer.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound("Offre introuvable ou inactive.")

            if offer.seller == request.user:
                raise ValidationError("Tu ne peux pas acheter ta propre offre de vente.")

            # Création de la transaction de séquestre avec snapshot immuable
            paiement = Paiement.objects.create(
                offer=offer,
                buyer=request.user,
                seller=offer.seller,
                amount=offer.amount,
                currency=offer.currency,
                item_title=offer.title,
                item_description=offer.description,
                initiator_role="seller",
                status="CREATED",
            )

        # Initiation auprès de GeniusPay
        try:
            escrow_id = GeniusPayService().initiate_escrow(paiement)
            paiement.escrow_id = escrow_id
            paiement.save(update_fields=["escrow_id"])
        except GeniusPayError as exc:
            logger.error("GeniusPay initiation échouée pour Paylink %s : %s", offer.code, exc)

        logger.info(
            "[Paylink] Achat initié : Offre %s par acheteur #%s -> Paiement #%s",
            offer.code, request.user.pk, paiement.pk,
        )
        # NOTE sécurité : le delivery_otp n'est JAMAIS loggué — il est uniquement
        # transmis à l'acheteur via la réponse API (filtrée selon le rôle).
        return Response(PaiementSerializer(paiement, context={"request": request}).data, status=status.HTTP_201_CREATED)


# ─── Confirmation de Livraison (OTP Livreur) ──────────────────────────────────

@extend_schema(tags=["Paiements"])
class PaiementConfirmDeliveryView(APIView):
    """
    POST — Confirme la livraison et libère les fonds :
           - Par l'acheteur directement.
           - OU par le vendeur/livreur en transmettant le code OTP secret fourni par l'acheteur.
    """
    permission_classes = [IsAuthenticated]
    throttle_scope     = "sensitive"

    def post(self, request: Request, pk: int) -> Response:
        try:
            paiement = Paiement.objects.get(pk=pk)
        except Paiement.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Paiement introuvable.")

        if not paiement.can_transition_to("RELEASED"):
            raise ValidationError(
                f"Impossible de libérer un paiement en statut « {paiement.status} »."
            )

        serializer = ConfirmDeliverySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        otp_provided = serializer.validated_data.get("otp", "").strip()

        # Vérification des autorisations :
        # Cas 1 : L'acheteur valide lui-même (l'OTP n'est pas obligatoire s'il est l'acheteur authentifié)
        # Cas 2 : Le vendeur ou livreur valide avec le code OTP à 6 chiffres
        is_buyer = (paiement.buyer == request.user)
        is_seller = (paiement.seller == request.user)
        is_admin = (request.user.role == "deaph" or request.user.is_staff)

        if not (is_buyer or is_seller or is_admin):
            raise PermissionDenied("Vous n'êtes pas partie prenante de cette transaction.")

        if is_seller and not is_admin:
            # Le vendeur doit obligatoirement présenter le bon OTP donné par l'acheteur (comparaison temps-constant)
            if not otp_provided or not secrets.compare_digest(otp_provided, paiement.delivery_otp):
                raise ValidationError("Code OTP de livraison invalide ou manquant.")

        # Verrouillage atomique et libération des fonds
        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            paiement_locked = Paiement.objects.select_for_update().get(pk=paiement.pk)
            if not paiement_locked.can_transition_to("RELEASED"):
                raise ValidationError(f"Statut modifié concurremment : {paiement_locked.status}.")

            try:
                if paiement_locked.escrow_id:
                    GeniusPayService().release_funds(paiement_locked.escrow_id)
            except GeniusPayError as exc:
                logger.error("GeniusPay release échoué lors de la livraison paiement #%s : %s", paiement_locked.pk, exc)
                raise ValidationError(f"Erreur GeniusPay : {exc}")

            paiement_locked.status = "RELEASED"
            paiement_locked.save(update_fields=["status", "updated_at"])

        logger.info(
            "[Audit] Livraison confirmée pour Paiement #%s par utilisateur #%s (Méthode: %s)",
            paiement_locked.pk, request.user.pk, "Acheteur direct" if is_buyer else "OTP Livreur",
        )
        return Response(PaiementStatusSerializer(paiement_locked).data)



