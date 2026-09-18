# StudyGram Development Guide

## Purpose

This document is the working product and development guide for StudyGram.

StudyGram is a focused study collaboration platform. The objective is **not** to maximize the number of features. The objective is to provide a premium, minimal, organized experience for people studying and collaborating together.

This document is intended to be read before continuing development. Development must be incremental and should follow the phases below.

---

# 1. Product Vision

StudyGram has four primary concepts:

1. **Workspaces** — persistent study communities.
2. **Workspace Channels** — organized, persistent group communication.
3. **Workspace Files** — official, curated study resources managed by admins/owners.
4. **Study Rooms** — a separate live-study feature that already exists.

There is also a small **platform-level user profile/identity** system.

The product should feel like a refined study-focused collaboration platform, not a feature-heavy Discord clone.

## Core principle

> Every feature must have a clear purpose for studying or collaboration.

Avoid adding features simply because another platform has them.

---

# 2. Current Product Boundaries

## Workspace

A Workspace is the central collaborative study environment.

Current Workspace functionality includes:

- Overview
- Members
- Files
- Workspace discovery/joining
- Membership and role management

The existing Workspace system should be preserved and evolved rather than rewritten unnecessarily.

## Study Rooms

Study Rooms are a separate entity from Workspaces.

Current Study Room architecture:

- Topic
- Room
- Host
- Participants
- Messages

Study Rooms are intended for live study/discussion sessions.

**Do not convert Room into Workspace Channel.**

**Do not attach Room to Workspace as part of the current channel implementation.**

Study Room improvements are postponed.

---

# 3. Workspace Channel System

Workspaces will gain an organized, Discord-like text communication system.

Example:

    Python Study Group

    DISCUSSION
      # general
      # questions
      # concepts

    LEARNING
      # python
      # django
      # dsa

    RESOURCES
      # resources
      # assignments

## Categories

Categories are customizable by Workspace admins/owners.

Admins/owners can:

- Create categories
- Rename categories
- Reorder categories
- Delete categories
- Move channels between categories

Categories are not hard-coded.

## Channels

Admins/owners can:

- Create channels
- Rename channels
- Edit channel descriptions
- Reorder channels
- Move channels
- Delete channels

Rules:

- A default `# general` channel should exist for a Workspace.
- There should always be at least one channel.
- No private channels.
- No complex per-channel permission matrix.
- Workspace membership determines basic channel access.
- Admin/owner authority follows the existing Workspace permission model.

The channel system should remain simple to understand.

---

# 4. Workspace Chat

The channel chat is a persistent group messaging system.

It should feel similar to a modern WhatsApp group chat, while remaining optimized for study discussions.

## Core messaging capabilities

The agreed feature set is:

- Text messages
- Images
- Documents/files
- Multiple attachments
- Timestamps
- User identity
- Online/offline presence
- Message editing
- Message deletion
- Replies
- Reactions
- @mentions
- Clickable links
- Persistent message history

## Interaction principles

Messages should remain visually lightweight.

The conversation should be the focus.

Avoid excessive metadata, badges, cards, or decorative UI.

## Replies

Use lightweight message replies/reference rather than deeply nested discussion threads.

## Reactions

Simple emoji reactions are appropriate.

## Mentions

`@username` should identify Workspace members.

The data model should leave room for future notifications, but notifications are not part of the current implementation.

## Message deletion

- Members can delete their own messages.
- Admins/owners can moderate/delete messages in their Workspace channels.

## Message editing

Members can edit their own messages.

An edited indicator should be subtle.

## Attachments

Members can upload content directly into channel chat.

All authorized Workspace members who can access the channel can view/download the attachment.

There is no automatic promotion from chat attachments to Workspace Files.

---

# 5. Workspace Files vs Chat Attachments

These are intentionally separate.

## Workspace Files

Official/curated content.

Current rule:

- Admins/owners control upload
- Admins/owners control deletion
- Admins/owners control organization

## Chat Attachments

Community-shared content.

Members can:

- Upload
- View
- Download

If an admin wants to add a chat attachment to official Workspace Files:

1. Admin downloads the attachment.
2. Admin uploads it manually through the existing Workspace Files system.
3. Admin organizes it normally.

Do not build a file approval/suggestion workflow.

Do not build automatic chat-to-files transfer.

---

