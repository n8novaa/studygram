import os
from datetime import timedelta
from email.utils import parseaddr
from pathlib import Path
from dotenv import load_dotenv

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

MEDIA_URL = '/media/'
MEDIA_STORAGE_BACKEND = os.environ.get(
    'MEDIA_STORAGE_BACKEND', 'filesystem'
).strip().lower()
MEDIA_ROOT = Path(os.environ.get('DJANGO_MEDIA_ROOT', BASE_DIR / 'media'))
STATIC_ROOT = Path(os.environ.get('DJANGO_STATIC_ROOT', BASE_DIR / 'staticfiles'))

if MEDIA_STORAGE_BACKEND not in {'filesystem', 's3'}:
    raise ValueError('MEDIA_STORAGE_BACKEND must be either filesystem or s3.')

if MEDIA_STORAGE_BACKEND == 's3' and not os.environ.get('AWS_STORAGE_BUCKET_NAME'):
    raise ValueError('AWS_STORAGE_BUCKET_NAME is required with S3 media storage.')

# --------------------------------------------------
# Security Configuration
# --------------------------------------------------

DEBUG = os.environ.get(
    'DJANGO_DEBUG', 'False'
).lower() in ('true', '1', 'yes')

if (
    not DEBUG
    and MEDIA_STORAGE_BACKEND == 'filesystem'
    and not os.environ.get('DJANGO_MEDIA_ROOT')
):
    raise ValueError(
        'Set DJANGO_MEDIA_ROOT to a durable mounted volume, or configure '
        'MEDIA_STORAGE_BACKEND=s3 for production uploads.'
    )

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-only-key-replace-in-production'
    else:
        raise ValueError(
            'DJANGO_SECRET_KEY must be configured when DEBUG=False.'
        )

if not DEBUG and (
    len(SECRET_KEY) < 50
    or SECRET_KEY.startswith('django-insecure-')
    or 'replace-with' in SECRET_KEY.lower()
):
    raise ValueError(
        'DJANGO_SECRET_KEY must be a long, randomly generated production secret.'
    )

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        'DJANGO_ALLOWED_HOSTS',
        'localhost,127.0.0.1'
    ).split(',')
    if host.strip()
]

if not DEBUG and (not ALLOWED_HOSTS or '*' in ALLOWED_HOSTS):
    raise ValueError(
        'DJANGO_ALLOWED_HOSTS must contain explicit hostnames when DEBUG=False.'
    )

if not DEBUG and not os.environ.get('DJANGO_ALLOWED_HOSTS'):
    raise ValueError('Set DJANGO_ALLOWED_HOSTS to the public API hostname(s).')

# Cookie security
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'

# HTTPS security
SECURE_SSL_REDIRECT = os.environ.get(
    'SECURE_SSL_REDIRECT', str(not DEBUG)
).lower() in ('true', '1', 'yes')
SECURE_HSTS_SECONDS = int(os.environ.get(
    'SECURE_HSTS_SECONDS', '31536000' if not DEBUG else '0'
))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get(
    'SECURE_HSTS_INCLUDE_SUBDOMAINS', str(not DEBUG)
).lower() in ('true', '1', 'yes')
SECURE_HSTS_PRELOAD = os.environ.get(
    'SECURE_HSTS_PRELOAD', 'False'
).lower() in ('true', '1', 'yes')
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
SECURE_PROXY_SSL_HEADER = (
    ('HTTP_X_FORWARDED_PROTO', 'https')
    if os.environ.get('TRUST_PROXY_SSL_HEADER', 'False').lower()
    in ('true', '1', 'yes')
    else None
)
USE_X_FORWARDED_HOST = os.environ.get(
    'USE_X_FORWARDED_HOST', 'False'
).lower() in ('true', '1', 'yes')
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',')
    if origin.strip()
]


# --------------------------------------------------
# Installed Applications
# --------------------------------------------------

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'channels',
    'corsheaders',
    'base.apps.BaseConfig',
    'workspaces',
    'files',
]

if MEDIA_STORAGE_BACKEND == 's3':
    INSTALLED_APPS.append('storages')


# --------------------------------------------------
# Middleware
# --------------------------------------------------

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# --------------------------------------------------
# URL Configuration
# --------------------------------------------------

ROOT_URLCONF = 'config.urls'


# --------------------------------------------------
# Templates
# --------------------------------------------------

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]


# --------------------------------------------------
# Application Server
# --------------------------------------------------

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

REDIS_URL = os.environ.get('REDIS_URL')
if REDIS_URL:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
                'capacity': 1000,
                'expiry': 10,
            },
        },
    }
else:
    # Suitable for local development and a single process. Production instances
    # with multiple workers should share a Redis channel layer.
    CHANNEL_LAYERS = {
        'default': {'BACKEND': 'channels.layers.InMemoryChannelLayer'},
    }

if not DEBUG and not REDIS_URL:
    raise ValueError('REDIS_URL must be configured when DEBUG=False.')


