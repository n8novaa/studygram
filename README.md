# StudyGram

A collaborative learning workspace where students can create, organize, share, discuss, and improve learning material.

## Architecture

Currently, StudyGram is a monolithic Django application with the following stack:
- **Backend**: Django 5.x
- **API**: Django REST Framework (DRF)
- **Database**: PostgreSQL (via `dj-database-url`) or SQLite for local development.
- **Authentication**: Django session auth for frontend, JWT for API.

## Local Setup

### 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit the `.env` file to include your database configuration and other settings:

```text
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://user:password@localhost:5432/studygram
```
Note: If `DATABASE_URL` is omitted, the app will fall back to SQLite for local development.

### 2. Virtual Environment

Create and activate a virtual environment:

```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Database Migrations

Apply migrations to set up the database schema:

```bash
python manage.py migrate
```

### 5. Run the Development Server

Start the Django development server:

```bash
python manage.py runserver
```
Visit `http://127.0.0.1:8000` to view the application.

## Testing

Run the test suite:

```bash
python manage.py test base.tests
```

## API Overview

The API is located under the `/api/v1/` namespace and requires JWT authentication (unless the endpoint specifies otherwise).

### Endpoints

- **Auth**:
  - `POST /api/v1/auth/register/`: Register a new user.
  - `POST /api/v1/auth/token/`: Obtain JWT access and refresh tokens.
  - `POST /api/v1/auth/token/refresh/`: Refresh an expired access token.
  - `GET /api/v1/auth/me/`: Get current authenticated user details.
- **Rooms**:
  - `GET /api/v1/rooms/`: List rooms (paginated, supports `?q=` search).
  - `POST /api/v1/rooms/`: Create a new room.
  - `GET /api/v1/rooms/<id>/`: Retrieve room details (including participants).
  - `PATCH /api/v1/rooms/<id>/`: Update a room (requires host permission).
  - `DELETE /api/v1/rooms/<id>/`: Delete a room (requires host permission).
- **Messages**:
  - `GET /api/v1/rooms/<room_id>/messages/`: List messages in a room.
  - `POST /api/v1/rooms/<room_id>/messages/`: Add a message to a room.
  - `DELETE /api/v1/messages/<id>/`: Delete a message (requires author permission).
- **Topics**:
  - `GET /api/v1/topics/`: List topics.
- **Users**:
  - `GET /api/v1/users/`: List users.

## Future Roadmap
- Phase 2: React + Vite frontend consuming the DRF API.
- Phase 3: Workspace and Document models.
- Phase 4: Real-time features with Django Channels.
