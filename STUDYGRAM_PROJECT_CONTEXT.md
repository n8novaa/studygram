# StudyGram — Project Context / Continuation Memory

## Product purpose
StudyGram is a collaborative study/workspace platform. Workspace CRUD is infrastructure, not the core product.

Core workflow:
User → Workspace → Room → Files → Collaboration → AI-assisted study

The main product goal is for users to create, organize, share, and collaborate on study files. Later, an AI system should read those files and provide summaries, grounded Q&A, revision help, quizzes, explanations, and related study assistance.

## Current state

### Workspace backend
Working:
- Workspace creation
- Workspace listing for current memberships
- Workspace detail/retrieve
- Workspace update
- Workspace deletion by owner
- Owner/admin permissions
- Members and roles
- Public/private visibility
- Public joining: immediate membership
- Private joining: pending join request
- Admin approval/rejection of join requests
- Global workspace discovery

Discovery rule:
- Discover shows ALL workspaces, including private ones.
- Private means joining requires admin approval; it does NOT mean hidden from discovery.

Workspace views were split:
- views/workspace.py — WorkspaceViewSet
- views/access.py — join/join-request views

Endpoints:
- /workspaces/
- /workspaces/<id>/
- /workspaces/discover/
- /workspaces/<workspace_pk>/join/
- /workspaces/<workspace_pk>/join-requests/
- /workspaces/<workspace_pk>/join-requests/<request_pk>/approve/
- /workspaces/<workspace_pk>/join-requests/<request_pk>/reject/

WorkspaceViewSet:
- get_queryset() returns workspaces where current user is a member.
- discover() returns ALL Workspace objects.
- list/retrieve require membership.
- update/partial_update require IsWorkspaceEditor.
- destroy requires IsWorkspaceOwner.
- create automatically creates an ADMIN membership for the creator.

### Workspace serializers
Current:
- WorkspaceMemberSerializer
- WorkspaceSerializer
- WorkspaceJoinRequestSerializer
- WorkspaceInvitationSerializer
- AcceptInvitationSerializer
- WorkspaceDiscoverSerializer

Invitation serializers exist, but the actual invitation workflow is NOT implemented.

## Frontend

React + Vite.

Relevant pages/components:
- AppHome.jsx
- Workspaces.jsx
- Discover.jsx
- WorkspaceDetail.jsx
- Login.jsx
- components/layout/AppLayout.jsx

workspaceService contains:
- getWorkspaces
- getWorkspace
- createWorkspace
- updateWorkspace
- deleteWorkspace
- joinWorkspace
- getJoinRequests
- approveJoinRequest
- rejectJoinRequest
- getDiscoveredWorkspaces

### AppHome.jsx
Temporary:
- shows logged-in username
- shows pending join requests for workspaces where current user is admin
- admin can Accept/Reject

This will later be replaced by a proper notification system.

### Workspaces.jsx
Working:
- load user's workspaces
- create workspace
- public/private selection
- workspace cards
- open workspace detail

### Discover.jsx
Working:
- load all discovered workspaces
- show name, owner, visibility, member count, creation time
- view workspace
- join workspace

Private workspace:
- visible in Discover
- Join creates pending request
- admin currently handles it through Home

### WorkspaceDetail.jsx
Working:
- workspace information
- members
- owner
- timestamps
- edit workspace
- delete for owner
- visibility/description

Do not unnecessarily modify this working page.

### AppLayout.jsx
Working navigation:
- StudyGram
- Home
- Workspaces
- Discover
- Messages
- username
- Logout

Desired design:
- persistent left panel
- Notion-like
- minimal and structured

### Login.jsx
Working:
- username
- password
- loading/error states
- redirect to /app

## Styling
Preferred:
- minimal
- clean
- ordered spacing
- restrained colors
- card/section hierarchy
- enterprise/productivity-app feel
- reusable CSS where practical
- extensible because UI is NOT final

Past Vite issue:
Use `../styles/...`, not `..styles/...`.

## Product roadmap

### NEXT: Rooms
Do not expand Workspace CRUD unnecessarily.

Workspace should contain focused Rooms, e.g.:
Computer Science
- Data Structures
- Operating Systems
- DBMS
- Machine Learning

A Room should eventually contain:
- Overview
- Files
- Messages
- Members
- Activity

There is already some basic room infrastructure because the frontend has used `getRooms`, but the Room system is not complete. Inspect existing Room backend/frontend before replacing or duplicating it.

First design the Workspace → Room relationship and authorization, then implement.

### File system
Core feature after Rooms.

Users should be able to:
- upload/create
- organize
- rename
- delete
- move
- download
- preview
- share
- search
- view metadata/uploader/timestamps

Initial formats:
- PDF
- DOCX
- TXT
- Markdown
- images
- PPTX later

### File permissions
Eventually:
- Owner
- Editor
- Viewer
- room/workspace access
- explicit sharing where appropriate

### Versioning
Support:
- v1
- v2
- v3/current
- history
- restore

### Room messaging
Build room-level messaging. Add WebSockets after basic messaging is stable.

### Notifications
Build later as a proper general notification system.

Example:
A is admin → B requests to join → A receives notification → A accepts → B receives acceptance notification.

Later notifications can cover:
- join requests
- decisions
- file uploads
- file interactions
- mentions
- relevant activity

### Activity
Potential events:
- file uploaded
- user joined room
- file edited
- message/comment
- mention

### Search
Eventually search:
- workspaces
- rooms
- files
- messages
- extracted file text

### AI
Only after file infrastructure is solid.

Pipeline:
Uploaded file
→ text extraction
→ chunking
→ embeddings
→ vector database
→ retrieval/RAG
→ LLM

Features:
- summaries
- grounded Q&A
- explanations
- revision notes
- question generation
- quizzes
- exam-topic extraction
- study assistance

Critical principle:
AI must use the user's actual uploaded material rather than act as a generic chatbot.

## Current strategic decision
Workspace is sufficiently complete for now.

Do NOT prioritize invitations before Rooms/files unless a dependency appears.

Next:
1. Inspect existing Room code.
2. Design Room relationships and authorization.
3. Implement Room backend.
4. Implement Room UI.
5. Move to Files.

## Continuation rules
- Treat this as existing project state, not a fresh project.
- Do not ask the user to re-explain Workspace.
- Preserve working Workspace behavior.
- Build incrementally.
- Provide code one file at a time when practical.
- Explain architecture before changing it.
- Keep UI minimal and structured.
- Assume more functionality will be added later.
