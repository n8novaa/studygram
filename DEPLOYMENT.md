# Free-tier deployment guide

This guide targets Vercel (React/Vite), Render (Django/Daphne Docker service), Neon (PostgreSQL), Upstash (Redis), Brevo (SMTP), and Cloudflare R2 (private uploads). Provider free quotas and policies change; confirm current limits and terms in each dashboard before launch. This repository has not been deployed by this guide.

## 1. Protect repository data and credentials

`.env*`, SQLite databases, media, and `workspace_files/` are excluded by `.gitignore` and `.dockerignore`. The existing local `backend/db.sqlite3`, `backend/media`, and `backend/workspace_files` are local data and must be preserved. The current Git index has been cleared of tracked `backend/workspace_files` files without deleting the local copies. Those upload files remain in prior public Git history; removing them from the latest revision does not revoke public access. If any contain private information, restrict/delete the public repository or rewrite history deliberately and coordinate fresh clones. Rotate credentials if a real credential was ever committed.

Never commit `.env`, provider credentials, private keys, database dumps, or user uploads. Configure production secrets only in provider environment-variable settings.

## 2. Create provider resources

1. **Neon:** create a PostgreSQL database and copy its pooled or direct connection string. Keep the TLS query option (`sslmode=require`) in the URL. Use a least-privilege application role; keep the Neon owner credentials private.
2. **Upstash:** create Redis and copy the Redis **TCP** connection string using `rediss://`. Channels Redis requires Redis protocol access; Upstash REST credentials/URLs are not compatible.
3. **R2:** create a private bucket, block public access, enable the S3 API, and create scoped credentials for this bucket. Record its endpoint, access key, secret, and region (R2 commonly uses `auto`). Configure CORS on the bucket only if direct browser downloads/uploads are later introduced; current app downloads pass through the API.
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
MEDIA_STORAGE_BACKEND=s3
AWS_STORAGE_BUCKET_NAME=<private-R2-bucket>
AWS_S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=<R2-scoped-access-key>
AWS_SECRET_ACCESS_KEY=<R2-secret>
AWS_S3_REGION_NAME=auto
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

Do not deploy `compose.yaml` to Render. It is a local development stack and uses `DJANGO_DEBUG=True`, local-only credentials and persistent local volumes. Configure a Render pre-deploy command (if available for the selected plan) or a one-off shell/release task to run `python manage.py migrate --noinput` once, then deploy the web service. Do not run migrations concurrently in multiple instances.

Migration `base.0006_remove_room_host_remove_room_participants_and_more` deletes the retired `Room`, `Topic`, and legacy `Message` models/tables and their data. On an empty new PostgreSQL database, applying the full migration chain creates the old tables and later removes them; this is safe for a fresh install. Do not point it at an existing database containing data you need. Back up and decide whether to export/retain any legacy records before applying it. Never use the local SQLite file as the production database or delete it as part of deployment.

## 4. Deploy the frontend to Vercel

Import this repository as a Vite project. Set the **Root Directory** to `frontend`; Vercel should use `npm ci` and `npm run build`, with output directory `dist`. Set the build-time variable:

```text
VITE_API_BASE_URL=https://<your-render-service-hostname>/api
```

Vite embeds this value at build time, so redeploy after changing it. It controls both API requests and WebSocket host/path. The `/api` suffix is required. Vercel serves the SPA; the Render service serves `/api` and `/ws`.

## 5. Static files, uploads, and email

The React app's static assets are served by Vercel. Django collects its own static assets into `STATIC_ROOT` during image build, but the Render Daphne container has no static-file route/proxy configured. The API/frontend do not require these assets, but Django admin may lack styling; arrange an explicit static-file hosting/proxy solution before relying on the admin UI. Do not assume `deploy/nginx.conf` is active in this Vercel + Render topology; it is used by the optional local Compose stack.

Uploaded files use Django storage. Use the configured S3-compatible backend and private R2 bucket for persistent uploads. Settings enable signed URLs and disable public ACLs. Validate upload, download, and permission behavior with a non-public object after deployment. Render's local filesystem is ephemeral; filesystem storage is suitable only for development or a genuinely durable mounted volume.

Brevo SMTP is optional for app operation but required for production password-reset delivery. Verify the sender and use SMTP credentials, not the API key. Send a real reset request only after configuring the production account email and check delivery, spam, and provider logs.

## 6. Smoke checks

Before inviting users:

1. Confirm Render health check `GET https://<api-host>/api/health/` returns healthy.
2. Register, log in, refresh/logout, and request a password reset; confirm email delivery.
3. Create a workspace/channel, connect two authorized clients to the channel, and verify WebSocket message updates and reconnect behavior. Confirm an unauthorized origin/member cannot subscribe.
4. Upload a file, confirm it is private in R2, and test authorized download plus denied access from another workspace.
5. Check browser console/network for CORS errors, mixed content, failed `wss://` connections, and API errors. Confirm HTTP redirects to HTTPS.
6. Review Render, Neon, Upstash, R2, and Brevo logs/quotas and configure backups/alerts appropriate to the data.

## Free-tier limits

Free plans are for evaluation and can pause, sleep, throttle, or impose strict quotas; cold starts and WebSocket disconnections are expected risks. Plan quotas and availability change, so verify them in the dashboards. Do not promise durable backups, always-on realtime, email delivery, or file retention from a free plan. For user data, establish external backups and a paid/managed reliability plan before production use.
