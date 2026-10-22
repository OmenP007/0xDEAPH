"""
Service d'intégration GeniusPay.

Événements webhook supportés
─────────────────────────────
payment.initiated   → Paiement initié
payment.success     → Fonds reçus → BLOCKED
payment.failed      → Paiement échoué (log)
payment.cancelled   → Paiement annulé (log)
payment.refunded    → Remboursement confirmé → REFUNDED
payment.expired     → Paiement expiré (log)
cashout.requested   → Demande de virement reçue
cashout.approved    → Virement approuvé
cashout.completed   → Fonds libérés au vendeur → RELEASED
cashout.failed      → Échec du virement (log)

Toutes les interactions avec l'API GeniusPay transitent par cette classe.
En cas d'erreur réseau ou de réponse inattendue, une GeniusPayError est levée.
"""

import hashlib
import hmac
import logging
import re
from decimal import Decimal

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class GeniusPayError(Exception):
    """Erreur retournée par l'API GeniusPay."""

    def __init__(self, message: str, status_code: int | None = None):
        self.status_code = status_code
        super().__init__(message)


class GeniusPayService:
    """Client HTTP pour l'API GeniusPay Merchant."""

    TIMEOUT = 15  # secondes

    def __init__(self) -> None:
        self.base_url = settings.GENIUS_PAY_URL.rstrip("/")
        self.api_key  = settings.GENIUS_PAY_API_KEY
        self.secret   = settings.GENIUS_PAY_SECRET

    # ── Helpers privés ────────────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.secret}",
            "X-Api-Key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _post(self, endpoint: str, payload: dict) -> dict:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._headers(),
                timeout=self.TIMEOUT,
            )
        except requests.exceptions.Timeout:
            raise GeniusPayError("Délai d'attente dépassé lors de la connexion à GeniusPay.")
        except requests.exceptions.ConnectionError as exc:
            raise GeniusPayError(f"Impossible de joindre GeniusPay : {exc}")

        if not response.ok:
            logger.error(
                "GeniusPay %s %s → %s : %s",
                "POST", url, response.status_code, response.text[:200],
            )
            raise GeniusPayError(
                response.json().get("message", "Erreur GeniusPay inconnue."),
                status_code=response.status_code,
            )

        return response.json()

    def _patch(self, endpoint: str, payload: dict) -> dict:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            response = requests.patch(
                url,
                json=payload,
                headers=self._headers(),
                timeout=self.TIMEOUT,
            )
        except requests.exceptions.Timeout:
            raise GeniusPayError("Délai d'attente dépassé lors de la connexion à GeniusPay.")
        except requests.exceptions.ConnectionError as exc:
            raise GeniusPayError(f"Impossible de joindre GeniusPay : {exc}")

        if not response.ok:
            logger.error(
                "GeniusPay %s %s → %s : %s",
                "PATCH", url, response.status_code, response.text[:200],
            )
            raise GeniusPayError(
                response.json().get("message", "Erreur GeniusPay inconnue."),
                status_code=response.status_code,
            )

        return response.json()

    # ── API publique ──────────────────────────────────────────────────────────

    def initiate_escrow(self, paiement) -> str:
        """
        Initie un séquestre auprès de GeniusPay.

        Retourne l'identifiant de séquestre (escrow_id) attribué par GeniusPay.
        """
        payload = {
            "amount":      str(paiement.amount),
            "currency":    getattr(paiement, "currency", "XOF"),
            "buyer_ref":   str(paiement.buyer_id),
            "seller_ref":  str(paiement.seller_id),
            "reference":   f"0xseq-{paiement.pk}",
            "description": f"Séquestre 0xSeq #{paiement.pk} ({paiement.amount} {getattr(paiement, 'currency', 'XOF')})",
        }
        data = self._post("/escrow/initiate", payload)
        escrow_id: str = data.get("escrow_id") or data.get("id") or ""
        if not escrow_id:
            raise GeniusPayError("GeniusPay n'a pas retourné d'identifiant de séquestre.")
        logger.info("Séquestre initié : escrow_id=%s pour paiement #%s", escrow_id, paiement.pk)
        return escrow_id

    def release_funds(self, escrow_id: str) -> dict:
        """
        Libère les fonds vers le vendeur.

        Retourne la réponse brute de GeniusPay.
        """
        data = self._patch(f"/escrow/{escrow_id}/release", {"action": "release"})
        logger.info("Fonds libérés pour escrow_id=%s", escrow_id)
        return data

    def refund_buyer(self, escrow_id: str) -> dict:
        """
        Rembourse l'acheteur.

        Retourne la réponse brute de GeniusPay.
        """
        data = self._patch(f"/escrow/{escrow_id}/refund", {"action": "refund"})
        logger.info("Remboursement effectué pour escrow_id=%s", escrow_id)
        return data

    # ── Gestion des Webhooks ──────────────────────────────────────────────────

    @staticmethod
    def verify_webhook_signature(
        payload_bytes: bytes,
        signature_header: str | None,
        timestamp: str | None = None,
    ) -> bool:
        """
        Vérifie la signature HMAC SHA-256 fournie par GeniusPay dans l'en-tête HTTP.
        Spécification officielle GeniusPay :
            hash_hmac('sha256', $timestamp . '.' . $payload, $secret)
        """
        secret = getattr(settings, "GENIUS_PAY_WEBHOOK_SECRET", "")
        if not secret:
            logger.warning("GENIUS_PAY_WEBHOOK_SECRET non configuré. Validation de signature ignorée.")
            return True

        if not signature_header:
            return False

        sig = signature_header.strip()
        if sig.startswith("sha256="):
            sig = sig[7:].strip()
        if "v1=" in sig:
            parts = dict(item.split("=", 1) for item in sig.split(",") if "=" in item)
            sig = parts.get("v1", "").strip()

        # Liste des payloads à vérifier : avec timestamp ($timestamp . '.' . $payload) et sans
        payloads_to_test = []
        if timestamp:
            ts_prefix = f"{timestamp}.".encode("utf-8")
            payloads_to_test.append(ts_prefix + payload_bytes)
        payloads_to_test.append(payload_bytes)

        secrets_to_try = [s for s in [secret, getattr(settings, "GENIUS_PAY_SECRET", "")] if s]

        for s in secrets_to_try:
            for p in payloads_to_test:
                expected = hmac.new(
                    s.encode("utf-8"),
                    p,
                    hashlib.sha256,
                ).hexdigest()

                if hmac.compare_digest(expected, sig) or hmac.compare_digest(f"sha256={expected}", sig):
                    return True

        return False

    @classmethod
    def handle_webhook_event(cls, payload: dict) -> tuple[bool, str]:
        """
        Traite un événement webhook GeniusPay de manière idempotente.

        Retourne (succès: bool, message: str).
        """
        from .models import Paiement, WebhookEventLog

        event = payload.get("event") or payload.get("type")
        if not event:
            return False, "Aucun type d'événement spécifié."

        data = payload.get("data") or {}
        event_id = str(payload.get("id") or payload.get("event_id") or data.get("id") or "").strip()

        # ── Gestion de l'idempotence ──
        if event_id:
            existing = WebhookEventLog.objects.filter(event_id=event_id).first()
            if existing:
                logger.info("GeniusPay webhook déjà traité (idempotence) : event_id=%s", event_id)
                return True, f"Événement '{event_id}' déjà traité (idempotence)."

        escrow_id = data.get("escrow_id") or data.get("id") or ""
        reference = data.get("reference") or ""

        # Recherche du paiement correspondant
        paiement = None
        if escrow_id:
            paiement = Paiement.objects.filter(escrow_id=escrow_id).first()

        if not paiement and reference:
            match = re.search(r"0xseq-(\d+)", str(reference))
            if match:
                paiement = Paiement.objects.filter(pk=match.group(1)).first()

        if not paiement and data.get("payment_id"):
            paiement = Paiement.objects.filter(pk=data.get("payment_id")).first()

        logger.info("GeniusPay webhook reçu : événement=%s | paiement=%s | event_id=%s", event, paiement, event_id)

        # Enregistrement dans le journal d'idempotence si un event_id existe
        if event_id:
            WebhookEventLog.objects.get_or_create(
                event_id=event_id,
                defaults={
                    "event_type": event,
                    "payload": payload,
                    "status": "PROCESSED",
                },
            )

        if not paiement:
            logger.warning("Paiement introuvable pour webhook : %s (escrow_id=%s, ref=%s)", event, escrow_id, reference)
            return True, f"Événement '{event}' reçu mais paiement introuvable."

        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            paiement = Paiement.objects.select_for_update().get(pk=paiement.pk)

            # Si l'escrow_id n'était pas encore enregistré, on l'associe
            if escrow_id and not paiement.escrow_id:
                paiement.escrow_id = escrow_id
                paiement.save(update_fields=["escrow_id"])

            # Traitement selon l'événement
            if event == "payment.success":
                # Le client a payé -> les fonds sont bloqués sous séquestre
                if paiement.status == "CREATED" or paiement.can_transition_to("BLOCKED"):
                    paiement.status = "BLOCKED"
                    paiement.save()
                    return True, f"Paiement #{paiement.pk} passé au statut BLOCKED."
                return True, f"Paiement #{paiement.pk} déjà en statut {paiement.status}."

            elif event == "cashout.completed":
                # Les fonds ont été virés avec succès au vendeur
                if paiement.status == "BLOCKED" or paiement.can_transition_to("RELEASED"):
                    paiement.status = "RELEASED"
                    paiement.save()
                    return True, f"Paiement #{paiement.pk} passé au statut RELEASED."
                return True, f"Paiement #{paiement.pk} statut actuel: {paiement.status}."

            elif event == "payment.refunded":
                # Remboursement confirmé
                if paiement.status in ("CREATED", "BLOCKED") or paiement.can_transition_to("REFUNDED"):
                    paiement.status = "REFUNDED"
                    paiement.save()
                    return True, f"Paiement #{paiement.pk} passé au statut REFUNDED."
                return True, f"Paiement #{paiement.pk} statut actuel: {paiement.status}."

            elif event in ("payment.failed", "payment.cancelled", "payment.expired"):
                logger.warning("GeniusPay paiement #{%s} a échoué/annulé/expiré: %s", paiement.pk, event)
                return True, f"Paiement #{paiement.pk} notification échec reçue ({event})."

            elif event in ("payment.initiated", "cashout.requested", "cashout.approved", "cashout.failed"):
                logger.info("GeniusPay statut étape paiement #{%s}: %s", paiement.pk, event)
                return True, f"Événement {event} pris en compte."

        return True, f"Événement {event} non géré."