# --------------------------------------------------
# Database Configuration
# --------------------------------------------------

DATABASE_URL = os.environ.get('DATABASE_URL')

if not DEBUG and not DATABASE_URL:
    raise ValueError('DATABASE_URL must be configured when DEBUG=False.')

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=600,
        ),
    }

else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

if not DEBUG and DATABASES['default']['ENGINE'] != 'django.db.backends.postgresql':
    raise ValueError('Production must use PostgreSQL through DATABASE_URL.')


# --------------------------------------------------
# Password Validation
# --------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'UserAttributeSimilarityValidator'
        ),
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'MinimumLengthValidator'
        ),
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'CommonPasswordValidator'
        ),
    },
    {
        'NAME': (
            'django.contrib.auth.password_validation.'
            'NumericPasswordValidator'
        ),
    },
]


# --------------------------------------------------
# Internationalization
# --------------------------------------------------

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# --------------------------------------------------
# Static Files
# --------------------------------------------------

STATIC_URL = '/static/'
STATIC_FILES_DIR = BASE_DIR / 'static'
STATICFILES_DIRS = [STATIC_FILES_DIR] if STATIC_FILES_DIR.exists() else []

STORAGES = {
    'default': {
        'BACKEND': (
            'storages.backends.s3.S3Storage'
            if MEDIA_STORAGE_BACKEND == 's3'
            else 'django.core.files.storage.FileSystemStorage'
        ),
    },
    'staticfiles': {
        'BACKEND': 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage',
    },
}

if MEDIA_STORAGE_BACKEND == 's3':
    AWS_STORAGE_BUCKET_NAME = os.environ['AWS_STORAGE_BUCKET_NAME']
    AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME') or None
    AWS_S3_ENDPOINT_URL = os.environ.get('AWS_S3_ENDPOINT_URL') or None
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID') or None
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY') or None
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = True
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_ADDRESSING_STYLE = os.environ.get(
        'AWS_S3_ADDRESSING_STYLE', 'auto'
    )


# --------------------------------------------------
# Default Model Configuration
# --------------------------------------------------

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# --------------------------------------------------
# Django REST Framework
# --------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ),
    'DEFAULT_PAGINATION_CLASS': (
        'rest_framework.pagination.PageNumberPagination'
    ),
    'PAGE_SIZE': 20,
        'DEFAULT_THROTTLE_RATES': {
        'auth_login': '5/min',
        'auth_register': '3/hour',
        'password_reset': '5/hour',
    },
}



# --------------------------------------------------
# JWT Configuration
# --------------------------------------------------

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}


# --------------------------------------------------
# CORS Configuration
# --------------------------------------------------

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173'
    ).split(',')
    if origin.strip()
]

# The frontend authenticates API calls with bearer tokens, not cookies.
CORS_ALLOW_CREDENTIALS = False

LOG_LEVEL = os.environ.get('DJANGO_LOG_LEVEL', 'INFO').upper()
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'console': {
            'format': '{asctime} {levelname} {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'console',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': LOG_LEVEL,
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'workspaces': {
            'handlers': ['console'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
    },
}

# --------------------------------------------------
# Email Configuration
# --------------------------------------------------

EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend'
    if DEBUG
    else 'django.core.mail.backends.smtp.EmailBackend',
)

EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))

EMAIL_USE_TLS = (
    os.environ.get('EMAIL_USE_TLS', 'True').lower()
    in ('true', '1', 'yes')
)

EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')

if (
    not DEBUG
    and EMAIL_BACKEND == 'django.core.mail.backends.smtp.EmailBackend'
    and not EMAIL_HOST
):
    raise ValueError('EMAIL_HOST must be configured for production SMTP email.')

DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL',
    'StudyGram <noreply@studygram.local>',
)

if not DEBUG:
    if EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
        raise ValueError('Console email backend is not allowed in production.')
    sender_address = parseaddr(DEFAULT_FROM_EMAIL)[1]
    sender_domain = sender_address.rsplit('@', 1)[-1].lower()
    if (
        '@' not in sender_address
        or sender_domain.endswith('.local')
    ):
        raise ValueError(
            'Set DEFAULT_FROM_EMAIL to a sender address verified with your email provider.'
        )
    if bool(EMAIL_HOST_USER) != bool(EMAIL_HOST_PASSWORD):
        raise ValueError(
            'Configure both EMAIL_HOST_USER and EMAIL_HOST_PASSWORD, or neither.'
        )

FRONTEND_URL = os.environ.get(
    'FRONTEND_URL',
    'http://localhost:5173',
)

if not DEBUG:
    if not FRONTEND_URL.startswith('https://'):
        raise ValueError('FRONTEND_URL must use HTTPS when DEBUG=False.')
    if FRONTEND_URL.rstrip('/') not in CORS_ALLOWED_ORIGINS:
        raise ValueError(
            'FRONTEND_URL must be included in CORS_ALLOWED_ORIGINS '
            'for authenticated WebSocket connections.'
        )