# 6. Presence

Online/offline status should be visible in the channel/chat experience.

Initial presence states:

- Online
- Offline

Do not add richer presence states unless explicitly decided later.

The goal is simply to communicate whether a person is currently available.

---

# 7. Moderation

Moderation belongs to Workspace admins/owners.

## Members

Members can:

- Send messages
- Edit their own messages
- Delete their own messages
- Upload chat attachments

## Admin/Owner

Admins/owners can:

- Delete any channel message
- Manage channels
- Manage categories
- Remove members
- Manage Workspace Files
- Moderate chat attachments by removing the associated message

There is no separate moderation role currently.

Do not build:

- Reporting workflow
- Public moderation dashboard
- Ban system
- Public moderation statistics

unless explicitly decided later.

---

# 8. User Profile / Identity

A small profile/identity layer exists at the **platform level**, not inside Workspaces.

It is a separate application function.

Users can control:

- Avatar
- Display name
- Username

Profile information is not globally searchable.

The profile should not become a social network.

Do not build:

- Followers/following
- Public activity feed
- User directory/search
- Public posts
- Social statistics

Chat may display the user's:

- Avatar
- Username/display name
- Online/offline status

A small contextual identity card may be considered later, but a full social profile is not part of the current scope.

---

# 9. Discover

Discover is for finding Workspaces.

It should remain focused on:

- Search
- Workspace results
- Joining/requesting access

Do not turn Discover into a social feed.

Current backend discovery supports workspace search.

Privacy behavior for discoverable private Workspaces should be reviewed before changing existing semantics.

---

# 10. Home

Home is a personal workspace hub.

It should remain minimal.

Do not add:

- Decorative statistics
- Fake activity
- Engagement metrics
- Excessive cards

Recent Activity should only show real data.

Do not invent timestamps/events that the backend does not provide.

---

# 11. Explicitly Postponed Features

These are intentionally outside the current development scope:

- Direct messages / DMs
- Notifications
- Personalized AI
- Study Room enhancements
- Voice messages
- Voice/video calls
- Private channels
- User search
- Advanced social profiles
- Disappearing messages
- Message forwarding
- Complex moderation/reporting
- File approval workflow
- Automatic chat-to-Files integration

These may be considered in future product phases.

---

# 12. Product Design Principles

## Minimality

Do not add a UI element unless it serves a clear purpose.

## Premium experience

Prioritize:

- Consistent spacing
- Strong typography
- Clear hierarchy
- Restrained use of color
- Subtle borders/shadows
- Compact interactions
- Fast feedback
- Good empty/loading/error states
- Responsive behavior

Avoid:

- Excessive rounded cards
- Decorative gradients
- Giant headings
- Excessive icons
- Excessive badges
- Heavy shadows
- Generic AI-generated-looking UI patterns
- Dashboard statistics with no practical value

## Study-first

Every major interaction should answer one of these questions:

- Where do I study?
- Where do I discuss this concept?
- Where are the resources?
- Who is in my study group?
- How do I collaborate?

---

# 13. Frontend Architecture Principles

The project uses React/Vite and plain CSS.

Do not introduce Tailwind for this work.

CSS should remain organized by responsibility.

Current structure:

    src/
    ├── styles/
    │   ├── global.css
    │   ├── layout/
    │   │   └── app-layout.css
    │   ├── pages/
    │   │   ├── login.css
    │   │   ├── home.css
    │   │   ├── workspaces.css
    │   │   ├── discover.css
    │   │   └── workspace-detail.css
    │   ├── shared/
    │   │   └── workspace.css
    │   └── components/
    │       ├── home/
    │       ├── discover/
    │       └── workspace/

Component CSS should use isolated, descriptive class names.

Avoid generic selectors such as:

    .button
    .card
    .header

Prefer component-specific names.

Do not use inline CSS for production UI.

---

# 14. Backend Architecture Principles

The existing Django/DRF backend should be evolved incrementally.

Existing Workspace architecture remains authoritative for:

- Workspace membership
- Workspace roles
- Permissions
- Files
- Invitations
- Join requests

The existing Study Room architecture remains independent.

Do not create a second competing permission system unless required.

Use transactions and locking where state changes can race.

Existing backend stabilization already includes:

