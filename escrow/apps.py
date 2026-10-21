from django.apps import AppConfig


class EscrowConfig(AppConfig):
    name = "escrow"

    def ready(self):
        try:
            import escrow.tasks  # noqa: F401
        except ImportError:
            pass

