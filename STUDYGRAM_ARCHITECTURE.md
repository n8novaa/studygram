# StudyGram Architecture Document

> Last updated: August 2026  
> Status: v1 cleanup complete — foundation for v2 evolution

---

## 1. Current Architecture

StudyGram (formerly scaffolded as "StudyBuddy") is a **server-rendered Django web application** with light client-side JavaScript. It is **not** React-based and **does not** use Django REST Framework, Channels, or Redis today.

### What the application does today

The current product is a **study-room discussion forum** (similar in shape to a simplified Discord/Slack clone):

| Feature | Description |
|---------|-------------|
| Authentication | Register, login, logout (Django `User` + session auth) |
| Study rooms | Create, read, update, delete rooms |
| Topics | Categorize rooms by topic (e.g. "Python", "Math") |
| Messages | Post messages inside a room; delete own messages |
| Participants | Users who post in a room are tracked as participants |
| Profiles | View a user's hosted rooms and message activity |
| Search | Filter rooms/messages on the home page by query string |
| Activity feed | Global and sidebar views of recent messages |

### Request flow

```text
Browser
  │
  ▼
Django URL router (config/urls.py → base/urls.py)
  │
  ▼
View function (base/views.py)
  │
  ├── Query/update models (base/models.py)
  └── Render Django template (base/templates/ + templates/)
        │
        └── Extends main.html → includes navbar.html + static assets
```

### UI stack

- **Templates:** Django template language (DTL)
- **Layout:** Component-style partials (`*_component.html`) included from page templates
- **CSS:** Single stylesheet at `static/styles/style.css`
- **JavaScript:** Minimal vanilla JS in `static/js/script.js` (dropdown menu, avatar preview, scroll-to-bottom in rooms)
- **No** npm/webpack/Vite, **no** SPA framework

---

## 2. Current File Structure

```text
studygram/
├── manage.py                 # Django CLI entry point
├── requirements.txt          # Backend dependencies (Django only)
├── .env.example              # Environment variable template
├── .gitignore                # Excludes secrets, cache, DB, artifacts
├── db.sqlite3                # Local SQLite database (gitignored)
│
├── config/                   # Django project package
│   ├── settings.py           # App, DB, static, middleware config
│   ├── urls.py               # Root URL → includes base.urls
│   ├── wsgi.py               # WSGI entry (production HTTP)
│   └── asgi.py               # ASGI entry (future WebSockets)
│
├── base/                     # Single Django app (all domain logic today)
│   ├── models.py             # Topic, Room, Message
│   ├── views.py              # All page views (function-based)
│   ├── urls.py               # App URL patterns
│   ├── forms.py              # RoomForm, UserForm
│   ├── admin.py              # Model registration
│   ├── apps.py               # App config
│   ├── tests.py              # Empty — no tests yet
│   ├── migrations/           # Database migration history
│   └── templates/base/       # App-specific templates
│       ├── home.html
│       ├── room.html
│       ├── profile.html
│       ├── room_form.html
│       ├── delete.html
│       ├── login_register.html
│       ├── update-user.html
│       ├── topics.html
│       ├── activity.html
│       ├── feed_component.html      # Reusable room list partial
│       ├── topics_component.html    # Reusable topic sidebar partial
│       └── activity_component.html  # Reusable activity feed partial
│
├── templates/                # Project-level templates
│   ├── main.html             # Base layout (CSS, JS, navbar, messages)
│   └── navbar.html           # Header, search, auth menu
│
└── static/
    ├── styles/style.css      # All application styles
    ├── js/script.js          # Minimal UI behavior
    └── images/               # SVG icons and logo
```

### File classification summary

| Path | Status | Notes |
|------|--------|-------|
| `base/` | **KEEP** | Entire app; will be split/refactored in v2 |
| `config/` | **KEEP** | Standard Django project config |
| `templates/main.html` | **KEEP** | Base layout |
| `templates/navbar.html` | **KEEP** | Refactor branding/UX later |
| `static/` | **KEEP** | Replace incrementally when React arrives |
| `*_component.html` | **KEEP** | Good partial pattern; reusable in API era as reference |
| `base/tests.py` | **REFACTOR** | Add tests before major changes |
| `db.sqlite3` | **LOCAL ONLY** | Never commit; migrate to PostgreSQL later |

---

## 3. Existing Data Model

```text
django.contrib.auth.models.User  (built-in)
        │
        ├── host ──────────────► Room (FK, SET_NULL)
        ├── participants ◄──────► Room (M2M, blank)
        ├── message.user ──────► Message (FK, CASCADE)
        └── room via host FK

Topic
  │
  └── room.topic ──────────────► Room (FK, SET_NULL)

Room
  │
  └── message.room ────────────► Message (FK, CASCADE)
```

### Model details

#### `Topic`
| Field | Type | Notes |
|-------|------|-------|
| `name` | CharField(200) | No uniqueness constraint — duplicates possible |