- Membership-aware Workspace serialization
- Discovery member count annotation
- Transactional join-request approval/rejection
- Transactional invitation acceptance
- Existing Workspace permissions

Do not regress these behaviors.

---

# 15. Curated Development Roadmap

## Phase 0 — Audit and baseline

Before changing code:

- Inspect Workspace models
- Inspect WorkspaceMembership
- Inspect Workspace permissions
- Inspect Workspace serializers
- Inspect Workspace URLs
- Inspect current Workspace frontend
- Inspect current Room usage
- Inspect current Message usage
- Identify all frontend imports/usages of Room services
- Establish a working baseline

Goal:

> Know exactly what exists before changing it.

---

## Phase 1 — Finalize Workspace channel data model

Introduce Workspace channel concepts without breaking Study Rooms.

Expected conceptual structure:

    Workspace
        │
        ├── ChannelCategory
        │      └── WorkspaceChannel
        │              └── WorkspaceMessage
        │
        ├── Members
        └── Files

Do not reuse `Room` for this.

Do not modify the Study Room architecture unless a concrete dependency requires it.

Define:

- Category
- Channel
- Message relationship
- Creator
- Ordering
- Default `general`

Before migrations, inspect existing database state and determine whether migration/data preservation is required.

---

## Phase 2 — Channel permissions

Implement authorization using existing Workspace membership/role rules.

Verify:

- Workspace member can access channels
- Non-member cannot access Workspace channels
- Admin/owner can create/edit/delete categories
- Admin/owner can create/edit/delete channels
- Regular member cannot manage channel structure
- Workspace owner/admin authority is preserved

---

## Phase 3 — Channel API

Implement the API for:

- List channels
- Create channel
- Retrieve channel
- Update channel
- Delete channel
- List categories
- Create/update/delete/reorder categories as required

Keep API naming consistent with existing Workspace URLs.

---

## Phase 4 — Messaging API

Implement:

- List messages
- Send message
- Edit own message
- Delete own message
- Admin message moderation
- Replies
- Reactions
- Mentions
- Attachments

Messages must respect Workspace/channel authorization.

Do not implement WebSockets yet.

Start with reliable REST behavior.

---

## Phase 5 — Attachment handling

Integrate chat attachments without modifying Workspace Files permissions.

Requirements:

- Members can upload
- Authorized members can access/download
- Attachment remains associated with its message
- Deleting a message removes/invalidates attachment access as appropriate
- Existing Workspace Files remain independent

Define file-size/type limits deliberately rather than assuming them.

---

## Phase 6 — Frontend services

Create domain-specific services rather than putting everything into a single Workspace service.

Likely structure:

    services/
    ├── workspaceService.js
    ├── channelService.js
    ├── messageService.js
    ├── memberService.js
    └── fileService.js

Only create a service when the domain actually requires it.

---

## Phase 7 — Channel UI

Add the Discord-like channel interface to Workspace Detail.

Expected conceptual structure:

    Workspace
    ├── Channel Sidebar
    │   ├── Categories
    │   └── Channels
    │
    └── Active Channel
        ├── Channel Header
        ├── Message List
        └── Message Composer

Do not rewrite the whole Workspace Detail page.

Preserve existing Overview, Members, and Files functionality.

---

## Phase 8 — Messaging UI

Implement:

- Message list
- Message item
- Composer
- Reply interaction
- Reactions
- Editing
- Deletion
- Attachments
- Download
- Mentions
- Presence

Keep the visual system minimal and consistent with the rest of StudyGram.

---

## Phase 9 — Real-time presence and messaging

Only after REST messaging is stable.

Potential technology:

- Django Channels
- Redis
- WebSockets

Use this for:

- Online/offline state
- New messages
- Typing indicator
- Future unread state

Do not introduce WebSockets before the underlying REST behavior is correct.

---

## Phase 10 — Profile/identity

Implement the small platform-level identity layer:

- Avatar
- Display name
- Username

Integrate identity into:

- Messages
- Member lists
- Presence

Do not turn this into a social profile system.

---

## Phase 11 — Polish and responsive behavior

Audit:

- Desktop layout
- Tablet layout
- Mobile layout
- Loading states
- Empty states
- Error states
- Attachment states
- Long usernames
- Long messages
- Long filenames
- Overflow
- Accessibility
- Keyboard interactions

Premium quality should come from refinement rather than adding features.

