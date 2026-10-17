# Deployment checklist

StudyGram is a Django/DRF application with an ASGI WebSocket endpoint and a React single-page frontend. The repository includes Docker images, a Docker Compose local stack, and CI checks. This file describes the remaining environment-specific production setup; no cloud resources or external deployment have been created from this repository.

## Required production services

- PostgreSQL, provided through `DATABASE_URL`.
- Shared Redis, provided through `REDIS_URL`. This backs Django Channels across workers.
- Durable, backed-up media storage. Configure `MEDIA_STORAGE_BACKEND=s3` for S3-compatible object storage, or set `DJANGO_MEDIA_ROOT` to a durable mounted volume. Production startup now fails if neither choice is explicit. S3 media is private by default and uses signed URLs; keep public bucket access blocked. For multiple replicas, use object storage or a shared volume.
- An ASGI server such as Daphne, behind a TLS-terminating proxy that supports WebSocket upgrades.
- Frontend and backend origins configured in `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` as appropriate.
- A real SMTP provider and verified sender address for password resets.

## Production environment

Set these in the hosting provider's secret/configuration manager. Do not copy the local Compose credentials into production.

```text
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<long-random-secret>
DJANGO_ALLOWED_HOSTS=<api-hostname>
DATABASE_URL=<managed-postgres-url>
REDIS_URL=<managed-redis-url>
CORS_ALLOWED_ORIGINS=<frontend-origin>
CSRF_TRUSTED_ORIGINS=<frontend-origin>
FRONTEND_URL=<frontend-origin>
TRUST_PROXY_SSL_HEADER=True
# Choose one durable media option:
MEDIA_STORAGE_BACKEND=s3
AWS_STORAGE_BUCKET_NAME=<private-bucket-name>
AWS_S3_REGION_NAME=<region>
# For S3-compatible providers only:
# AWS_S3_ENDPOINT_URL=<provider-endpoint>
# AWS_ACCESS_KEY_ID=<key-if-not-using-instance-identity>
# AWS_SECRET_ACCESS_KEY=<secret-if-not-using-instance-identity>
# Or use a durable mounted filesystem volume instead:
# MEDIA_STORAGE_BACKEND=filesystem
# DJANGO_MEDIA_ROOT=<durable-media-path>
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=<smtp-host>
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<smtp-user>
EMAIL_HOST_PASSWORD=<smtp-app-password>
DEFAULT_FROM_EMAIL=<verified-sender>
```

With `DEBUG=False`, Django fails at startup if `DJANGO_SECRET_KEY`, explicit `DJANGO_ALLOWED_HOSTS`, PostgreSQL, Redis, or a durable media option is missing. S3 support requires the `django-storages` S3 extra; credentials can be supplied by the host's workload identity instead of static keys. `TRUST_PROXY_SSL_HEADER=True` is safe only when the proxy is trusted and overwrites `X-Forwarded-Proto`. Terminate HTTPS at the edge and forward WebSocket upgrade headers to Daphne. Serve the frontend and `/api`, `/ws`, and `/static` routes through a same-origin proxy where possible. Do not make the media bucket public: downloads should continue to be authorized by the application.

## Release sequence

1. Build and run CI. The workflow runs Django checks/tests and frontend lint/build on pushes and pull requests. Build both Docker images from the repository root and deploy matching backend/frontend revisions.
2. Review the generated `base` migration before applying it: it drops the retired `Room`, `Topic`, and legacy `Message` tables and permanently removes their data. Back up first if any old study-room data needs to be retained.
3. Run `python manage.py check --deploy` with the production environment loaded; resolve every warning for the actual proxy and domain setup. The preload warning is intentionally left for the domain owner to decide after confirming all subdomains can enforce HTTPS.
4. Back up PostgreSQL and media storage, then run `python manage.py migrate --noinput` as a one-off release job.
5. Run `python manage.py collectstatic --noinput` as part of the release; publish `STATIC_ROOT` through the web server or a trusted static-file service. Ensure the deployed proxy can access that exact output (the local Compose stack shares a volume for this purpose).
6. Start the ASGI application with `daphne -b 0.0.0.0 -p 8000 config.asgi:application` (or an equivalent ASGI server).
7. Check `GET /api/health/` from the load balancer. It returns only a generic status and checks PostgreSQL and Redis readiness.
8. Verify WSS through the public proxy with two authorized users, then verify unauthorized subscriptions, disconnect/reconnect recovery, message edit/delete/reaction broadcasts, and delivery while switching channels.
9. Monitor application logs, database/Redis health, upload storage capacity, and WebSocket connection/error rates. Configure a provider-specific error-reporting service before public launch.

The included Compose stack is for local integration only: it uses development credentials, `DEBUG=True`, console email, and local volume storage. It runs migrations at startup to simplify local development; production should run migrations once as a release job before rolling out application instances. Compose is not a production deployment or a replacement for managed backups, TLS, secret storage, and durable shared media.
