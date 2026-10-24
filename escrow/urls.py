from django.urls import path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    APIKeyListCreateView,
    APIKeyRevokeView,
    DeveloperRegisterView,
    DeveloperTokenObtainPairView,
    DisputeDetailResolveView,
    GeniusPayWebhookView,
    HealthView,
    KYCDocumentView,
    KYCReviewView,
    KYCView,
    OfferCheckoutView,
    OfferListCreateView,
    OfferPublicDetailView,
    PaiementAutoReleaseView,
    PaiementConfirmDeliveryView,
    PaiementDetailView,
    PaiementDisputeView,
    PaiementListCreateView,
    PaiementRefundView,
    PaiementReleaseView,
    RegisterView,
    serve_documentation,
)


urlpatterns = [
    # ── Santé ─────────────────────────────────────────────────────────────────
    path("api/health/",               HealthView.as_view(),             name="health"),

    # ── Webhook GeniusPay ─────────────────────────────────────────────────────
    path("api/webhooks/geniuspay/",   GeniusPayWebhookView.as_view(),   name="geniuspay-webhook"),

    # ── Authentification Standard ─────────────────────────────────────────────
    path("api/register/",             RegisterView.as_view(),           name="register"),
    path("api/token/",                TokenObtainPairView.as_view(),    name="token-obtain-pair"),
    path("api/token/refresh/",        TokenRefreshView.as_view(),       name="token-refresh"),

    # ── Espace Développeur (Page / Auth dédiée) ───────────────────────────────
    path("api/developer/register/",   DeveloperRegisterView.as_view(),         name="developer-register"),
    path("api/developer/token/",      DeveloperTokenObtainPairView.as_view(),  name="developer-token"),

    # ── Offres & Liens de Paiement (Paylinks) ─────────────────────────────────
    path("api/offers/",                         OfferListCreateView.as_view(),         name="offer-list-create"),
    path("api/offers/<str:code>/",              OfferPublicDetailView.as_view(),       name="offer-public-detail"),
    path("api/offers/<str:code>/checkout/",     OfferCheckoutView.as_view(),           name="offer-checkout"),

    # ── Paiements ─────────────────────────────────────────────────────────────
    path("api/payments/",                       PaiementListCreateView.as_view(),      name="payment-list-create"),
    path("api/payments/<int:pk>/",              PaiementDetailView.as_view(),          name="payment-detail"),
    path("api/payments/<int:pk>/release/",      PaiementReleaseView.as_view(),         name="payment-release"),
    path("api/payments/<int:pk>/refund/",       PaiementRefundView.as_view(),          name="payment-refund"),
    path("api/payments/<int:pk>/dispute/",      PaiementDisputeView.as_view(),         name="payment-dispute"),
    path("api/payments/<int:pk>/confirm-delivery/", PaiementConfirmDeliveryView.as_view(), name="payment-confirm-delivery"),
    path("api/payments/auto-release/",          PaiementAutoReleaseView.as_view(),     name="payment-auto-release"),

    # ── Litiges (Arbitrage) ───────────────────────────────────────────────────
    path("api/disputes/<int:pk>/",         DisputeDetailResolveView.as_view(), name="dispute-detail"),
    path("api/disputes/<int:pk>/resolve/", DisputeDetailResolveView.as_view(), name="dispute-resolve"),

    # ── Module KYC (Conformité) ───────────────────────────────────────────────
    path("api/kyc/",                       KYCView.as_view(),                  name="kyc"),
    path("api/kyc/<int:pk>/document/",      KYCDocumentView.as_view(),          name="kyc-document"),
    path("api/kyc/<int:pk>/review/",       KYCReviewView.as_view(),            name="kyc-review"),

    # ── Clés API ──────────────────────────────────────────────────────────────
    path("api/keys/",                 APIKeyListCreateView.as_view(),   name="apikey-list-create"),
    path("api/keys/<int:pk>/revoke/", APIKeyRevokeView.as_view(),       name="apikey-revoke"),

    # ── Documentation OpenAPI ─────────────────────────────────────────────────
    path("api/schema/",               SpectacularAPIView.as_view(),     name="schema"),
    path("api/schema/swagger/",       SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/schema/redoc/",         SpectacularRedocView.as_view(url_name="schema"),   name="redoc"),

    # ── Documentation HTML statique ───────────────────────────────────────────
    path(
        "docs/index.html",
        serve_documentation,
        {"filename": "index.html"},
        name="documentation",
    ),
    path(
        "docs/future_update.html",
        serve_documentation,
        {"filename": "future_update.html"},
        name="update",
    ),
]