---

# 16. Future Product Phases

Only after the current system is stable:

## Future A

- Direct messages
- Notifications
- Better unread indicators
- Pinned messages
- Message search

## Future B

- Personalized AI
- AI using personal learning context
- AI using relevant Workspace/channel context

AI should remain personalized to each user rather than becoming a generic Workspace bot.

## Future C

- Advanced Study Rooms
- Real-time live collaboration
- Voice/video if justified

---

# 17. Incremental Development Rules

Every development phase must follow this sequence:

    1. Inspect existing implementation
    2. Define exact change
    3. Modify only required files
    4. Run syntax/build checks
    5. Test affected behavior
    6. Check for regressions
    7. Review UI
    8. Commit
    9. Update this README if architecture/decisions changed
    10. Only then move to the next phase

Do not combine unrelated phases into one large change.

For every phase, explicitly state:

- What is changing
- What is not changing
- Files affected
- Backend impact
- Frontend impact
- Database impact
- Permission impact
- Tests required
- Completion criteria

---

# 18. Development Guardrails

Before changing any existing component:

- Read the current file.
- Understand its imports and consumers.
- Do not assume names/routes are unused.
- Search for references before deleting or renaming code.
- Do not duplicate existing functionality.
- Do not introduce a new architecture simply because it is theoretically cleaner.
- Preserve working features unless the agreed product direction requires changing them.

When changing CSS:

- Scope styles to the component/page.
- Avoid generic selectors.
- Avoid `transition: all`.
- Avoid changing shared styles unless the change is intentionally global.
- Verify that unrelated components are unaffected.

When changing backend models:

- Inspect current database usage.
- Consider migration/data preservation.
- Check serializers, views, permissions, URLs, and frontend consumers.
- Do not rename models casually.

---

# 19. Definition of Done

A phase is complete only when:

- The intended functionality works.
- Existing unrelated functionality still works.
- Backend checks pass.
- Frontend build passes.
- Permissions are verified.
- Loading/error/empty states are handled.
- Responsive behavior is acceptable.
- No unnecessary code duplication was introduced.
- CSS remains isolated.
- The implementation matches this product specification.

Do not move to the next phase simply because the code compiles.

---

# 20. Current Project Status

The existing project already has:

- Authentication
- Workspaces
- Workspace membership
- Join requests
- Invitations
- Workspace discovery/search
- Workspace files
- Workspace members
- Workspace overview
- Workspace editing
- Study Rooms
- Study Room messaging
- Redesigned Home
- Redesigned Discover
- Redesigned Workspace UI
- Plain CSS architecture

The product decisions for the next major evolution are now defined.

The next development work is to evolve the Workspace with organized channels and proper persistent messaging **without rebuilding the existing Workspace or Study Room systems unnecessarily**.

---

# 21. Decision Log

## Confirmed

- Workspaces and Study Rooms remain separate.
- Existing Study Rooms remain intact.
- Workspace gets Discord-like organized text channels.
- Channel categories are customizable by admins/owners.
- No private channels.
- Admin/owner have complete channel permissions.
- Workspace membership controls access.
- Chat is persistent.
- Chat is optimized for study collaboration.
- Messaging is similar to WhatsApp group chat where appropriate.
- Online/offline presence is required.
- Members can upload chat attachments.
- Authorized members can download attachments individually.
- Workspace Files remain admin-controlled.
- No automatic resource approval workflow.
- No automatic chat-to-Files transfer.
- Moderation belongs to admins/owners.
- Profile is a separate platform-level function.
- Profile is minimal.
- Profile is not globally searchable.
- DMs are postponed.
- Notifications are postponed.
- AI is postponed.
- Study Room enhancements are postponed.
- Premium/minimal experience is more important than feature count.

## Rejected

- Converting Room into Workspace Channel
- Making Room a child of Workspace
- Building a second competing messaging architecture for Study Rooms
- Private Workspace channels
- Automatic resource approval workflow
- Automatic chat attachment → Workspace File transfer
- Global user search
- Social-network profile features
- Feature-heavy Discord cloning

---

# 22. Working Rule for Future Development

Before implementing any feature, ask:

> Does this improve StudyGram's core study collaboration experience enough to justify its complexity?

If the answer is no, do not build it.

The target is a **coherent, polished, focused study collaboration product**.
