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

La libération des fonds vers le vendeur ne passe pas par un payout GeniusPay
(non documenté) : elle crédite le portefeuille interne du vendeur, qui peut
ensuite demander un retrait Mobile Money.

Toutes les interactions avec l'API GeniusPay transitent par cette classe.
En cas d'erreur réseau ou de réponse inattendue, une GeniusPayError est levée.
"""

import hashlib
import hmac
import logging
import re
from decimal import Decimal
from urllib.parse import quote

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class GeniusPayError(Exception):
    """Erreur retournée par l'API GeniusPay."""

    def __init__(self, message: str, status_code: int | None = None):
        self.status_code = status_code
        super().__init__(message)


class EscrowReleaseError(Exception):
    """Libération impossible : statut incompatible ou conflit concurrent."""


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
            "X-API-Key": self.api_key,
            "X-API-Secret": self.secret,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    @staticmethod
    def _handle_response(response, method: str, url: str) -> dict:
        if not response.ok:
            try:
                error_payload = response.json()
            except ValueError:
                error_payload = {}
            error = error_payload.get("error") or {}
            logger.error(
                "GeniusPay %s %s → %s : %s",
                method, url, response.status_code, response.text[:200],
            )
            raise GeniusPayError(
                error.get("message") or error_payload.get("message", "Erreur GeniusPay inconnue."),
                status_code=response.status_code,
            )
        return response.json()

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

        return self._handle_response(response, "POST", url)

    def _get(self, endpoint: str, params: dict | None = None) -> dict:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        try:
            response = requests.get(
                url,
                params={k: v for k, v in (params or {}).items() if v not in (None, "")},
                headers=self._headers(),
                timeout=self.TIMEOUT,
            )
        except requests.exceptions.Timeout:
            raise GeniusPayError("Délai d'attente dépassé lors de la connexion à GeniusPay.")
        except requests.exceptions.ConnectionError as exc:
            raise GeniusPayError(f"Impossible de joindre GeniusPay : {exc}")

        return self._handle_response(response, "GET", url)

    # ── API publique ──────────────────────────────────────────────────────────

    def initiate_payment(self, paiement) -> dict[str, str]:
        """
        Crée un paiement GeniusPay et retourne sa référence et son URL de checkout.
        """
        amount = paiement.amount
        customer_name = paiement.buyer.get_full_name() or paiement.buyer.username
        customer = {"name": customer_name}
        if paiement.buyer.email:
            customer["email"] = paiement.buyer.email

        payload = {
            "amount": int(amount) if amount == amount.to_integral_value() else float(amount),
            "currency": paiement.currency,
            "description": f"{paiement.item_title or 'Paiement 0xSeq'} - commande #{paiement.pk}",
            "external_reference": f"0xseq-{paiement.pk}",
            "customer": customer,
            "metadata": {
                "payment_id": str(paiement.pk),
                "buyer_id": str(paiement.buyer_id),
                "seller_id": str(paiement.seller_id),
            },
        }
        response = self._post("/payments", payload)
        data = response.get("data") or {}
        reference = data.get("reference")
        checkout_url = data.get("checkout_url") or data.get("payment_url")
        if not reference or not checkout_url:
            raise GeniusPayError("GeniusPay n'a pas retourné la référence et l'URL de checkout.")
        logger.info("Paiement GeniusPay créé : reference=%s pour paiement #%s", reference, paiement.pk)
        return {"reference": str(reference), "checkout_url": str(checkout_url)}

    # ── Lecture de l'état côté fournisseur ────────────────────────────────────
    def refund_buyer(self, payment_reference: str, amount=None, reason: str = "") -> dict:
        """
        Rembourse un paiement complété avec l'endpoint documenté par GeniusPay.
        """
        payload = {}
        if amount is not None:
            payload["amount"] = float(amount)
        if reason:
            payload["reason"] = reason
        data = self._post(f"/payments/{quote(payment_reference, safe='')}/refund", payload)
        logger.info("Remboursement GeniusPay demandé pour reference=%s", payment_reference)
        return data

    # ── Lecture de l'état côté fournisseur ────────────────────────────────────

    def get_payment(self, payment_reference: str) -> dict:
        """
        Récupère une transaction GeniusPay : GET /payments/{reference}.

        Retourne le bloc ``data`` de la réponse fournisseur.
        """
        reference = quote(str(payment_reference), safe="")
        response = self._get(f"/payments/{reference}")
        return response.get("data") or {}

    def list_payments(
        self,
        status: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
        per_page: int | None = None,
    ) -> dict:
        """
        Liste les transactions GeniusPay : GET /payments.

        Retourne la réponse complète (``data`` + ``meta``).
        """
        params = {
            "status": status,
            "from": date_from,
            "to": date_to,
            "per_page": per_page,
        }
        return self._get("/payments", params=params)

    def get_account(self) -> dict:
        """Informations du compte marchand : GET /account."""
        response = self._get("/account")
        return response.get("data") or {}

    def get_account_balance(self) -> dict:
        """Solde du compte marchand : GET /account/balance."""
        response = self._get("/account/balance")
        return response.get("data") or {}

    @staticmethod
    def map_provider_status(provider_status: str) -> str | None:
        """
        Traduit un statut GeniusPay documenté en statut interne ``Paiement``.

        - ``completed`` → ``BLOCKED`` (fonds encaissés, en attente de livraison) ;
        - ``refunded``  → ``REFUNDED`` ;
        - les autres statuts (``pending``, ``processing``, ``failed``,
          ``cancelled``) ne changent pas l'état interne.
        """
        return {
            "completed": "BLOCKED",
            "refunded": "REFUNDED",
        }.get(str(provider_status or "").lower())

    def sync_payment_status(self, paiement) -> dict:
        """
        Réconcilie l'état local d'un paiement avec ``GET /payments/{reference}``.

        Utile lorsqu'un webhook a été perdu ou que la livraison a échoué.
        Ne libère jamais de fonds : ``completed`` ne va pas au-delà de
        ``BLOCKED``, car aucun endpoint de payout n'est documenté.
        """
        from django.db import transaction as db_transaction

        from .models import Paiement

        reference = (paiement.provider_reference or paiement.escrow_id or "").strip()
        if not reference:
            raise GeniusPayError("Aucune référence GeniusPay enregistrée pour ce paiement.")

        provider_payment = self.get_payment(reference)
        provider_status = str(provider_payment.get("status") or "").lower()
        target_status = self.map_provider_status(provider_status)

        result = {
            "reference": reference,
            "provider_status": provider_status,
            "previous_status": paiement.status,
            "status": paiement.status,
            "changed": False,
        }
        if not target_status or target_status == paiement.status:
            return result

        with db_transaction.atomic():
            locked = Paiement.objects.select_for_update().get(pk=paiement.pk)
            if locked.status == target_status or not locked.can_transition_to(target_status):
                result["status"] = locked.status
                return result

            locked.status = target_status
            locked.save(update_fields=["status", "updated_at"])
            result.update(
                previous_status=result["previous_status"],
                status=locked.status,
                changed=True,
            )

        logger.info(
            "Paiement #%s réconcilié avec GeniusPay : %s → %s (reference=%s)",
            paiement.pk, result["previous_status"], result["status"], reference,
        )
        return result

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
        transaction_data = data.get("transaction") or data
        metadata = transaction_data.get("metadata") or data.get("metadata") or {}
        reference = transaction_data.get("reference") or data.get("reference") or ""
        external_reference = (
            transaction_data.get("external_reference")
            or data.get("external_reference")
            or (reference if re.fullmatch(r"0xseq-\d+", str(reference)) else "")
        )
        payment_id = metadata.get("payment_id") or metadata.get("order_id") or data.get("payment_id")
        legacy_escrow_id = data.get("escrow_id") or ""
        event_id = str(payload.get("id") or payload.get("event_id") or "").strip()
        if not event_id and reference:
            event_id = f"{event}:{reference}:{payload.get('timestamp', '')}"

        # ── Gestion de l'idempotence ──
        if event_id:
            existing = WebhookEventLog.objects.filter(event_id=event_id).first()
            if existing:
                logger.info("GeniusPay webhook déjà traité (idempotence) : event_id=%s", event_id)
                return True, f"Événement '{event_id}' déjà traité (idempotence)."

        # Recherche du paiement correspondant
        paiement = None
        if payment_id:
            paiement = Paiement.objects.filter(pk=payment_id).first()

        if not paiement and reference:
            paiement = Paiement.objects.filter(provider_reference=reference).first()

        if not paiement and external_reference:
            match = re.search(r"0xseq-(\d+)", str(external_reference))
            if match:
                paiement = Paiement.objects.filter(pk=match.group(1)).first()

        if not paiement and legacy_escrow_id:
            paiement = Paiement.objects.filter(escrow_id=legacy_escrow_id).first()

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
            logger.warning("Paiement introuvable pour webhook : %s (reference=%s)", event, reference)
            return True, f"Événement '{event}' reçu mais paiement introuvable."

        from django.db import transaction as db_transaction
        with db_transaction.atomic():
            paiement = Paiement.objects.select_for_update().get(pk=paiement.pk)

            if reference and not paiement.provider_reference:
                paiement.provider_reference = str(reference)
                paiement.save(update_fields=["provider_reference"])

            if event == "payment.success":
                if paiement.status == "CREATED" or paiement.can_transition_to("BLOCKED"):
                    paiement.status = "BLOCKED"
                    paiement.save()
                    return True, f"Paiement #{paiement.pk} passé au statut BLOCKED."
                return True, f"Paiement #{paiement.pk} déjà en statut {paiement.status}."

            if event == "payment.refunded":
                if paiement.status in ("CREATED", "BLOCKED") or paiement.can_transition_to("REFUNDED"):
                    paiement.status = "REFUNDED"
                    paiement.save()
                    return True, f"Paiement #{paiement.pk} passé au statut REFUNDED."
                return True, f"Paiement #{paiement.pk} statut actuel: {paiement.status}."

            if event in ("payment.failed", "payment.cancelled", "payment.expired"):
                logger.warning("GeniusPay paiement #{%s} a échoué/annulé/expiré: %s", paiement.pk, event)
                return True, f"Paiement #{paiement.pk} notification échec reçue ({event})."

            if event == "payment.initiated":
                logger.info("GeniusPay statut étape paiement #{%s}: %s", paiement.pk, event)
                return True, f"Événement {event} pris en compte."

        return True, f"Événement {event} non géré."


