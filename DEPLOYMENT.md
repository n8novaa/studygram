# Free-tier deployment guide

This guide targets Vercel (React/Vite), Render (Django/Daphne Docker service), Neon (PostgreSQL), Upstash (Redis), Cloudinary (media), and Brevo (SMTP). Provider free quotas and policies change; confirm current limits and terms in each dashboard before launch. This repository has not been deployed by this guide.

## 1. Protect repository data and credentials

`.env*`, SQLite databases, media, and `workspace_files/` are excluded by `.gitignore` and `.dockerignore`. The existing local `backend/db.sqlite3`, `backend/media`, and `backend/workspace_files` are local data and must be preserved. The current Git index has been cleared of tracked `backend/workspace_files` files without deleting the local copies. Those upload files remain in prior public Git history; removing them from the latest revision does not revoke public access. If any contain private information, restrict/delete the public repository or rewrite history deliberately and coordinate fresh clones. Rotate credentials if a real credential was ever committed.

Never commit `.env`, provider credentials, private keys, database dumps, or user uploads. Configure production secrets only in provider environment-variable settings.

## 2. Create provider resources

1. **Neon:** create a PostgreSQL database and copy its pooled or direct connection string. Keep the TLS query option (`sslmode=require`) in the URL. Use a least-privilege application role; keep the Neon owner credentials private.
2. **Upstash:** create Redis and copy the Redis **TCP** connection string using `rediss://`. Channels Redis requires Redis protocol access; Upstash REST credentials/URLs are not compatible.
3. **Cloudinary:** create an Image & Video product environment and record its cloud name, API key, and API secret. Keep the API secret only in Render's backend environment. The app uploads through Django; no browser upload preset or public attachment URL is used. For the Free plan, enable **Allow delivery of PDF and ZIP files** in the product environment's Security settings so authorized PDF downloads can complete; attachment assets remain `authenticated` and still require signed backend delivery.
4. **Brevo:** verify a sender identity/domain and create SMTP credentials. Use the SMTP login and SMTP key (not an API key) with port 587 and TLS.

Free tiers have quotas, service pauses, and/or ephemeral storage. In particular, Render's free service filesystem is ephemeral and free instances may spin down. Never choose filesystem media storage on Render for user uploads. Check the current plan terms: database, Redis, storage, build minutes, bandwidth, and email quotas can change.

## 3. Deploy the backend to Render

Create a **Web Service** from the repository, choose Docker, set the root/build context to the repository root and Dockerfile to `Dockerfile.backend`. The image binds Daphne to `0.0.0.0:$PORT` (default 10000). Configure these environment variables in Render; substitute actual values without quotes:

```text
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<at-least-50-random-characters>
DJANGO_ALLOWED_HOSTS=<your-render-service-hostname>
DATABASE_URL=<Neon-PostgreSQL-URL-with-sslmode=require>
REDIS_URL=rediss://<Upstash-TCP-credentials-and-host>:6379
MEDIA_STORAGE_BACKEND=cloudinary
CLOUDINARY_CLOUD_NAME=<Cloudinary-cloud-name>
CLOUDINARY_API_KEY=<Cloudinary-API-key>
CLOUDINARY_API_SECRET=<Cloudinary-API-secret>
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<Brevo-SMTP-login>
EMAIL_HOST_PASSWORD=<Brevo-SMTP-key>
DEFAULT_FROM_EMAIL=<verified-sender-address>
FRONTEND_URL=https://<your-vercel-domain>
CORS_ALLOWED_ORIGINS=https://<your-vercel-domain>
CSRF_TRUSTED_ORIGINS=https://<your-vercel-domain>
TRUST_PROXY_SSL_HEADER=True
```

Add any Vercel custom domain to both frontend origin settings (and retain the `https://` scheme). Do not set `DJANGO_ALLOWED_HOSTS=*`; include the Render hostname and any custom API domain. Render terminates HTTPS and supports WebSocket upgrades. The app validates browser origins against `CORS_ALLOWED_ORIGINS`; keep that list exact. `TRUST_PROXY_SSL_HEADER=True` is appropriate behind Render's trusted proxy. Leave HTTPS redirect and secure cookie/HSTS defaults enabled; verify requests and redirects on the deployed domain before enabling HSTS preload.

The service uses Daphne/ASGI; `/ws/workspaces/...` is the WebSocket path. The short-lived signed WebSocket ticket is obtained over authenticated API before connecting. Render must proxy WebSocket upgrades to the same service. The frontend's production socket URL derives `wss:` and host/path from `VITE_API_BASE_URL`.

### Release and migration safety

