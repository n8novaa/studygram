# StudyGram Development Roadmap

**Purpose:** Track the current StudyGram development cycle, including the transition from polling-based messaging to production-grade real-time communication.

**Working approach:** Make one logically isolated change at a time. Inspect the existing implementation, identify exact files, implement the change, run relevant tests, verify existing behavior, and proceed only after confirmation.

## Current State

Based on the supplied code audit:

| Area                    | Current implementation                                | Status                               |
| ----------------------- | ----------------------------------------------------- | ------------------------------------ |
| Frontend                | React + Vite                                          | Implemented                          |
| Backend                 | Django + Django REST Framework                        | Implemented                          |
| Authentication          | JWT                                                   | Implemented                          |
| Database                | Persistent relational storage                         | Implemented                          |
| Workspaces              | Creation, discovery, membership and access management | Implemented                          |
| Channels                | Workspace channels and message history                | Implemented                          |
| Messaging               | Send, edit, delete, replies and reactions             | Implemented                          |
| Message updates         | HTTP polling                                          | Functional, but inefficient at scale |
| File management         | Workspace folders, files and uploads                  | Implemented                          |
| Real-time communication | WebSocket-based messaging                             | Not implemented                      |
| Production hardening    | Security, performance and deployment verification     | Incomplete                           |

> This is a roadmap, not a claim that every item has already been verified in a live production environment.

---

## Phase 1 — Security and Backend Stabilization

**Objective:** Address important backend risks before introducing new infrastructure.

### Tasks

- [ ] Restrict workspace discovery so private workspace metadata is not exposed unintentionally.
- [ ] Review user API permissions and prevent unauthorized exposure of user email addresses.
- [ ] Remove development-only security defaults from production configuration.
- [ ] Review workspace, channel and message authorization.
- [ ] Add validation to prevent circular folder hierarchies.
- [ ] Decide whether invitation links should be reusable or single-use.
- [ ] Verify existing API behavior and backend tests.

### Completion criteria

- [ ] Private data is not exposed through public endpoints.
- [ ] Authorization is enforced at the appropriate resource level.
- [ ] Existing workspace, file and messaging functionality remains intact.
- [ ] Relevant backend tests pass.

**Priority:** High.

## Phase 2 — Finish the Current Messaging Experience

**Objective:** Make the existing messaging system functionally complete before changing its transport mechanism.

### Tasks

- [ ] Resolve remaining channel interface issues.
- [ ] Test message actions: edit, delete, replies and reactions.
- [ ] Verify message pagination and history loading.
- [ ] Fix stale polling responses and overlapping polling requests.
- [ ] Test channel switching and ensure responses from a previous channel cannot overwrite the current channel's state.
- [ ] Test file attachments and message permissions.
- [ ] Test responsive behavior and touchscreen accessibility.

### Completion criteria

- [ ] Existing messaging features work consistently.
- [ ] Switching channels does not produce stale or incorrect messages.
- [ ] Existing behavior is documented and covered by relevant tests.
- [ ] The application is stable enough to serve as a baseline for the real-time migration.

**Scope rule:** Do not add unrelated messaging features during this phase.

## Phase 3 — Introduce Real-Time Backend Infrastructure

**Objective:** Replace polling-based message delivery with a persistent, event-driven communication system.

### Target architecture

```text
React frontend
    |
    | HTTP / WebSocket
    v
Django REST Framework + Django Channels (ASGI)
    |
    +---- REST APIs and WebSocket consumers
    |
    +---- Redis channel layer (event distribution)
    |
    +---- PostgreSQL (persistent application data)
```

- **React + Vite:** Messaging interface and WebSocket client.
- **Django REST Framework:** Authentication, history, workspace operations and conventional API requests.
- **Django Channels:** Persistent WebSocket connections and real-time message delivery.
- **ASGI-compatible server:** Handles HTTP and WebSocket connections.
- **Redis:** Distributes events between consumers and application instances; it is not the permanent message database.
- **PostgreSQL:** Stores persistent messages, users, channels and related records.
- **JWT authentication:** Integrate the existing authentication system with WebSocket connection authentication.
- **Deployment infrastructure:** Must support ASGI, WebSockets and Redis.

### Tasks

