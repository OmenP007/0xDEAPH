import datetime
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60, name="escrow.tasks.task_auto_release_expired_escrows")
def task_auto_release_expired_escrows(self):
    """
    Tâche périodique Celery Beat exécutée toutes les 15 minutes.
    Libère automatiquement tous les paiements sous séquestre ayant dépassé le délai légal
    de 3 jours sans contestation ni litige actif.
    
    Gestion des pannes : retry automatique avec backoff exponentiel jusqu'à 3 fois.
    """
    from .services import auto_release_expired_escrows

    start_time = timezone.now()
    logger.info("[Celery Beat] Début de la tâche de libération automatique des séquestres...")

    try:
        released_ids = auto_release_expired_escrows()
        duration = (timezone.now() - start_time).total_seconds()
        
        result = {
            "status": "SUCCESS",
            "released_count": len(released_ids),
            "released_ids": released_ids,
            "duration_seconds": round(duration, 3),
            "executed_at": start_time.isoformat(),
        }
        logger.info(
            "[Celery Beat] Libération terminée en %.3fs : %d séquestre(s) libéré(s) : %s",
            duration,
            len(released_ids),
            released_ids,
        )
        return result

    except Exception as exc:
        retries = self.request.retries
        countdown = 60 * (2 ** retries)
        logger.error(
            "[Celery Beat] Erreur lors de l'auto-release (tentative %d/3) : %s. Prochain essai dans %ds.",
            retries + 1,
            exc,
            countdown,
            exc_info=True,
        )
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(bind=True, max_retries=3, default_retry_delay=120, name="escrow.tasks.task_purge_old_idempotency_logs")
def task_purge_old_idempotency_logs(self, days: int = 30):
    """
    Tâche périodique quotidienne Celery Beat (exécutée à 03h00 UTC).
    Purge les journaux d'événements webhooks et d'idempotence plus anciens que `days` jours
    pour éviter la saturation de la base de données.
    """
    from .models import WebhookEventLog

    cutoff_date = timezone.now() - datetime.timedelta(days=days)
    logger.info("[Celery Beat] Purge des événements webhooks antérieurs à %s (rétention: %d jours)...", cutoff_date, days)

    try:
        deleted_count, _ = WebhookEventLog.objects.filter(created_at__lt=cutoff_date).delete()
        logger.info("[Celery Beat] Purge terminée : %d journal(aux) webhook supprimé(s).", deleted_count)
        return {
            "status": "SUCCESS",
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat(),
            "retention_days": days,
        }
    except Exception as exc:
        logger.error("[Celery Beat] Erreur lors de la purge d'idempotence : %s", exc, exc_info=True)
        raise self.retry(exc=exc, countdown=120)


@shared_task(bind=True, max_retries=3, default_retry_delay=30, name="escrow.tasks.task_release_single_escrow")
def task_release_single_escrow(self, paiement_id: int):
    """
    Libère un séquestre unitaire vers le portefeuille interne du vendeur.

    Utilisé pour les libérations demandées hors requête HTTP (retry, outil
    d'administration). Aucun virement externe n'est effectué.
    """
    from .models import Paiement
    from .services import EscrowReleaseError, release_funds

    try:
        paiement = Paiement.objects.get(pk=paiement_id)
        try:
            result = release_funds(paiement)
        except EscrowReleaseError as exc:
            logger.warning("[Celery] Libération impossible pour le paiement #%s : %s", paiement_id, exc)
            return {"status": "SKIPPED", "paiement_id": paiement_id, "reason": str(exc)}

        return {
            "status": "SUCCESS",
            "paiement_id": paiement_id,
            "credited": result["credited"],
            "amount": result["amount"],
        }

    except Paiement.DoesNotExist:
        logger.error("[Celery] Paiement #%s introuvable pour libération asynchrone.", paiement_id)
        return {"status": "NOT_FOUND", "paiement_id": paiement_id}