Do not deploy `compose.yaml` to Render. It is a local development stack and uses `DJANGO_DEBUG=True`, local-only credentials and persistent local volumes. The Docker image runs `python manage.py migrate --noinput` before starting Daphne, so a fresh Neon database is initialized automatically when the Render service starts. This is suitable for the current single-instance Free deployment; review pending migrations and move migration execution to a serialized pre-deploy/release step before scaling to multiple instances. Do not start multiple instances concurrently while they are applying migrations.

Migration `base.0006_remove_room_host_remove_room_participants_and_more` removes the retired `Room`, `Topic`, and legacy `Message` models from Django's migration state, but deliberately performs no database operations. It preserves those tables and any rows they contain. A fresh PostgreSQL database will therefore retain the legacy tables created by earlier migrations as empty, unused tables; applying the migration chain does not delete legacy data. Treat physical cleanup as a separate, explicitly reviewed migration after deciding whether the data must be retained and taking a verified backup. Never use the local SQLite file as the production database or delete it as part of deployment.

## 4. Deploy the frontend to Vercel

Import this repository as a Vite project. Set the **Root Directory** to `frontend`; Vercel should use `npm ci` and `npm run build`, with output directory `dist`. Set the build-time variable:

```text
VITE_API_BASE_URL=https://<your-render-service-hostname>/api
```

Vite embeds this value at build time, so redeploy after changing it. It controls both API requests and WebSocket host/path. The `/api` suffix is required. Vercel serves the SPA; the Render service serves `/api` and `/ws`.

## 5. Static files, uploads, and email

The React app's static assets are served by Vercel. Django collects its own static assets into `STATIC_ROOT` during image build, but the Render Daphne container has no static-file route/proxy configured. The API/frontend do not require these assets, but Django admin may lack styling; arrange an explicit static-file hosting/proxy solution before relying on the admin UI. Do not assume `deploy/nginx.conf` is active in this Vercel + Render topology; it is used by the optional local Compose stack.

Uploaded files use the Django storage adapter backed by Cloudinary. Profile photos use public image delivery to preserve existing avatar URLs. Workspace attachments use the `raw/authenticated` resource and delivery types; the application never returns their Cloudinary URLs, and downloads remain behind the authenticated Django membership-checked endpoint. Render's filesystem is used only for local development when Cloudinary credentials are absent. In production, Cloudinary is the default media backend and missing credentials stop startup with a clear configuration error.

**Cloudinary Free size limitation:** the current Free plan's maximum raw asset size is 10 MB and its 25 monthly credits are shared across storage, bandwidth, and transformations. StudyGram still accepts workspace uploads up to 100 MiB and folder copies up to 200 MiB. The official SDK uses chunked uploads for large transfers, but chunking does not bypass the account's per-asset limit. Files larger than the Cloudinary account limit will be rejected by the provider and the API will return a storage-unavailable response; the application limits are intentionally unchanged. Do not rely on this Free plan for workspace files larger than 10 MB. To support the existing upload limit, use a Cloudinary account whose raw-file allowance is at least 100 MiB (104,857,600 bytes), or retain a private S3-compatible backend for workspace attachments.

Switching storage does not migrate existing media. Django's database rows continue to hold their current storage-relative file names, but newly selected Cloudinary storage cannot read old filesystem/S3 objects until those objects have been copied and verified under matching Cloudinary IDs. Back up and inventory existing media first; no migration is performed automatically. Any files already lost from an ephemeral Render filesystem cannot be recovered by changing the backend.

Brevo SMTP is optional for app operation but required for production password-reset delivery. Verify the sender and use SMTP credentials, not the API key. Send a real reset request only after configuring the production account email and check delivery, spam, and provider logs.

## 6. Smoke checks

Before inviting users:

1. Confirm Render health check `GET https://<api-host>/api/health/` returns healthy.
2. Register, log in, refresh/logout, and request a password reset; confirm email delivery.
3. Create a workspace/channel, connect two authorized clients to the channel, and verify WebSocket message updates and reconnect behavior. Confirm an unauthorized origin/member cannot subscribe.
4. Upload an attachment, confirm its Cloudinary resource/delivery type is `raw/authenticated`, and test authorized download plus denied access from another workspace. Verify a file over 10 MB only with an account whose configured raw-file limit supports it; the Cloudinary Free plan will reject it.
5. Check browser console/network for CORS errors, mixed content, failed `wss://` connections, and API errors. Confirm HTTP redirects to HTTPS.
6. Review Render, Neon, Upstash, Cloudinary, and Brevo logs/quotas and configure backups/alerts appropriate to the data.

## Free-tier limits

Free plans are for evaluation and can pause, sleep, throttle, or impose strict quotas; cold starts and WebSocket disconnections are expected risks. Plan quotas and availability change, so verify them in the dashboards. Do not promise durable backups, always-on realtime, email delivery, or file retention from a free plan. For user data, establish external backups and a paid/managed reliability plan before production use.
