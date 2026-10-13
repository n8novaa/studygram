# StudyGram React client

This React 19 + Vite app is the interface for StudyGram workspaces. Workspace channels provide persistent messaging.

## Run locally

From this directory:

```powershell
npm ci
npm run dev
```

The backend must be running separately. In development, the default API URL is `http://127.0.0.1:8000/api`. Production builds use the same-origin `/api` path by default. To change the URL, create `.env.local` here and set:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

## Commands

```powershell
npm run lint
npm run build
npm run preview
```

The client includes account registration/login/password reset, workspace discovery and management, access requests and invitation redemption, member administration, channels with replies/reactions, and workspace file/folder operations. API modules live in `src/services/`; authentication state is in `src/auth/`.
