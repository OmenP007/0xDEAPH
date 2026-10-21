"""
Gestionnaire d'exceptions personnalisé pour 0xSeq.
Garantit que les réponses d'erreur ne révèlent jamais de détails internes
en production (stack traces, noms de modules, chemins de fichiers).
"""
import logging
from django.conf import settings
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Gestionnaire d'exception DRF global :
    - Préserve la compatibilité DRF (champs 'detail', erreurs par champ)
    - Fournit un alias 'error' uniforme
    - En production, ne jamais exposer les stack traces ou erreurs 500 internes
    - Journalise toutes les anomalies pour audit et surveillance SIEM
    """
    response = exception_handler(exc, context)

    if response is None:
        # Erreur non gérée (500) : logger et masquer en production
        logger.error(
            "[Security] Exception 500 non gérée: %s | view: %s",
            exc,
            context.get("view"),
            exc_info=True,
        )
        if settings.DEBUG:
            return None  # En local / tests avec debug, Django affiche le trace standard
        return Response(
            {
                "error": "Une erreur interne est survenue. Notre équipe a été notifiée.",
                "detail": "Une erreur interne est survenue. Notre équipe a été notifiée.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Si c'est un dictionnaire, on s'assure que 'error' et 'detail' sont tous deux disponibles
    if isinstance(response.data, dict):
        if "detail" in response.data and "error" not in response.data:
            response.data["error"] = response.data["detail"]
        elif "error" in response.data and "detail" not in response.data:
            response.data["detail"] = response.data["error"]

    return response
