# StudyGram

StudyGram is a collaborative learning app for organizing study groups. The product is a React single-page app backed by a Django REST Framework API. The earlier study-room feature has been retired; workspace channels provide the messaging experience.

## Current features

- Account registration, JWT sign-in/refresh/sign-out, and password reset
- Public and private workspaces with discovery, search, and visibility controls
- Membership requests, invitations, member roles, and admin tools
- Workspace channels with editable messages, replies, and emoji reactions
- Real-time channel message updates over WebSockets, with reconnect and REST fallback
- Nested folders and shared file uploads/downloads
- Workspace navigation that exposes channels and nested folders for the selected workspace

## Requirements

- Python 3.10 or newer
- Node.js 20.19+ or 22.12+ for Vite 8
- SQLite for local development, or PostgreSQL through `DATABASE_URL`

## Local setup

From the repository root, create `backend/.env` using the root `.env.example` as a reference. The Django settings load that file. Keep real keys and email credentials private.

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. During development the frontend sends API requests to `http://127.0.0.1:8000/api` by default. Production builds use the same-origin `/api` path unless `VITE_API_BASE_URL` is configured for a separate API host. Set `VITE_API_BASE_URL` in `frontend/.env.local` to override the development URL, for example `http://127.0.0.1:8000/api`.

The Django app uses SQLite if `DATABASE_URL` is unset. The local channel layer works in one backend process; set `REDIS_URL` to a shared Redis instance when running multiple workers or application instances so they can broadcast messages to one another. Password reset is requested with the account username and delivered to that account's saved email. In `DEBUG=True`, reset emails are printed in the backend console by default. To deliver to a real inbox locally, set `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` in `backend/.env` and configure valid SMTP credentials and `FRONTEND_URL`. Gmail SMTP normally requires an app password when two-step verification is enabled; a normal Gmail login password will not work.

Deploy the backend with an ASGI server so WebSocket connections are supported. For example, from `backend/`, run `daphne -b 0.0.0.0 -p 8000 config.asgi:application`. A WSGI-only deployment will serve the REST API but cannot serve real-time channel connections.

## Containerized local stack

Docker Compose starts PostgreSQL, Redis, Django/Daphne, and Nginx with the React app. It is configured for local development (`DEBUG=True`, console email, local-only passwords) and must not be exposed directly as a production deployment.

```powershell
docker compose up --build
```

Open `http://localhost:8080`. The app is served through the Nginx proxy, including WebSocket upgrades. PostgreSQL, Redis, uploaded media, and Django static files use named volumes. Production environment requirements and hosting notes are in [DEPLOYMENT.md](DEPLOYMENT.md).

## Environment variables

See `.env.example` for the available settings:

- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`
- `DATABASE_URL` (optional in development; SQLite is the default)
- `REDIS_URL` (required with `DEBUG=False`)
- `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
- `DJANGO_MEDIA_ROOT`, `DJANGO_LOG_LEVEL`, `TRUST_PROXY_SSL_HEADER`
- `FRONTEND_URL`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`

## Checks and tests

Run backend checks and the full test suite from `backend/`:

```powershell
python manage.py check
python manage.py test
```

Run the frontend static checks and production build from `frontend/`:

```powershell
npm run lint
npm run build
```

## Project layout

- `backend/base/`: authentication, account, health, and password-reset API functionality (the current API prefix is `/api/`)
- `backend/workspaces/`: workspace, membership, invitation, channel, message, and reaction domain
- `backend/files/`: workspace folders and file API
- `frontend/src/`: React routes, UI components, auth, and API service modules

For data models, endpoint groups, and the relationship between the new and legacy experiences, see [STUDYGRAM_ARCHITECTURE.md](STUDYGRAM_ARCHITECTURE.md).