- [ ] Add Django Channels and required dependencies.
- [ ] Configure Django's ASGI application.
- [ ] Introduce Redis as the channel layer.
- [ ] Implement authenticated WebSocket connections.
- [ ] Validate that a connected user can access the requested workspace channel.
- [ ] Implement channel groups so authorized members receive the appropriate events.
- [ ] Define a consistent event format for message creation, editing, deletion and reactions.
- [ ] Persist messages in the existing database.
- [ ] Broadcast events only after successful persistence.
- [ ] Test multiple users connected to the same channel.

### Completion criteria

- [ ] Authorized users can establish WebSocket connections.
- [ ] New messages appear without periodic HTTP polling.
- [ ] Message edits, deletions and reactions propagate to connected clients.
- [ ] Unauthorized users cannot subscribe to private workspace channels.
- [ ] Messages remain persistent after disconnection.
- [ ] The system works with multiple connected clients.
- [ ] Multi-instance event distribution is verified before claiming multi-instance support.

**Scope boundary:** This phase introduces the infrastructure and core message delivery. It does not require direct messages, voice calls or a separate microservice architecture.

## Phase 4 — Integrate the Frontend with Real-Time Messaging

**Objective:** Connect the existing messaging interface to the new backend without breaking its functionality.

### Tasks

- [ ] Create a dedicated WebSocket service.
- [ ] Connect to the appropriate channel after authentication and channel selection.
- [ ] Handle incoming message events and update React state.
- [ ] Preserve message history and pagination through REST endpoints.
- [ ] Send new messages through the agreed real-time workflow.
- [ ] Synchronize edits, deletions, replies and reactions.
- [ ] Handle connection failures and reconnections.
- [ ] Prevent duplicate messages when an HTTP response and WebSocket event represent the same operation.
- [ ] Handle channel switching and clean up obsolete connections or subscriptions.
- [ ] Implement recovery for events missed during disconnection.

### Completion criteria

- [ ] The existing messaging interface works with WebSockets.
- [ ] Messages update across clients without polling.
- [ ] Reconnection does not create duplicate messages.
- [ ] Existing message history remains accessible.
- [ ] The composer, replies, reactions and established functionality continue working.

**Design principle:** Use REST for history retrieval and conventional operations where appropriate; use WebSockets for real-time communication. These mechanisms complement each other.

## Phase 5 — Reliable Messaging and Presence

**Objective:** Make the real-time system resilient to network failures and concurrent users.

### Connection reliability

- [ ] Detect dropped connections.
- [ ] Reconnect with bounded exponential backoff.
- [ ] Reauthenticate connections when necessary.
- [ ] Clean up disconnected consumers and subscriptions.

### Message consistency

- [ ] Prevent duplicate delivery from creating duplicate UI entries.
- [ ] Handle concurrent edits and deletions predictably.
- [ ] Use stable message IDs and timestamps.
- [ ] Keep database persistence as the source of truth.
- [ ] Define how the client recovers messages missed during disconnection.

### Presence

- [ ] Track online/offline status.
- [ ] Associate presence with authenticated users.
- [ ] Remove stale presence after unexpected disconnects.
- [ ] Support the possibility of multiple active sessions per user.

### Testing

- [ ] Test multiple users and simultaneous messages.
- [ ] Test disconnects and reconnects.
- [ ] Test unauthorized channel subscriptions.
- [ ] Test message delivery during channel switching.
- [ ] Test persistence and recovery after temporary Redis or network failures.

### Completion criteria

- [ ] Ordinary connection failures do not corrupt message history.
- [ ] Presence is reasonably accurate.
- [ ] Missed events can be recovered through a defined synchronization mechanism.
- [ ] Concurrent activity does not cause obvious inconsistencies.

**Scope note:** Typing indicators and unread-message counts can be added after core reliability is established. They should not block the initial migration.

## Phase 6 — Production Deployment and Performance

**Objective:** Make the system suitable for a real deployment, rather than merely functional locally.

### Infrastructure

- [ ] Configure production Redis.
- [ ] Deploy Django using an ASGI-compatible server.
- [ ] Verify WebSocket support and reverse-proxy configuration.
- [ ] Configure secure WebSocket connections over HTTPS.
- [ ] Separate development and production settings.
- [ ] Store secrets in environment variables or a suitable secret manager.
- [ ] Configure logging and error reporting.

