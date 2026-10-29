"""
Middlewares de sécurité personnalisés pour 0xSeq.
"""
import re
import logging
import time

from django.conf import settings
from django.http import JsonResponse, HttpResponse

logger = logging.getLogger(__name__)


class CorsMiddleware:
    """
    Middleware CORS pour autoriser les requêtes cross-origin du frontend web (localhost:5173)
    et de l'application mobile (Flutter).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            response = HttpResponse()
            origin = request.headers.get("Origin", "*")
            response["Access-Control-Allow-Origin"] = origin if origin else "*"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = (
                "Authorization, Content-Type, X-CSRFToken, X-API-Key, Accept, Origin, "
                "User-Agent, DNT, Cache-Control, X-Requested-With"
            )
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Max-Age"] = "86400"
            return response

        response = self.get_response(request)
        origin = request.headers.get("Origin")
        if origin:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Headers"] = (
                "Authorization, Content-Type, X-CSRFToken, X-API-Key, Accept, Origin, "
                "User-Agent, DNT, Cache-Control, X-Requested-With"
            )
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        else:
            response["Access-Control-Allow-Origin"] = "*"
        return response


class SecurityHeadersMiddleware:
    """
    Injecte des en-têtes HTTP de sécurité stricts sur toutes les réponses.
    Protège contre : XSS, clickjacking, MIME sniffing, information disclosure.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Empêche le MIME-sniffing (CVE prévention)
        response["X-Content-Type-Options"] = "nosniff"

        # Protection anti-clickjacking
        response["X-Frame-Options"] = "DENY"

        # Désactive l'XSS auditor des anciens navigateurs (remplacé par CSP)
        response["X-XSS-Protection"] = "1; mode=block"

        # Politique de référent stricte
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # Désactive les feature APIs non nécessaires
        response["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=(), "
            "usb=(), bluetooth=(), accelerometer=(), gyroscope=()"
        )

        # Content Security Policy pour les réponses HTML
        if "text/html" in response.get("Content-Type", ""):
            # Endpoints de documentation OpenAPI (Swagger UI & ReDoc) qui chargent leurs assets via CDN
            if request.path.startswith("/api/schema/"):
                response["Content-Security-Policy"] = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://cdn.jsdelivr.net; "
                    "worker-src 'self' blob:; "
                    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; "
                    "img-src 'self' data: https://cdn.jsdelivr.net; "
                    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; "
                    "connect-src 'self'; "
                    "frame-ancestors 'none';"
                )
            else:
                response["Content-Security-Policy"] = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline'; "
                    "style-src 'self' 'unsafe-inline'; "
                    "img-src 'self' data:; "
                    "font-src 'self'; "
                    "connect-src 'self'; "
                    "frame-ancestors 'none';"
                )

        # HSTS (uniquement en HTTPS production)
        if not settings.DEBUG:
            response["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        # Supprime la bannière serveur pour éviter la fingerprinting
        response["Server"] = "0xSeq"
        if "X-Powered-By" in response:
            del response["X-Powered-By"]

        return response


class WebhookTimestampValidationMiddleware:
    """
    Valide le timestamp des webhooks GeniusPay pour prévenir les attaques par replay.
    Si le timestamp est plus vieux de 5 minutes, la requête est rejetée en production.
    S'applique uniquement aux endpoints /api/webhooks/.
    En mode DEBUG/tests, la vérification peut être désactivée via WEBHOOK_MAX_AGE_SECONDS = 0.
    """

    WEBHOOK_PATH_PREFIX = "/api/webhooks/"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import sys
        is_testing = "test" in sys.argv or getattr(settings, "TESTING", False)
        max_age = 0 if is_testing else getattr(settings, "WEBHOOK_MAX_AGE_SECONDS", 300 if not settings.DEBUG else 0)

        if max_age > 0 and request.method == "POST" and request.path.startswith(self.WEBHOOK_PATH_PREFIX):
            timestamp_str = (
                request.headers.get("X-Webhook-Timestamp")
                or request.META.get("HTTP_X_WEBHOOK_TIMESTAMP")
            )

            if timestamp_str:
                try:
                    ts = int(timestamp_str)
                    age = abs(time.time() - ts)
                    if age > max_age:
                        logger.warning(
                            "[Security] Webhook replay attack détecté : "
                            "timestamp=%s âge=%.0fs > %ss. IP=%s",
                            timestamp_str,
                            age,
                            max_age,
                            self._get_client_ip(request),
                        )
                        return JsonResponse(
                            {"error": "Webhook expiré. Timestamp trop ancien."},
                            status=400,
                        )
                except (ValueError, TypeError):
                    # Timestamp malformé : on laisse la signature HMAC gérer
                    pass

        return self.get_response(request)

    @staticmethod
    def _get_client_ip(request) -> str:
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")


class RequestLoggingMiddleware:
    """
    Journalise les requêtes entrantes pour l'audit et la détection d'intrusion.
    En production : log toutes les requêtes vers /api/ avec l'IP source,
    la méthode, le code HTTP et le temps de réponse.
    Ne journalise jamais les corps de requête (données sensibles).
    """

    SENSITIVE_PATHS = re.compile(r"/api/token|/api/register|/api/developer", re.I)

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.monotonic()
        response = self.get_response(request)
        duration_ms = (time.monotonic() - start_time) * 1000

        if request.path.startswith("/api/"):
            ip = self._get_client_ip(request)
            # On masque le path pour les endpoints sensibles dans les logs
            logged_path = (
                "[auth-endpoint]"
                if self.SENSITIVE_PATHS.search(request.path)
                else request.path
            )

            log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
            logger.log(
                log_level,
                "[API] %s %s %s — %.1fms — IP:%s",
                request.method,
                logged_path,
                response.status_code,
                duration_ms,
                ip,
            )

        return response

    @staticmethod
    def _get_client_ip(request) -> str:
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")
