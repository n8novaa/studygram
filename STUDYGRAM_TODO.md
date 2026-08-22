# StudyGram Development Roadmap

> Living document — update as priorities shift.  
> Do **not** treat items in LATER/FUTURE as approved for immediate work.

---

## NOW

Foundation cleanup and stabilization (v1 → clean base).

- [x] Full repository audit
- [x] Remove obsolete `*_old.html` templates and `studygram.zip`
- [x] Restore `.gitignore`
- [x] Add `requirements.txt` and `.env.example`
- [x] Move secrets/config toward environment variables
- [x] Fix room POST auth guard and login bare `except`
- [x] Fix broken script tag in `room.html`
- [x] Align branding to StudyGram in base layout
- [x] Document architecture (`STUDYGRAM_ARCHITECTURE.md`)
- [x] Add `README.md` with local setup (venv, migrate, runserver)
- [x] Return proper HTTP 403/404 instead of plain-text denial messages
- [x] Unify login error messages (prevent user enumeration)
- [x] Use `RoomForm` validation in create/update room views
- [x] Add `unique=True` on `Topic.name` (requires migration + data cleanup plan)
- [x] Write initial tests: auth, room CRUD, message permissions
- [x] Add query optimization (`select_related` / `prefetch_related`) on home and room views
- [x] Fix `deleteMessage` redirect to return to the room

---

## NEXT

API layer and project structure — still no React or AI.

- [x] Install and configure Django REST Framework
- [x] Create `/api/v1/` URL namespace
- [x] JWT or token authentication for API
- [x] Serializers for User, Topic, Room, Message (compatibility layer)
- [x] Split `base` app planning: identify boundaries for `users`, `workspaces`, etc.
- [x] Add PostgreSQL support via environment (`DATABASE_URL`)
- [x] Pagination on list endpoints and views
- [x] CORS configuration for future frontend
- [x] Basic CI (run `manage.py check` + tests on push)

---

## LATER

Core product features — workspace-centric learning platform.

- [ ] Scaffold React + Vite frontend
- [ ] Replace Django-template pages incrementally
- [ ] Design and implement `Workspace` model
- [ ] Design and implement `Folder` and `Document` models
- [ ] Document content format decision (Markdown vs block editor)
- [ ] File/image upload pipeline
- [ ] Workspace membership and roles
- [ ] Document sharing (link + member-based)
- [ ] Comments on documents (replace chat-style messages)
- [ ] Discussion threads (evolve from rooms)
- [ ] Notification model and in-app notifications
- [ ] User profile extensions (avatar upload, bio, field of study)
- [ ] Subject/topic taxonomy (evolve from `Topic`)
- [ ] Search improvements (PostgreSQL full-text or dedicated search)
- [ ] Deprecate and migrate away from `Room` / `Message` models

---

## FUTURE

Advanced capabilities — only after workspace/document foundation exists.

- [ ] Django Channels + Redis for real-time updates
- [ ] Direct messaging between users
- [ ] Live collaborative editing
- [ ] AI summarization service
- [ ] AI explanation / tutoring mode
- [ ] Question generation from documents
- [ ] Flashcard generation and review
- [ ] RAG pipeline over user documents
- [ ] Knowledge-gap detection
- [ ] Study planner / spaced repetition
- [ ] Production deployment (Docker, HTTPS, monitoring)
- [ ] Mobile-responsive redesign or native apps

---

## Quick reference: what NOT to build yet

These are explicitly out of scope until their phase:

| Feature | Wait until |
|---------|------------|
| React UI | Phase 3 / NEXT–LATER boundary |
| WebSockets / Channels | LATER (after API + workspace) |
| AI / RAG / flashcards | FUTURE |
| PostgreSQL (required) | NEXT (optional in dev until then) |
| Microservices | Not planned — keep monolith Django backend |