#### `Room`
| Field | Type | Notes |
|-------|------|-------|
| `host` | FK → User, SET_NULL | Nullable; orphaned rooms if user deleted |
| `topic` | FK → Topic, SET_NULL | Nullable |
| `name` | CharField(200) | |
| `description` | TextField, optional | |
| `participants` | M2M → User | Auto-added when user posts |
| `updated` | DateTimeField, auto_now | Drives default ordering |
| `created` | DateTimeField, auto_now_add | |

#### `Message`
| Field | Type | Notes |
|-------|------|-------|
| `user` | FK → User, CASCADE | |
| `room` | FK → Room, CASCADE | |
| `body` | TextField | Plain text only |
| `updated` | DateTimeField, auto_now | |
| `created` | DateTimeField, auto_now_add | |

### Reuse potential for v2

| Current concept | Future mapping |
|-----------------|----------------|
| `User` | Stays; extend with profile model later |
| `Topic` | Could evolve into **subject/tag** taxonomy |
| `Room` | **Temporary** — maps loosely to "discussion space"; will be replaced by Workspace/Document |
| `Message` | **Temporary** — maps to comments/discussion threads |
| `participants` | Pattern reusable for workspace membership |

### Model problems (do not fix yet — document for migration)

- `Topic.name` has no `unique=True` → duplicate topics from typos/casing
- `Room`/`Message` naming is chat-centric, not learning-platform-centric
- No soft deletes, no audit trail, no permissions model beyond host/owner checks
- No database indexes beyond PKs/FKs
- SQLite only — fine for dev, not for production scale

---

## 4. Problems Found

### Critical

| Issue | Location | Impact |
|-------|----------|--------|
| Hardcoded `SECRET_KEY` was in source | `config/settings.py` (fixed) | Key exposure if repo is public |
| No production security baseline | `DEBUG=True` default, empty `ALLOWED_HOSTS` | Unsafe if deployed as-is |

### High

| Issue | Location | Impact |
|-------|----------|--------|
| `room` view had no auth check on POST | `base/views.py` (fixed) | Anonymous users could trigger errors / unintended behavior |
| Authorization via string `HttpResponse` | `updateRoom`, `deleteRoom`, `deleteMessage` | Should return 403/404, not plain text |
| User enumeration on login | `loginPage` | Different messages for missing user vs wrong password |
| Bare `except` on login | `loginPage` (fixed) | Was masking unexpected errors |
| No `requirements.txt` existed | repo root (fixed) | Unreproducible environments |
| `.gitignore` was deleted | repo root (fixed) | Risk of committing secrets/DB/cache |

### Medium

| Issue | Location | Impact |
|-------|----------|--------|
| N+1 queries in templates | `feed_component.html`, `topics_component.html` | Extra DB hits per room/topic |
| Forms defined but bypassed | `createRoom`, `updateRoom` | No server-side validation on room fields |
| `deleteMessage` redirects to `home` | `base/views.py` | Poor UX; should return to room |
| `RoomForm` uses `fields='__all__'` + `exclude` | `base/forms.py` | Redundant/confusing |
| No tests | `base/tests.py` | Regressions undetected |
| Branding inconsistency | Templates say "study partner" copy | UX doesn't match StudyGram vision yet |
| `topics` sidebar shows slice `[0:5]` but count may be wrong | `home` view + `topics_component.html` | Misleading topic counts |
| External avatar URLs hardcoded | Multiple templates | Privacy/availability dependency |

### Low

| Issue | Location | Impact |
|-------|----------|--------|
| Commented dead code | `views.py`, `script.js`, `navbar.html` | Noise for readers |
| `register` URL missing trailing slash | `base/urls.py` | Minor inconsistency |
| `pk` typed as `str` in URLs | `base/urls.py` | Works but unconventional |
| ASGI/WSGI referred to "demoStudy" | config (fixed) | Confusing project name |
| Broken duplicate `<script>` in room.html | `room.html` (fixed) | 404 on `script.js` relative path |
| No README | repo root | Onboarding friction |

---

## 5. Files Removed

| File | Reason | What depended on it |
|------|--------|---------------------|
| `base/templates/base/home_old.html` | Superseded by `home.html` | Nothing — no imports or URL references |
| `base/templates/base/room_old.html` | Superseded by `room.html` | Nothing |
| `base/templates/base/profile_old.html` | Superseded by `profile.html` | Nothing |
| `base/templates/base/delete_old.html` | Superseded by `delete.html` | Nothing |
| `base/templates/base/login_register_old.html` | Superseded by `login_register.html` | Nothing |
| `base/templates/base/room_form_old.html` | Superseded by `room_form.html` | Nothing |
| `studygram.zip` | Accidental archive artifact | Nothing |
| `static/styles/main.css` | Already deleted in working tree; superseded by `style.css` | Nothing (not referenced) |
| `base/temp_auth_views.py` | Already deleted in working tree; experimental duplicate auth | Nothing |

---

## 6. Files Kept but Marked for Refactoring

