import hashlib

from django.utils import timezone
from rest_framework import authentication, exceptions

from .models import APIKey


class APIKeyAuthentication(authentication.BaseAuthentication):
    """
    Authentification via en-tête X-API-Key pour les intégrations externes / développeurs.
    Format attendu :
        X-API-Key: 0xs_live_<secret>
    """

    HEADER_NAME = "HTTP_X_API_KEY"

    def authenticate(self, request):
        raw_key = (
            request.META.get(self.HEADER_NAME)
            or request.headers.get("X-Api-Key")
            or request.headers.get("X-API-Key")
        )

        if not raw_key:
            return None  # Permet de passer aux autres méthodes (ex: JWT)

        raw_key = raw_key.strip()
        # Protection anti-DoS (rejet des headers disproportionnés) et format attendu
        if len(raw_key) > 256 or not raw_key.startswith("0xs_live_"):
            raise exceptions.AuthenticationFailed("Format de clé API invalide.")

        # Calcul de l'empreinte SHA-256 du secret
        key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

        try:
            api_key = APIKey.objects.select_related("user").get(key_hash=key_hash)
        except APIKey.DoesNotExist:
            raise exceptions.AuthenticationFailed("Clé API invalide.")

        if not api_key.is_active:
            raise exceptions.AuthenticationFailed("Cette clé API a été révoquée.")

        if api_key.expires_at and api_key.expires_at < timezone.now():
            raise exceptions.AuthenticationFailed("Cette clé API a expiré.")

        # Mise à jour discrète de la date de dernière utilisation
        APIKey.objects.filter(pk=api_key.pk).update(last_used=timezone.now())

        return (api_key.user, api_key)


# ─── Extension OpenAPI / drf-spectacular pour Swagger UI ─────────────────────
try:
    from drf_spectacular.extensions import OpenApiAuthenticationExtension

    class APIKeyScheme(OpenApiAuthenticationExtension):
        target_class = "escrow.authentication.APIKeyAuthentication"
        name = "ApiKeyAuth"

        def get_security_definition(self, auto_schema):
            return {
                "type": "apiKey",
                "in": "header",
                "name": "X-API-Key",
                "description": "Clé secrète développeur (format : 0xs_live_<secret>)",
            }
except ImportError:
    pass

