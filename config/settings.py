"""
Django settings for config project.
"""

from pathlib import Path

import environ

# ─── Chemins ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Variables d'environnement ────────────────────────────────────────────────
env = environ.Env(
    DEBUG=(bool, False),
    DB_ENGINE=(str, "sqlite3"),
    GENIUS_PAY_SANDBOX=(bool, True),
    CELERY_BROKER_URL=(str, "redis://localhost:6379/0"),
    CELERY_RESULT_BACKEND=(str, "redis://localhost:6379/0"),
)
environ.Env.read_env(BASE_DIR / ".env")

# ─── Sécurité ─────────────────────────────────────────────────────────────────
SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["127.0.0.1", "localhost"])
if DEBUG and "testserver" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("testserver")

CSRF_TRUSTED_ORIGINS = [
    f"https://{h}" for h in ALLOWED_HOSTS if not h.startswith(("127.", "localhost", "testserver"))
]

# ─── Headers de sécurité HTTPS (activés uniquement en production) ──────────────
if not DEBUG:
    SECURE_SSL_REDIRECT                  = True
    SECURE_HSTS_SECONDS                  = 31536000      # 1 an
    SECURE_HSTS_INCLUDE_SUBDOMAINS       = True
    SECURE_HSTS_PRELOAD                  = True
    SECURE_PROXY_SSL_HEADER              = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE                = True
    CSRF_COOKIE_SECURE                   = True
    SECURE_REFERRER_POLICY               = "strict-origin-when-cross-origin"
    SECURE_BROWSER_XSS_FILTER           = True
    SECURE_CONTENT_TYPE_NOSNIFF         = True

# ─── Cookies sécurisés ────────────────────────────────────────────────────────
SESSION_COOKIE_HTTPONLY  = True
SESSION_COOKIE_SAMESITE  = "Strict"
CSRF_COOKIE_HTTPONLY     = True
CSRF_COOKIE_SAMESITE     = "Strict"
SESSION_COOKIE_AGE       = 60 * 60 * 8   # 8 heures maximum (jeton de session)

# ─── Applications ─────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Tiers
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",
    # Projet
    "escrow",
]

# ─── Middleware ───────────────────────────────────────────────────────────────
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Middlewares de sécurité personnalisés 0xSeq
    "escrow.middleware.SecurityHeadersMiddleware",
    "escrow.middleware.WebhookTimestampValidationMiddleware",
    "escrow.middleware.RequestLoggingMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",          # i18n
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# ─── Base de données ──────────────────────────────────────────────────────────
_db_engine = env("DB_ENGINE")

if _db_engine == "postgresql":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB", default="0xseq"),
            "USER": env("POSTGRES_USER", default="0xseq"),
            "PASSWORD": env("POSTGRES_PASSWORD", default=""),
            "HOST": env("POSTGRES_HOST", default="localhost"),
            "PORT": env("POSTGRES_PORT", default="5432"),
            "OPTIONS": {
                "connect_timeout": 10,
            },
            "CONN_MAX_AGE": 60,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# ─── Authentification ─────────────────────────────────────────────────────────
AUTH_USER_MODEL = "escrow.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ─── Logging de sécurité ─────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] [{levelname}] [{name}] {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django.security": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
        "escrow": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

# ─── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "escrow.authentication.APIKeyAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon":       "20/minute",
        "user":       "100/minute",
        "auth":       "10/minute",       # /api/token, /api/register
        "webhook":    "60/minute",       # /api/webhooks/
        "sensitive":  "5/minute",        # opérations sensibles (refund, release)
    },
    # Renvoie des erreurs JSON uniformes même sur les 404/403 non-DRF
    "EXCEPTION_HANDLER": "escrow.exceptions.custom_exception_handler",
    # Ne jamais exposer les détails internes en production
    "NON_FIELD_ERRORS_KEY": "error",
}

# ─── JWT Configuration ────────────────────────────────────────────────────────
from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(minutes=30),   # Courte durée (sécurité)
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS":  True,                    # Rotation des refresh tokens
    "BLACKLIST_AFTER_ROTATION": False,                 # sans blacklist (pas installé)
    "ALGORITHM": "HS256",
    "SIGNING_KEY": env("SECRET_KEY"),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_TYPE_CLAIM": "token_type",
    "JTI_CLAIM": "jti",
}

# ─── drf-spectacular (OpenAPI / Swagger) ──────────────────────────────────────
SPECTACULAR_SETTINGS = {
    "TITLE": "0xSeq API",
    "DESCRIPTION": "API de paiement sous séquestre — 0xSeq",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# ─── GeniusPay ────────────────────────────────────────────────────────────────
GENIUS_PAY_SANDBOX = env("GENIUS_PAY_SANDBOX")
GENIUS_PAY_URL = env("GENIUS_PAY_URL")

if GENIUS_PAY_SANDBOX:
    GENIUS_PAY_API_KEY = env("GENIUS_PAY_API_SANDBOX")
    GENIUS_PAY_SECRET  = env("GENIUS_PAY_SECRET_SANDBOX")
else:
    GENIUS_PAY_API_KEY = env("GENIUS_PAY_API")
    GENIUS_PAY_SECRET  = env("GENIUS_PAY_SECRET")

GENIUS_PAY_WEBHOOK_SECRET = env("GENIUS_PAY_WEBHOOK_SECRET", default="")

# Validation critique : bloquer si secret webhook absent en production
if not DEBUG and not GENIUS_PAY_WEBHOOK_SECRET:
    raise RuntimeError(
        "GENIUS_PAY_WEBHOOK_SECRET est obligatoire en production. "
        "Définissez-le dans votre fichier .env."
    )

# ─── Celery ───────────────────────────────────────────────────────────────────
CELERY_BROKER_URL         = env("CELERY_BROKER_URL")
CELERY_RESULT_BACKEND     = env("CELERY_RESULT_BACKEND")
CELERY_TASK_SERIALIZER    = "json"
CELERY_RESULT_SERIALIZER  = "json"
CELERY_ACCEPT_CONTENT     = ["json"]
CELERY_TIMEZONE           = "UTC"
CELERY_ENABLE_UTC         = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT    = 30 * 60  # 30 minutes max par tâche

# ─── Sentry (Monitoring d'Erreurs en Production) ──────────────────────────────
SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
            RedisIntegration(),
        ],
        traces_sample_rate=env.float("SENTRY_TRACES_SAMPLE_RATE", default=0.1),
        send_default_pii=False,
        environment=env("ENVIRONMENT", default="production" if not DEBUG else "development"),
    )


# ─── Internationalisation ─────────────────────────────────────────────────────
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

LOCALE_PATHS = [BASE_DIR / "locale"]

# ─── Fichiers statiques ───────────────────────────────────────────────────────
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