| File / area | Why kept | Refactor later |
|-------------|----------|----------------|
| `base/views.py` (monolithic) | All routes work | Split into views per domain; add class-based or DRF views |
| `base/models.py` (Room/Message/Topic) | Existing data & migrations | Replace with Workspace/Document/Comment models via migration plan |
| `base/forms.py` | Used by update-user and partially by room forms | Align create/update room to actually use forms |
| `*_component.html` partials | DRY template pattern | May become React components |
| `static/styles/style.css` | Entire UI depends on it | Design system / component library in React |
| `templates/navbar.html` | Global navigation | Rebuild as React layout with auth state from API |
| `base/admin.py` | Basic model admin | Extend when models grow |

---

## 7. Technical Debt

1. **Single app (`base`)** holds everything — acceptable for now, split before v2 features grow
2. **No API layer** — frontend is coupled to Django templates
3. **No permission system** — only ad-hoc `request.user == host` checks
4. **No pagination** — home, activity, topics load all records
5. **No full-text search** — simple `icontains` filters only
6. **SQLite** — dev-only assumption
7. **Zero automated tests**
8. **No CI/CD configuration**
9. **No Docker/deployment manifests**
10. **Chat-domain naming** (`Room`, `Message`) will require careful migration naming

---

## 8. Recommended Future Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    React SPA (Vite)                      │
│  Workspace UI · Document editor · Social · Notifications │
└───────────────────────────┬─────────────────────────────┘
                            │ REST (+ WebSocket for realtime)
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Django + Django REST Framework              │
│  ┌─────────┐ ┌────────────┐ ┌──────────┐ ┌────────────┐ │
│  │  users  │ │ workspaces │ │ documents│ │  social    │ │
│  └─────────┘ └────────────┘ └──────────┘ └────────────┘ │
│                          │                               │
│              Django Channels (async consumers)           │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        PostgreSQL                      Redis
     (primary data)            (cache, sessions, channel layer)

                            │
                            ▼
                   AI service layer (later)
              summarization · RAG · flashcards · Q&A
```

### Migration strategy from current codebase

| Current | Evolution |
|---------|-----------|
| `base` app | Split into `users`, `workspaces`, `documents`, `social` apps |
| Session auth + templates | JWT/session API auth + React |
| `Topic` | Tags/subjects on documents and workspaces |
| `Room` | Deprecate → `Workspace` or `Discussion` |
| `Message` | Deprecate → `Comment` or `DiscussionMessage` |
| `participants` M2M | `WorkspaceMember` with roles |
| SQLite | PostgreSQL via `dj-database-url` |
| — | Redis for Channels + caching |
| — | Celery for AI/async jobs (optional later) |

---

## 9. Recommended Development Order

### Phase 1 — Foundation (Completed)
- [x] Repository audit and cleanup
- [x] README with local setup instructions
- [x] Fix high-priority security items (403 responses, login messages)
- [x] Add basic tests for auth and room CRUD
- [x] Environment-based settings validated for production

### Phase 2 — REST API (Completed)
- [x] Add Django REST Framework
- [x] Token/JWT authentication API
- [x] Serializers for existing models (temporary compatibility layer)
- [x] API versioning (`/api/v1/`)

### Phase 3 — React frontend
- Vite + React scaffold (separate folder or repo)
- Auth flow against API
- Replace home/room/profile pages incrementally

### Phase 4 — Workspace / document system
- New models: `Workspace`, `Folder`, `Document`
- Rich content storage strategy (Markdown, blocks, or ProseMirror)
- File uploads

### Phase 5 — Sharing and permissions
- Workspace membership roles (owner, editor, viewer)
- Document sharing links
- Visibility controls

### Phase 6 — Comments and discussions
- Migrate from `Message`/`Room` patterns
- Threaded comments on documents

### Phase 7 — Real-time communication
- Django Channels + Redis
- Live discussion updates, presence, notifications

### Phase 8 — AI integration
- Backend service abstraction for LLM calls
- Summarization, explanation, question generation

### Phase 9 — RAG
- Document embedding pipeline
- Vector store integration
- Context-aware Q&A over user documents

### Phase 10 — Production hardening
- PostgreSQL, HTTPS, static/media on CDN
- Monitoring, logging, backups
- Security audit and load testing

---

## Appendix: URL Map

| URL | View | Auth |
|-----|------|------|
| `/` | `home` | Public |
| `/login/` | `loginPage` | Public |
| `/logout/` | `logoutUser` | Public |
| `/register` | `registerPage` | Public |
| `/room/<pk>/` | `room` | Public read; login required to post |
| `/profile/<pk>/` | `userProfile` | Public |
| `/create-room/` | `createRoom` | Login required |
| `/update-room/<pk>/` | `updateRoom` | Login + host only |
| `/delete-room/<pk>/` | `deleteRoom` | Login + host only |
| `/delete-message/<pk>/` | `deleteMessage` | Login + author only |
| `/update-user/` | `updateUser` | Login required |
| `/topics/` | `topicsPage` | Public |
| `/activity/` | `activityPage` | Public |
| `/admin/` | Django admin | Staff |
