from pathlib import Path
from tempfile import TemporaryDirectory
from decimal import Decimal
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import APIKey, KYCVerification, Offer, Paiement

User = get_user_model()


def make_user(username, role, password="test-password"):
    return User.objects.create_user(username=username, password=password, role=role)


# ─── Inscription ──────────────────────────────────────────────────────────────

class RegisterTests(APITestCase):
    def test_register_client(self):
        response = self.client.post(
            "/api/register/",
            {
                "username":  "nouveau_client",
                "email":     "client@example.com",
                "role":      "client",
                "password":  "motdepassefort1",
                "password2": "motdepassefort1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="nouveau_client").exists())

    def test_register_admin_role_rejected(self):
        response = self.client.post(
            "/api/register/",
            {
                "username":  "faux_admin",
                "role":      "deaph",
                "password":  "motdepassefort1",
                "password2": "motdepassefort1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_developer_role_rejected(self):
        response = self.client.post(
            "/api/register/",
            {
                "username":  "fake_dev",
                "role":      "developer",
                "password":  "motdepassefort1",
                "password2": "motdepassefort1",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_mismatched_passwords(self):
        response = self.client.post(
            "/api/register/",
            {
                "username":  "quelquun",
                "role":      "client",
                "password":  "motdepassefort1",
                "password2": "autrechose",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ─── Santé ────────────────────────────────────────────────────────────────────

class HealthTests(APITestCase):
    def test_health_endpoint(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")


# ─── Paiements — création ─────────────────────────────────────────────────────

class PaiementApiTests(APITestCase):
    def setUp(self):
        self.buyer  = make_user("buyer",  "client")
        self.seller = make_user("seller", "seller")
        self.provider_patcher = patch(
            "escrow.views.GeniusPayService.initiate_payment",
            return_value={
                "reference": "MTX-TEST123",
                "checkout_url": "https://geniuspay.ci/checkout/MTX-TEST123",
            },
        )
        self.provider_patcher.start()
        self.addCleanup(self.provider_patcher.stop)

    def test_create_uses_logged_in_buyer_and_default_status(self):
        self.client.force_authenticate(user=self.buyer)

        response = self.client.post(
            "/api/payments/",
            {
                "buyer":     self.seller.pk,   # ignoré — écrasé par perform_create
                "seller":    self.seller.pk,
                "amount":    "25.00",
                "status":    "RELEASED",       # ignoré — read_only
                "escrow_id": "client-supplied",# ignoré — read_only
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        payment = Paiement.objects.get()
        self.assertEqual(payment.buyer, self.buyer)
        self.assertEqual(payment.status, "CREATED")
        self.assertEqual(payment.escrow_id, "")
        self.assertEqual(payment.provider_reference, "MTX-TEST123")
        self.assertEqual(payment.checkout_url, "https://geniuspay.ci/checkout/MTX-TEST123")
        self.assertEqual(response.data["checkout_url"], payment.checkout_url)

    def test_list_only_shows_payments_involving_logged_in_user(self):
        other_buyer  = make_user("other-buyer",  "client")
        other_seller = make_user("other-seller", "seller")
        visible = Paiement.objects.create(buyer=self.buyer, seller=self.seller, amount="25.00")
        Paiement.objects.create(buyer=other_buyer, seller=other_seller, amount="40.00")

        self.client.force_authenticate(user=self.buyer)
        response = self.client.get("/api/payments/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [r["id"] for r in response.data["results"]]
        self.assertIn(visible.pk, ids)
        self.assertEqual(len(ids), 1)

    def test_seller_cannot_create_payment(self):
        another_seller = make_user("another-seller", "seller")
        self.client.force_authenticate(user=self.seller)

        response = self.client.post(
            "/api/payments/",
            {"seller": another_seller.pk, "amount": "25.00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Paiement.objects.count(), 0)

    def test_unauthenticated_cannot_access_payments(self):
        response = self.client.get("/api/payments/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ─── Paiements — transitions de statut ───────────────────────────────────────

class PaiementTransitionTests(APITestCase):
    def setUp(self):
        self.buyer  = make_user("buyer",  "client")
        self.seller = make_user("seller", "seller")
        self.admin  = make_user("admin",  "deaph")
        self.admin.is_staff = True
        self.admin.save()

        self.payment = Paiement.objects.create(
            buyer=self.buyer, seller=self.seller, amount="100.00",
            status="BLOCKED", provider_reference="MTX-TRANSITION123", escrow_id="test-escrow-123",
        )

    def test_allowed_transitions(self):
        from .models import Paiement as P
        p = P(status="CREATED")
        self.assertTrue(p.can_transition_to("BLOCKED"))
        self.assertFalse(p.can_transition_to("RELEASED"))

        p.status = "BLOCKED"
        self.assertTrue(p.can_transition_to("RELEASED"))
        self.assertTrue(p.can_transition_to("REFUNDED"))

        p.status = "RELEASED"
        self.assertFalse(p.can_transition_to("REFUNDED"))

    def test_buyer_cannot_release_from_created(self):
        self.payment.status = "CREATED"
        self.payment.save()
        self.client.force_authenticate(user=self.buyer)

        response = self.client.post(f"/api/payments/{self.payment.pk}/release/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seller_cannot_release_funds(self):
        self.client.force_authenticate(user=self.seller)
        response = self.client.post(f"/api/payments/{self.payment.pk}/release/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_buyer_release_stays_blocked_without_provider_payout(self):
        self.client.force_authenticate(user=self.buyer)

        response = self.client.post(f"/api/payments/{self.payment.pk}/release/")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "BLOCKED")

    def test_non_admin_cannot_refund(self):
        self.client.force_authenticate(user=self.buyer)
        response = self.client.post(f"/api/payments/{self.payment.pk}/refund/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_refund_uses_documented_provider_reference(self):
        self.client.force_authenticate(user=self.admin)

        with patch("escrow.views.GeniusPayService.refund_buyer", return_value={"status": "refunded"}) as refund:
            response = self.client.post(
                f"/api/payments/{self.payment.pk}/refund/",
                {"amount": "25.00", "reason": "Refund demandé"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refund.assert_called_once_with("MTX-TRANSITION123", amount=Decimal("25.00"), reason="Refund demandé")
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "REFUNDED")


# ─── Clés API ─────────────────────────────────────────────────────────────────

class APIKeyTests(APITestCase):
    def setUp(self):
        self.user = make_user("dev", "developer")

    def test_create_api_key(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/keys/",
            {"name": "Mon intégration", "scopes": ["payments:read"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("secret", response.data)
        self.assertTrue(response.data["secret"].startswith("0xs_live_"))
        self.assertEqual(APIKey.objects.count(), 1)

    def test_list_api_keys_does_not_expose_secret(self):
        self.client.force_authenticate(user=self.user)
        self.client.post(
            "/api/keys/",
            {"name": "Test", "scopes": ["payments:read"]},
            format="json",
        )
        response = self.client.get("/api/keys/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in response.data:
            self.assertNotIn("secret", key)
            self.assertNotIn("key_hash", key)

    def test_revoke_api_key(self):
        self.client.force_authenticate(user=self.user)
        create_resp = self.client.post(
            "/api/keys/",
            {"name": "À révoquer", "scopes": []},
            format="json",
        )
        key_id = create_resp.data["id"]

        response = self.client.delete(f"/api/keys/{key_id}/revoke/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(APIKey.objects.get(pk=key_id).is_active)

    def test_regular_client_cannot_manage_api_keys(self):
        client_user = make_user("regular_user", "client")
        self.client.force_authenticate(user=client_user)
        response = self.client.post(
            "/api/keys/",
            {"name": "Tentative client", "scopes": ["payments:read"]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ─── Auth Espace Développeur ──────────────────────────────────────────────────

class DeveloperAuthTests(APITestCase):
    def setUp(self):
        self.dev = make_user("dev_user", "developer", password="secret-dev-password")
        self.client_user = make_user("client_user", "client", password="secret-client-password")

    def test_developer_registration(self):
        response = self.client.post(
            "/api/developer/register/",
            {
                "username":  "nouveau_dev",
                "email":     "dev@example.com",
                "password":  "dev-password-123",
                "password2": "dev-password-123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="nouveau_dev")
        self.assertEqual(user.role, "developer")

    def test_developer_login_success(self):
        response = self.client.post(
            "/api/developer/token/",
            {
                "username": "dev_user",
                "password": "secret-dev-password",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["role"], "developer")

    def test_non_developer_login_rejected(self):
        response = self.client.post(
            "/api/developer/token/",
            {
                "username": "client_user",
                "password": "secret-client-password",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        self.assertIn("développeur", str(response.data["detail"]).lower())


# ─── Webhook GeniusPay ────────────────────────────────────────────────────────

class GeniusPayWebhookTests(APITestCase):
    def setUp(self):
        self.buyer = make_user("wh_buyer", "client")
        self.seller = make_user("wh_seller", "seller")
        self.payment = Paiement.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            amount="50.00",
            status="CREATED",
            provider_reference="MTX-TEST123",
            escrow_id="gp_escrow_999",
        )

    def _post_webhook(self, payload: dict):
        import hashlib
        import hmac
        import json
        from django.conf import settings

        raw = json.dumps(payload).encode("utf-8")
        secret = getattr(settings, "GENIUS_PAY_WEBHOOK_SECRET", "")
        extra = {}
        if secret:
            sig = hmac.new(secret.encode("utf-8"), raw, hashlib.sha256).hexdigest()
            extra["HTTP_X_GENIUSPAY_SIGNATURE"] = sig
        return self.client.post(
            "/api/webhooks/geniuspay/",
            data=raw,
            content_type="application/json",
            **extra,
        )

    def test_webhook_payment_success_blocks_funds(self):
        payload = {
            "event": "payment.success",
            "data": {
                "transaction": {
                    "id": 456,
                    "reference": "MTX-TEST123",
                    "external_reference": f"0xseq-{self.payment.pk}",
                    "amount": 50.00,
                    "status": "completed",
                    "metadata": {"payment_id": str(self.payment.pk)},
                },
            },
        }
        response = self._post_webhook(payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "BLOCKED")

    def test_undocumented_cashout_event_does_not_release_funds(self):
        self.payment.status = "BLOCKED"
        self.payment.save()

        payload = {
            "event": "cashout.completed",
            "data": {
                "transaction": {
                    "reference": "MTX-TEST123",
                    "external_reference": f"0xseq-{self.payment.pk}",
                    "metadata": {"payment_id": str(self.payment.pk)},
                },
            },
        }
        response = self._post_webhook(payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "BLOCKED")

    def test_webhook_payment_refunded_refunds_funds(self):
        self.payment.status = "BLOCKED"
        self.payment.save()

        payload = {
            "event": "payment.refunded",
            "data": {
                "transaction": {
                    "reference": "MTX-TEST123",
                    "external_reference": f"0xseq-{self.payment.pk}",
                    "metadata": {"payment_id": str(self.payment.pk)},
                },
            },
        }
        response = self._post_webhook(payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "REFUNDED")

    def test_webhook_signature_verification(self):
        import hashlib
        import hmac
        import json
        from django.test import override_settings

        secret = "test_webhook_secret_key"
        payload = {
            "event": "payment.success",
            "data": {"escrow_id": "gp_escrow_999"},
        }
        raw_body = json.dumps(payload).encode("utf-8")
        valid_signature = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

        with override_settings(GENIUS_PAY_WEBHOOK_SECRET=secret):
            # Signature invalide
            resp_invalid = self.client.post(
                "/api/webhooks/geniuspay/",
                data=raw_body,
                content_type="application/json",
                HTTP_X_GENIUSPAY_SIGNATURE="mauvaise_signature",
            )
            self.assertEqual(resp_invalid.status_code, status.HTTP_400_BAD_REQUEST)

            # Signature valide (format simple)
            resp_valid = self.client.post(
                "/api/webhooks/geniuspay/",
                data=raw_body,
                content_type="application/json",
                HTTP_X_WEBHOOK_SIGNATURE=valid_signature,
            )
            self.assertEqual(resp_valid.status_code, status.HTTP_200_OK)

            # Signature valide (format GeniusPay officiel avec timestamp : hash_hmac('sha256', $timestamp . '.' . $payload, $secret))
            timestamp = "1729544400"
            data_with_ts = f"{timestamp}.".encode("utf-8") + raw_body
            sig_with_ts = hmac.new(secret.encode("utf-8"), data_with_ts, hashlib.sha256).hexdigest()
            resp_ts = self.client.post(
                "/api/webhooks/geniuspay/",
                data=raw_body,
                content_type="application/json",
                HTTP_X_WEBHOOK_SIGNATURE=sig_with_ts,
                HTTP_X_WEBHOOK_TIMESTAMP=timestamp,
            )
            self.assertEqual(resp_ts.status_code, status.HTTP_200_OK)


# ─── Tests Commissions & Auto-Release (3 Jours) ───────────────────────────────

class CommissionAndAutoReleaseTests(APITestCase):
    def setUp(self):
        self.buyer = make_user("fee_buyer", "client")
        self.seller = make_user("fee_seller", "seller")

    def test_commission_calculation_one_percent(self):
        # 100 000 FCFA -> 1 000 FCFA de commission 0xSeq (1%), 99 000 FCFA net pour le vendeur
        p1 = Paiement.objects.create(buyer=self.buyer, seller=self.seller, amount="100000.00")
        self.assertEqual(p1.currency, "XOF")
        self.assertEqual(str(p1.fee_amount), "1000.00")
        self.assertEqual(str(p1.net_amount), "99000.00")

        # 25 000 FCFA -> 250 FCFA commission, 24 750 FCFA net
        p2 = Paiement.objects.create(buyer=self.buyer, seller=self.seller, amount="25000.00")
        self.assertEqual(str(p2.fee_amount), "250.00")
        self.assertEqual(str(p2.net_amount), "24750.00")

    def test_auto_release_timer_armed_on_blocked(self):
        p = Paiement.objects.create(buyer=self.buyer, seller=self.seller, amount="50.00", status="CREATED")
        self.assertIsNone(p.auto_release_at)

        p.status = "BLOCKED"
        p.save()
        self.assertIsNotNone(p.auto_release_at)

    def test_auto_release_execution(self):
        from datetime import timedelta
        from django.utils import timezone
        from escrow.services import auto_release_expired_escrows

        p = Paiement.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            amount="50.00",
            status="BLOCKED",
            escrow_id="gp_auto_1",
        )
        # On simule que la date d'auto-release est passée (ex: 4 jours en arrière)
        p.auto_release_at = timezone.now() - timedelta(days=1)
        p.save(update_fields=["auto_release_at"])

        released_ids = auto_release_expired_escrows()
        self.assertEqual(released_ids, [])

        p.refresh_from_db()
        self.assertEqual(p.status, "BLOCKED")


# ─── Tests Litiges (Disputes) ─────────────────────────────────────────────────

class DisputeTests(APITestCase):
    def setUp(self):
        self.buyer = make_user("disp_buyer", "client")
        self.seller = make_user("disp_seller", "seller")
        self.admin = make_user("disp_admin", "deaph")
        self.admin.is_staff = True
        self.admin.save()

        self.payment = Paiement.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            amount="120.00",
            status="BLOCKED",
            provider_reference="MTX-DISPUTE123",
            escrow_id="gp_disp_1",
        )

    def test_buyer_can_open_dispute(self):
        self.client.force_authenticate(user=self.buyer)
        response = self.client.post(
            f"/api/payments/{self.payment.pk}/dispute/",
            {
                "reason": "Colis non reçu",
                "details": "Le vendeur n'a fourni aucun numéro de suivi après 5 jours.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.payment.refresh_from_db()
        self.assertEqual(self.payment.status, "DISPUTED")
        self.assertIsNone(self.payment.auto_release_at)

    def test_seller_cannot_open_dispute(self):
        self.client.force_authenticate(user=self.seller)
        response = self.client.post(
            f"/api/payments/{self.payment.pk}/dispute/",
            {"reason": "Test", "details": "Test"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_resolve_dispute_refund(self):
        from escrow.models import Dispute
        dispute = Dispute.objects.create(
            paiement=self.payment,
            opened_by=self.buyer,
            reason="Non conforme",
            details="Articles cassés",
        )
        self.payment.status = "DISPUTED"
        self.payment.save()

        self.client.force_authenticate(user=self.admin)
        with patch("escrow.views.GeniusPayService.refund_buyer", return_value={"status": "refunded"}) as refund:
            response = self.client.post(
                f"/api/disputes/{dispute.pk}/resolve/",
                {"action": "refund", "resolution_notes": "Litige validé en faveur du client."},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refund.assert_called_once_with("MTX-DISPUTE123")
        self.payment.refresh_from_db()
        dispute.refresh_from_db()
        self.assertEqual(self.payment.status, "REFUNDED")
        self.assertEqual(dispute.status, "RESOLVED_REFUND")


class GeniusPayServiceTests(APITestCase):
    def setUp(self):
        self.buyer = make_user("provider_buyer", "client")
        self.seller = make_user("provider_seller", "seller")
        self.payment = Paiement.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            amount="15000.00",
            item_title="Commande de test",
        )

    @override_settings(
        GENIUS_PAY_URL="https://geniuspay.ci/api/v1/merchant",
        GENIUS_PAY_API_KEY="pk_sandbox_test",
        GENIUS_PAY_SECRET="sk_sandbox_test",
    )
    @patch("escrow.services.requests.post")
    def test_initiate_payment_uses_documented_route_and_headers(self, post):
        response = Mock()
        response.ok = True
        response.json.return_value = {
            "success": True,
            "data": {
                "reference": "SANDBOX-MTX-123",
                "checkout_url": "https://geniuspay.ci/checkout/SANDBOX-MTX-123",
            },
        }
        post.return_value = response

        from escrow.services import GeniusPayService
        result = GeniusPayService().initiate_payment(self.payment)

        self.assertEqual(result["reference"], "SANDBOX-MTX-123")
        self.assertEqual(result["checkout_url"], "https://geniuspay.ci/checkout/SANDBOX-MTX-123")
        args, kwargs = post.call_args
        self.assertEqual(args[0], "https://geniuspay.ci/api/v1/merchant/payments")
        self.assertEqual(kwargs["headers"]["X-API-Key"], "pk_sandbox_test")
        self.assertEqual(kwargs["headers"]["X-API-Secret"], "sk_sandbox_test")
        self.assertNotIn("Authorization", kwargs["headers"])
        self.assertEqual(kwargs["json"]["external_reference"], f"0xseq-{self.payment.pk}")
        self.assertEqual(kwargs["json"]["metadata"]["payment_id"], str(self.payment.pk))

    @override_settings(
        GENIUS_PAY_URL="https://geniuspay.ci/api/v1/merchant",
        GENIUS_PAY_API_KEY="pk_sandbox_test",
        GENIUS_PAY_SECRET="sk_sandbox_test",
    )
    @patch("escrow.services.requests.post")
    def test_refund_uses_documented_reference_route_and_body(self, post):
        response = Mock()
        response.ok = True
        response.json.return_value = {"success": True, "data": {"status": "refunded"}}
        post.return_value = response

        from escrow.services import GeniusPayService
        GeniusPayService().refund_buyer("SANDBOX-MTX-123", amount=Decimal("200.00"), reason="Test")

        args, kwargs = post.call_args
        self.assertEqual(args[0], "https://geniuspay.ci/api/v1/merchant/payments/SANDBOX-MTX-123/refund")
        self.assertEqual(kwargs["json"], {"amount": 200.0, "reason": "Test"})

    def test_release_funds_is_not_supported_without_provider_endpoint(self):
        from escrow.services import GeniusPayError, GeniusPayService

        with self.assertRaisesRegex(GeniusPayError, "(?i)aucun endpoint.*payout"):
            GeniusPayService().release_funds("SANDBOX-MTX-123")


# ─── Tests Authentification par Clé API (X-API-Key) ───────────────────────────

class APIKeyAuthHeaderTests(APITestCase):
    def setUp(self):
        self.dev = make_user("dev_merchant", "developer")
        self.seller = make_user("seller_partner", "seller")

        # Génération d'une clé API valide
        self.client.force_authenticate(user=self.dev)
        resp = self.client.post(
            "/api/keys/",
            {"name": "Clé E-Commerce", "scopes": ["payments:read"]},
            format="json",
        )
        self.raw_api_key = resp.data["secret"]
        self.client.logout()

    def test_access_with_valid_x_api_key(self):
        # Appel sans aucun token JWT, uniquement avec le header X-API-Key
        response = self.client.get(
            "/api/payments/",
            HTTP_X_API_KEY=self.raw_api_key,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_access_with_invalid_api_key_fails(self):
        response = self.client.get(
            "/api/payments/",
            HTTP_X_API_KEY="0xs_live_clef_totalement_invalide",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ─── Tests Module KYC ─────────────────────────────────────────────────────────

class KYCTests(APITestCase):
    def setUp(self):
        self.user = make_user("kyc_user", "client")
        self.admin = make_user("kyc_admin", "deaph")
        self.admin.is_staff = True
        self.admin.save()
        self.media_tempdir = TemporaryDirectory()
        self.addCleanup(self.media_tempdir.cleanup)
        self.media_root = Path(self.media_tempdir.name) / "media"

    def create_kyc_document(self, user=None, document_url="/media/kyc/identity.pdf"):
        kyc = KYCVerification.objects.create(
            user=user or self.user,
            id_type="cni",
            id_number="CI-2026-987654",
            full_name="Kouassi Jean",
            document_url=document_url,
        )
        file_path = self.media_root / "kyc" / "identity.pdf"
        file_path.parent.mkdir(parents=True, exist_ok=True)
        file_path.write_bytes(b"private KYC document")
        return kyc

    def test_owner_can_download_kyc_document(self):
        kyc = self.create_kyc_document()
        self.client.force_authenticate(user=self.user)

        with override_settings(MEDIA_ROOT=self.media_root):
            response = self.client.get(f"/api/kyc/{kyc.pk}/document/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Cache-Control"], "private, no-store")
        self.assertEqual(b"".join(response.streaming_content), b"private KYC document")

    def test_other_user_cannot_download_kyc_document(self):
        kyc = self.create_kyc_document()
        other_user = make_user("other_kyc_user", "client")
        self.client.force_authenticate(user=other_user)

        with override_settings(MEDIA_ROOT=self.media_root):
            response = self.client.get(f"/api/kyc/{kyc.pk}/document/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_download_kyc_document(self):
        kyc = self.create_kyc_document()
        self.client.force_authenticate(user=self.admin)

        with override_settings(MEDIA_ROOT=self.media_root):
            response = self.client.get(f"/api/kyc/{kyc.pk}/document/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_kyc_document_path_cannot_escape_media_root(self):
        outside_file = Path(self.media_tempdir.name) / "secret.txt"
        outside_file.write_text("not a KYC document", encoding="utf-8")
        kyc = self.create_kyc_document(document_url="/media/kyc/../../secret.txt")
        self.client.force_authenticate(user=self.user)

        with override_settings(MEDIA_ROOT=self.media_root):
            response = self.client.get(f"/api/kyc/{kyc.pk}/document/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_submit_and_consult_kyc(self):
        self.client.force_authenticate(user=self.user)

        # 1. Consultation initiale : vide
        get_res1 = self.client.get("/api/kyc/")
        self.assertEqual(get_res1.data["status"], "NONE")

        # 2. Soumission
        post_res = self.client.post(
            "/api/kyc/",
            {
                "id_type": "cni",
                "id_number": "CI-2026-987654",
                "full_name": "Kouassi Jean",
                "document_url": "https://storage.0xseq.com/kyc/cni_jean.jpg",
            },
            format="json",
        )
        self.assertEqual(post_res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(post_res.data["status"], "PENDING")

        # 3. Consultation après soumission
        get_res2 = self.client.get("/api/kyc/")
        self.assertEqual(get_res2.data["status"], "PENDING")

    def test_kyc_rejects_http_unencrypted_url(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            "/api/kyc/",
            {
                "id_type": "cni",
                "id_number": "CI-2026-111111",
                "full_name": "Kouassi Jean",
                "document_url": "http://insecure-site.com/cni.jpg",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("https://", str(response.data))

    def test_admin_can_approve_kyc(self):
        from escrow.models import KYCVerification
        kyc = KYCVerification.objects.create(
            user=self.user,
            id_type="passport",
            id_number="PA-123456",
            full_name="Kouassi Jean",
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f"/api/kyc/{kyc.pk}/review/",
            {"status": "APPROVED"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        kyc.refresh_from_db()
        self.assertEqual(kyc.status, "APPROVED")
        self.assertTrue(self.user.is_kyc_approved())


# ─── Tests Celery Tasks & Idempotence ─────────────────────────────────────────

class CeleryTasksAndIdempotencyTests(APITestCase):
    def setUp(self):
        self.buyer = make_user("celery_buyer", "client")
        self.seller = make_user("celery_seller", "seller")

    def test_auto_release_celery_task(self):
        from datetime import timedelta
        from django.utils import timezone
        from escrow.tasks import task_auto_release_expired_escrows

        # Paiement éligible (expiré)
        p1 = Paiement.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            amount=50000,
            status="BLOCKED",
            auto_release_at=timezone.now() - timedelta(days=1),
        )

        # Paiement non expiré (encore 2 jours)
        p2 = Paiement.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            amount=75000,
            status="BLOCKED",
            auto_release_at=timezone.now() + timedelta(days=2),
        )

        result = task_auto_release_expired_escrows.apply().get()
        self.assertEqual(result["status"], "SUCCESS")
        self.assertEqual(result["released_ids"], [])
        self.assertNotIn(p2.pk, result["released_ids"])

        p1.refresh_from_db()
        p2.refresh_from_db()
        self.assertEqual(p1.status, "BLOCKED")
        self.assertEqual(p2.status, "BLOCKED")

    def test_webhook_idempotency_and_purge_task(self):
        from datetime import timedelta
        from django.utils import timezone
        from escrow.models import WebhookEventLog
        from escrow.services import GeniusPayService
        from escrow.tasks import task_purge_old_idempotency_logs

        p = Paiement.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            amount=100000,
            status="CREATED",
        )

        payload = {
            "id": "evt_test_unique_123",
            "event": "payment.success",
            "data": {
                "reference": f"0xseq-{p.pk}",
                "escrow_id": "escrow_idem_1",
            },
        }

        # Premier passage -> traité
        ok1, msg1 = GeniusPayService.handle_webhook_event(payload)
        self.assertTrue(ok1)
        p.refresh_from_db()
        self.assertEqual(p.status, "BLOCKED")
        self.assertTrue(WebhookEventLog.objects.filter(event_id="evt_test_unique_123").exists())

        # Second passage identique -> idempotent (doublon ignoré)
        ok2, msg2 = GeniusPayService.handle_webhook_event(payload)
        self.assertTrue(ok2)
        self.assertIn("déjà traité", msg2)

        # Test de la tâche de purge
        # Vieillir artificiellement le log
        log = WebhookEventLog.objects.get(event_id="evt_test_unique_123")
        WebhookEventLog.objects.filter(pk=log.pk).update(created_at=timezone.now() - timedelta(days=45))

        purge_result = task_purge_old_idempotency_logs.apply(kwargs={"days": 30}).get()
        self.assertEqual(purge_result["status"], "SUCCESS")
        self.assertEqual(purge_result["deleted_count"], 1)
        self.assertFalse(WebhookEventLog.objects.filter(event_id="evt_test_unique_123").exists())


# ─── Offres & Liens de Paiement (Paylinks) ────────────────────────────────────

class OfferAndPaylinkTests(APITestCase):
    def setUp(self):
        self.seller = make_user("vendeur_pro", "seller")
        self.buyer = make_user("acheteur_client", "client")
        self.stranger = make_user("inconnu_user", "client")
        self.provider_patcher = patch(
            "escrow.views.GeniusPayService.initiate_payment",
            return_value={
                "reference": "MTX-TEST123",
                "checkout_url": "https://geniuspay.ci/checkout/MTX-TEST123",
            },
        )
        self.provider_patcher.start()
        self.addCleanup(self.provider_patcher.stop)

    def test_seller_create_offer(self):
        self.client.force_authenticate(user=self.seller)
        payload = {
            "title": "Samsung Galaxy S22 Ultra",
            "description": "256GB Noir Fantôme, sous blister",
            "amount": "150000.00",
            "delivery_terms": "Remise en main propre ou Colissimo sécurisé",
        }
        response = self.client.post("/api/offers/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertTrue(data["code"].startswith("OFF-"))
        self.assertIn("pay_url", data)
        self.assertEqual(data["seller_username"], "vendeur_pro")
        self.assertEqual(data["currency"], "XOF")
        self.assertEqual(float(data["amount"]), 150000.0)

        # Vérification en base
        offer = Offer.objects.get(code=data["code"])
        self.assertEqual(offer.seller, self.seller)
        self.assertTrue(offer.is_active)

    def test_public_consult_offer_with_kyc_status(self):
        offer = Offer.objects.create(
            seller=self.seller,
            title="iPhone 13 Pro",
            description="État neuf",
            amount=250000,
            delivery_terms="Livraison express Abidjan",
        )
        # Visite sans authentification
        self.client.force_authenticate(user=None)
        response = self.client.get(f"/api/offers/{offer.code}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "iPhone 13 Pro")
        self.assertEqual(response.data["seller_kyc_status"], "UNVERIFIED")

        # Mise à jour KYC vendeur -> APPROVED
        KYCVerification.objects.create(
            user=self.seller,
            id_type="cni",
            status="APPROVED",
        )
        response = self.client.get(f"/api/offers/{offer.code}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["seller_kyc_status"], "APPROVED")

    def test_public_consult_not_found_or_inactive(self):
        # Offre inexistante
        response = self.client.get("/api/offers/OFF-INEXISTANT/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Offre désactivée
        offer = Offer.objects.create(
            seller=self.seller,
            title="Article Archivé",
            amount=50000,
            is_active=False,
        )
        response = self.client.get(f"/api/offers/{offer.code}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_buyer_checkout_paylink(self):
        offer = Offer.objects.create(
            seller=self.seller,
            title="PlayStation 5",
            description="Console + 2 manettes",
            amount=300000,
            delivery_terms="Livraison sous 48h",
        )
        self.client.force_authenticate(user=self.buyer)
        response = self.client.post(
            f"/api/offers/{offer.code}/checkout/",
            {"delivery_address": "Cocody Angré 8ème Tranche, Villa 42"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data
        self.assertEqual(data["item_title"], "PlayStation 5")
        self.assertEqual(data["item_description"], "Console + 2 manettes")
        self.assertEqual(data["initiator_role"], "seller")
        self.assertEqual(float(data["amount"]), 300000.0)
        self.assertEqual(float(data["fee_amount"]), 3000.0)  # 1% de 300 000
        self.assertEqual(float(data["net_amount"]), 297000.0)
        self.assertEqual(data["provider_reference"], "MTX-TEST123")
        self.assertEqual(data["checkout_url"], "https://geniuspay.ci/checkout/MTX-TEST123")

        # Vérification OTP à 6 chiffres
        otp = data.get("delivery_otp")
        self.assertTrue(otp)
        self.assertEqual(len(otp), 6)
        self.assertTrue(otp.isdigit())

        # Vérification en base
        p = Paiement.objects.get(pk=data["id"])
        self.assertEqual(p.buyer, self.buyer)
        self.assertEqual(p.seller, self.seller)
        self.assertEqual(p.offer, offer)

    def test_seller_cannot_checkout_own_offer(self):
        offer = Offer.objects.create(
            seller=self.seller,
            title="MacBook Air M2",
            amount=650000,
        )
        self.client.force_authenticate(user=self.seller)
        response = self.client.post(f"/api/offers/{offer.code}/checkout/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("propre offre", str(response.data))

    def test_delivery_confirmation_flow(self):
        offer = Offer.objects.create(
            seller=self.seller,
            title="Drone DJI Mini 3",
            amount=400000,
        )
        self.client.force_authenticate(user=self.buyer)
        checkout_resp = self.client.post(f"/api/offers/{offer.code}/checkout/", {}, format="json")
        paiement_id = checkout_resp.data["id"]
        paiement = Paiement.objects.get(pk=paiement_id)

        # 1. En statut CREATED, la confirmation doit échouer
        response = self.client.post(f"/api/payments/{paiement_id}/confirm-delivery/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Impossible de libérer", str(response.data))

        # Passer manuellement à BLOCKED (simulation confirmation GeniusPay)
        paiement.status = "BLOCKED"
        paiement.save()

        # 2. Un tiers inconnu tente de valider la livraison -> 403 Forbidden
        self.client.force_authenticate(user=self.stranger)
        response = self.client.post(
            f"/api/payments/{paiement_id}/confirm-delivery/",
            {"otp": paiement.delivery_otp},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Le vendeur tente de valider avec un OTP invalide -> 400 Bad Request
        self.client.force_authenticate(user=self.seller)
        response = self.client.post(
            f"/api/payments/{paiement_id}/confirm-delivery/",
            {"otp": "000000"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("invalide", str(response.data))

        # Le bon OTP est accepté, mais GeniusPay ne documente pas l'endpoint payout.
        response = self.client.post(
            f"/api/payments/{paiement_id}/confirm-delivery/",
            {"otp": paiement.delivery_otp},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("payout", str(response.data).lower())
        paiement.refresh_from_db()
        self.assertEqual(paiement.status, "BLOCKED")

    def test_buyer_direct_delivery_confirmation(self):
        offer = Offer.objects.create(
            seller=self.seller,
            title="Montre Garmin",
            amount=180000,
        )
        p = Paiement.objects.create(
            offer=offer,
            buyer=self.buyer,
            seller=self.seller,
            amount=180000,
            status="BLOCKED",
        )
        # L'acheteur valide directement sans avoir besoin de renseigner l'OTP
        self.client.force_authenticate(user=self.buyer)
        response = self.client.post(f"/api/payments/{p.pk}/confirm-delivery/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        p.refresh_from_db()
        self.assertEqual(p.status, "BLOCKED")

    def test_client_cannot_create_offer(self):
        self.client.force_authenticate(user=self.buyer)
        payload = {
            "title": "Produit Interdit",
            "amount": "10000.00",
        }
        response = self.client.post("/api/offers/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delivery_otp_hidden_from_seller_and_stranger(self):
        offer = Offer.objects.create(
            seller=self.seller,
            title="Caméra Sony",
            amount=500000,
        )
        # L'acheteur passe la commande -> l'OTP est visible pour lui
        self.client.force_authenticate(user=self.buyer)
        res = self.client.post(f"/api/offers/{offer.code}/checkout/", {}, format="json")
        paiement_id = res.data["id"]
        self.assertTrue(res.data.get("delivery_otp"))

        # Le vendeur consulte le paiement -> delivery_otp doit être masqué
        self.client.force_authenticate(user=self.seller)
        detail_res = self.client.get(f"/api/payments/{paiement_id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertNotIn("delivery_otp", detail_res.data)

        # La liste côté vendeur ne contient pas l'OTP non plus
        list_res = self.client.get("/api/payments/")
        for p_item in list_res.data.get("results", list_res.data):
            if p_item["id"] == paiement_id:
                self.assertNotIn("delivery_otp", p_item)