### Performance

- [ ] Measure concurrent WebSocket connections and message-delivery latency.
- [ ] Avoid unnecessary database queries for each event.
- [ ] Review channel-group membership and cleanup.
- [ ] Ensure message history uses pagination.
- [ ] Avoid repeatedly fetching the entire message history.
- [ ] Monitor Redis and database resource usage.

### Security

- [ ] Enforce authentication and channel-level authorization.
- [ ] Validate every client-originated event.
- [ ] Apply appropriate message-size and rate limits.
- [ ] Never trust client-supplied user IDs or permissions.
- [ ] Deliver private messages and workspace events only to authorized recipients.

### Completion criteria

- [ ] Production deployment supports authenticated WebSocket communication.
- [ ] Real-time messaging works over secure connections.
- [ ] Logs help diagnose connection and delivery failures.
- [ ] Database and Redis failures are handled predictably.
- [ ] Functional, security and basic load tests have been run and documented.

> Production-grade architecture does not automatically guarantee production readiness. Operational configuration, testing and monitoring are part of the implementation.

## Phase 7 — Product Enhancements

Start these after the messaging migration and reliability work are stable.

| Priority | Feature                         | Purpose                                          |
| -------- | ------------------------------- | ------------------------------------------------ |
| 1        | Message search                  | Find content in persistent channel history       |
| 2        | Unread-message tracking         | Identify new activity                            |
| 3        | Typing indicators               | Provide immediate communication feedback         |
| 4        | Mentions and notifications      | Improve collaboration                            |
| 5        | Rich document editor            | Expand collaborative workspace functionality     |
| 6        | AI and RAG integration          | Add intelligent search and assistance            |
| 7        | Advanced monitoring and scaling | Support increasing traffic and operational needs |

These are later enhancements, not prerequisites for introducing real-time communication.

---

## Recommended Implementation Order

| Order | Phase                              | Main deliverable                                        |
| ----: | ---------------------------------- | ------------------------------------------------------- |
|     1 | Security and backend stabilization | Safer, tested API                                       |
|     2 | Messaging completion               | Stable existing messaging behavior                      |
|     3 | Real-time backend infrastructure   | Django Channels + Redis + WebSockets                    |
|     4 | Frontend integration               | Existing messaging UI powered by real-time events       |
|     5 | Reliability and presence           | Reconnection, recovery and online status                |
|     6 | Production deployment              | Secure, monitored ASGI deployment                       |
|     7 | Product enhancements               | Search, unread counts, notifications and later features |

## Architectural Decisions

- [ ] Keep Django as a modular monolith; do not split messaging into a separate microservice at this stage.
- [ ] Keep Django REST Framework and PostgreSQL.
- [ ] Add Django Channels, ASGI and Redis for real-time communication.
- [ ] Keep REST endpoints for message history and conventional API operations.
- [ ] Use WebSockets for real-time event delivery.
- [ ] Do not remove polling until the WebSocket path is tested. During migration, polling may temporarily serve as a fallback or recovery mechanism.
- [ ] Once the real-time path is reliable, remove unnecessary recurring polling.

## Execution Protocol

For every change:

1. Inspect the relevant existing implementation.
2. Identify the exact file or configuration that needs changing.
3. Make one logically isolated change.
4. Run the relevant tests.
5. Verify that existing functionality still works.
6. Record the result and move to the next change only after confirmation.

### First task

**Phase 1, Task 1: Fix private workspace exposure in discovery.**

Address this existing privacy risk before expanding the backend. After the security and messaging baseline is verified, proceed to Django Channels and Redis.

## Progress Log

Update this section as work is completed.

| Date | Phase / task    | Change made                              | Tests / verification | Status      |
| ---- | --------------- | ---------------------------------------- | -------------------- | ----------- |
| TBD  | Phase 1, Task 1 | Fix private workspace discovery exposure | TBD                  | Not started |

### Status legend

- **Not started** — no implementation work yet.
- **In progress** — currently being implemented.
- **Blocked** — requires a decision or dependency.
- **Implemented** — code change completed; verification may remain.
- **Verified** — implementation and relevant tests have passed.