# ─── Libération d'un séquestre vers le portefeuille interne ───────────────────

def release_funds(paiement, actor=None) -> dict:
    """
    Libère un séquestre vers le **portefeuille interne du vendeur**.

    Aucun virement externe n'est effectué : le montant net du vendeur devient
    une créance de portefeuille (``escrow_credits``), immédiatement disponible
    pour une demande de retrait Wave / Orange Money / MTN MoMo. Le retrait est
    ensuite traité selon le circuit portefeuille existant.

    - ``BLOCKED`` → ``RELEASED`` (livraison confirmée ou arbitrage) ;
    - ``DISPUTED`` → ``RELEASED`` (arbitrage administrateur) ;
    - idempotent : un paiement déjà ``RELEASED`` n'est pas recrédité.

    Lève ``EscrowReleaseError`` si la transition n'est pas autorisée.
    """
    from django.db import transaction as db_transaction

    from .models import Paiement

    with db_transaction.atomic():
        locked = Paiement.objects.select_for_update().get(pk=paiement.pk)

        if locked.status == "RELEASED":
            return {
                "payment_id": locked.pk,
                "status": locked.status,
                "credited": False,
                "seller_id": locked.seller_id,
                "amount": str(locked.net_amount),
            }

        if not locked.can_transition_to("RELEASED"):
            raise EscrowReleaseError(
                f"Impossible de libérer un paiement en statut « {locked.status} »."
            )

        previous_status = locked.status
        locked.status = "RELEASED"
        locked.save(update_fields=["status", "updated_at"])

    logger.info(
        "[Escrow] Paiement #%s libéré vers le portefeuille du vendeur #%s "
        "(%s → RELEASED, net=%s %s, acteur=%s)",
        locked.pk, locked.seller_id, previous_status, locked.net_amount,
        locked.currency, getattr(actor, "pk", None),
    )
    return {
        "payment_id": locked.pk,
        "status": locked.status,
        "credited": True,
        "seller_id": locked.seller_id,
        "amount": str(locked.net_amount),
    }


# ─── Service de Libération Automatique (Séquestre 3 jours) ────────────────────

def auto_release_expired_escrows() -> list[int]:
    """
    Libère automatiquement vers le portefeuille du vendeur les séquestres
    ``BLOCKED`` dont le délai ``auto_release_at`` est dépassé.

    Les litiges (``DISPUTED``) sont exclus : leur arbitrage reste manuel.
    Retourne la liste des identifiants effectivement libérés.
    """
    from .models import Paiement

    expired = Paiement.objects.filter(
        status="BLOCKED",
        auto_release_at__isnull=False,
        auto_release_at__lte=timezone.now(),
    )

    released_ids: list[int] = []
    for paiement in expired.iterator():
        try:
            release_funds(paiement)
            released_ids.append(paiement.pk)
        except EscrowReleaseError as exc:
            logger.warning("Auto-release ignoré pour le paiement #%s : %s", paiement.pk, exc)

    if released_ids:
        logger.info("%s séquestre(s) libéré(s) automatiquement.", len(released_ids))
    return released_ids