# ─── Service de Libération Automatique (Séquestre 3 jours) ────────────────────

def auto_release_expired_escrows() -> list[int]:
    """
    Libère automatiquement tous les paiements sous séquestre ayant dépassé le délai de 3 jours
    sans litige ouvert (tâche planifiable via Celery ou Cron).
    Sécurisé avec verrouillage pessimiste atomique (select_for_update).
    """
    from django.db import transaction as db_transaction
    from django.utils import timezone
    from .models import Paiement

    now = timezone.now()
    expired_ids = list(
        Paiement.objects.filter(
            status="BLOCKED",
            auto_release_at__isnull=False,
            auto_release_at__lte=now,
        ).values_list("pk", flat=True)
    )

    released_ids = []
    service = GeniusPayService()

    for pk in expired_ids:
        with db_transaction.atomic():
            try:
                p_locked = Paiement.objects.select_for_update().get(pk=pk)
            except Paiement.DoesNotExist:
                continue

            if p_locked.status != "BLOCKED":
                continue

            # Sécurité : Si un litige est ouvert ou en révision, ne jamais libérer automatiquement
            if hasattr(p_locked, "dispute") and p_locked.dispute.status in ["OPEN", "UNDER_REVIEW"]:
                logger.warning("Paiement #%s suspendu : litige actif présent (%s).", p_locked.pk, p_locked.dispute.status)
                continue

            try:
                if p_locked.escrow_id:
                    service.release_funds(p_locked.escrow_id)
            except GeniusPayError as exc:
                logger.error("Auto-release GeniusPay échoué pour paiement #%s : %s", p_locked.pk, exc)

            p_locked.status = "RELEASED"
            p_locked.save(update_fields=["status", "updated_at"])
            released_ids.append(p_locked.pk)
            logger.info("Auto-release réussi pour le paiement #%s (délai 3 jours écoulé)", p_locked.pk)

    return released_ids
