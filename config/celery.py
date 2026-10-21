import os
from celery import Celery
from celery.schedules import crontab

# Indique à Celery le fichier de configuration Django par défaut
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('0xSeq')

# Charge la configuration Celery depuis config.settings (namespace CELERY_)
app.config_from_object('django.conf:settings', namespace='CELERY')

# Découverte automatique des tâches dans tous les packages installés (escrow/tasks.py)
app.autodiscover_tasks()

# ─── Planification Celery Beat ────────────────────────────────────────────────
app.conf.beat_schedule = {
    # Exécution périodique toutes les 15 minutes pour libérer les séquestres expirés (3 jours)
    'auto-release-expired-escrows-every-15m': {
        'task': 'escrow.tasks.task_auto_release_expired_escrows',
        'schedule': crontab(minute='*/15'),
    },
    # Nettoyage quotidien des journaux d'événements webhooks et clés d'idempotence à 03h00 UTC
    'purge-old-webhook-idempotency-daily': {
        'task': 'escrow.tasks.task_purge_old_idempotency_logs',
        'schedule': crontab(hour=3, minute=0),
        'kwargs': {'days': 30},
    },
}
