# StudyGram architecture

## Current application

StudyGram is a Django monolith with a REST API and a separate React/Vite client. The React client is the primary workspace product. The Django template UI remains available as a legacy study-room feature; it is not the React app's shell.

```text
React + Vite (frontend/)
  └── HTTP requests with JWT access token
      └── Django REST Framework (backend/)
          ├── base: accounts, auth endpoints, topics, rooms, messages
          ├── workspaces: workspaces, memberships, requests, invites, channels
          └── files: workspace folders, uploads, downloads

Browser → Django template views at `/` for the legacy room experience
```

The current API base is `/api/` (there is no `/api/v1/` prefix yet). Django uses SQLite by default for development and accepts PostgreSQL through `DATABASE_URL`. The Vite client defaults to `http://127.0.0.1:8000/api`; configure `VITE_API_BASE_URL` when the backend runs elsewhere.

## Domain model overview

- **Workspace** belongs to an owner and has public/private visibility.
- **WorkspaceMembership** associates users with a workspace and an `admin` or `member` role. A uniqueness constraint prevents duplicate memberships.
- **WorkspaceJoinRequest** tracks pending, approved, and rejected private-workspace requests.
- **WorkspaceInvitation** has a random token, expiry, optional use limit, use counter, and revocation timestamp.
- **WorkspaceChannel** belongs to a workspace; channel names are unique per workspace.
- **WorkspaceChannelMessage** belongs to a channel and user. Messages can reply to another message in the same channel.
- **WorkspaceChannelMessageReaction** stores one selected emoji per user per message.
- **WorkspaceFolder** supports nested folders; **WorkspaceFile** belongs to a workspace and optionally to a folder.
- **Room**, **Topic**, and **Message** support the retained study-room application.

## Main API groups

All routes below are relative to `/api/`.

| Area | Route family | Purpose |
|---|---|---|
| Auth | `auth/register/`, `auth/token/`, `auth/token/refresh/`, `auth/logout/`, `auth/me/` | Register, obtain/refresh JWTs, blacklist refresh token, identify caller |
| Password reset | `auth/password-reset/`, `auth/password-reset/confirm/` | Request a reset by username; link goes to the email saved on that account |
| Workspaces | `workspaces/`, `workspaces/<id>/`, `workspaces/discover/` | CRUD for owned/member workspaces and workspace discovery |
| Access | `workspaces/<id>/join/`, `join-requests/`, `invitations/`, `members/` | Join lifecycle, invitation redemption, and role/member management |
| Channels | `workspaces/<id>/channels/` and nested `messages/` | Channel and message lifecycle, replies, reactions |
| Files | `workspaces/<id>/folders/` and `files/` | Folder navigation, file upload, metadata, download, delete |
| Legacy rooms | `rooms/`, `rooms/<id>/messages/`, `messages/` | Study-room CRUD and discussions |

Authentication is JWT-based for the React client. The backend also retains Django session authentication for browsable API and legacy template views. Workspace and file endpoints enforce membership and role checks server-side; frontend visibility is only a UI aid.

## Frontend structure

- `src/App.jsx`: route tree and public/protected route grouping
- `src/auth/`: JWT session state and auth service functions
- `src/pages/`: dashboard, workspace, discovery, room, and account pages
- `src/components/workspace/`: workspace overview, members, files, and channels
- `src/services/`: API calls organized by feature
- `src/styles/`: global, page, layout, and component styles

The refresh token is persisted in `localStorage`; access tokens are held in React state. This keeps the local app simple, but JavaScript-accessible token storage is a security tradeoff to revisit before a public production deployment.

## Local email and media behavior

When `DEBUG=True`, Django uses the console email backend by default, so password-reset links appear in the backend terminal. Set `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend` to send real email during local development. Configure SMTP settings and `FRONTEND_URL` for delivery. Uploaded files use Django's configured media storage (`backend/media/` locally); production should use a persistent private storage service and serve downloads through the authorized API endpoint.

## Known next steps

- Add frontend tests for authentication, invitation acceptance, and the main workspace flows.
- Decide whether to retire the server-rendered room UI or make its relationship to the React product more explicit.
- Define deployment-specific media storage, HTTPS/security settings, and email configuration.
- Consider short-lived access tokens and an HttpOnly refresh-cookie strategy for a deployed app.
