# CometChat Integration Guide

This document describes how CometChat was integrated into the **Matrix Hackathon Command Platform** (Step 2), without breaking any existing Step 1 workflows.

## Overview

| Layer | Technology | CometChat Touchpoints |
|---|---|---|
| Frontend | Next.js 16 (App Router) + React 19 | UI Kit v6 (`@cometchat/chat-uikit-react`), SDK (`@cometchat/chat-sdk-javascript`) |
| Backend | Go (Chi) + PostgreSQL + Redis | REST API for user/group sync, webhook receiver |
| Mobile | Android (Java) | Unchanged in this phase (existing FCM polling preserved) |

The integration follows a **shared-identity** model: a user's CometChat `UID` is exactly their PostgreSQL `user_id`, and a team's CometChat group `GUID` is exactly their PostgreSQL `team_id`. This removes any need for a mapping table and guarantees identity consistency between the app and CometChat.

## 1. Architecture

```
┌──────────────────┐     register / create team      ┌──────────────────┐
│  Go Backend      │ ───────────────────────────────▶│  CometChat REST  │
│  (auth, teams)   │   POST /users, POST /groups      │  API (v3)        │
└────────┬─────────┘                                  └──────────────────┘
         │ JWT (user_id, role)                                 ▲
         ▼                                                     │ websocket
┌──────────────────┐    login(uid = user_id)          ┌────────┴─────────┐
│  Next.js Client  │ ────────────────────────────────▶│  CometChat SDK   │
│  (UI Kit v6)     │    1-on-1 + group chat UI         │  (realtime)      │
└──────────────────┘                                  └──────────────────┘
         ▲                                                     │
         │  webhook: moderation flag / message sent            │
┌────────┴─────────┐◀────────────────────────────────────────┘
│  Webhook handler │   POST /api/webhooks/cometchat
│  → moderation_logs table → Admin dashboard
└──────────────────┘
```

## 2. SDK Installation & Initialization (Next.js)

Packages installed:

```bash
npm install @cometchat/chat-sdk-javascript @cometchat/chat-uikit-react
```

### Provider

`src/components/providers/CometChatProvider.tsx` initializes the SDK exactly once using a module-level guard (prevents the React StrictMode double-init), and exposes `loginUser` / `logoutUser` through React context.

Key safety patterns (from the `cometchat-core` skill):
- **Module-level `initialized` flag + cached `initPromise`** — init runs once even under StrictMode double-mount.
- **`loginInFlight` promise guard** — prevents the `"Please wait until the previous login request ends"` race when two components trigger login simultaneously.
- Credentials read from `NEXT_PUBLIC_COMETCHAT_*` env vars.

The provider wraps the whole app in `src/app/layout.tsx`.

### Dark mode aesthetic

`src/app/globals.css` imports the kit's CSS variables and overrides them under the `.dark` selector to match the platform's deep gunmetal (`#0B0F19`) design system.

### SSR safety (critical for Next.js 16)

The CometChat UI Kit touches `window`/`document` at import time. Every page that renders chat UI imports the chat components via `next/dynamic` with `{ ssr: false }`, from inside a Client Component (`"use client"`). This is the Next.js 15+ rule — `dynamic({ ssr: false })` is forbidden in Server Components.

## 3. Backend User & Group Sync (Go)

`backend/internal/service/cometchat_service.go` wraps the CometChat REST API.

| Trigger | App Code | CometChat Call |
|---|---|---|
| New registration | `auth_service.go → RegisterUser` | `POST /users` (UID = user_id, tagged with role) |
| Profile/role update | `cometchat_service.go → UpdateUser` | `PUT /users/{uid}` |
| User ban/deactivate | `super_admin_service.go → BanUser` | `PUT /users/{uid}` (`activated: false`) |
| Team created | `team_service.go → CreateTeam` | `POST /groups` (GUID = team_id) |
| User joins team | `team_service.go → JoinTeam / ManageJoinRequest / ManageInvitation` | `POST /groups/{guid}/members` |
| Backfill seeded users | `super_admin_service.go → SyncAllUsersToCometChat` | bulk `POST /users` (idempotent, 409 = skip) |

All sync calls run in background goroutines so they never block or break the existing app response. Failures are logged, not fatal.

### Backfilling the 100+ seeded users

Existing seeded users predate the integration. A SuperAdmin-only endpoint backfills them:

```
POST /api/admin/cometchat/sync-users
```

It iterates every user and calls `CreateUser`. The call is idempotent — users that already exist return `409` and are skipped.

## 4. Real-Time Communication Features

| Feature | Where | Component |
|---|---|---|
| 1-on-1 chat | `/workspace/[id]/find-team` → "Message" button | `ChatModal` → `CometChatMessageHeader/List/Composer` with `user` |
| Group chat | `/workspace/[id]/project` (team members) | `TeamGroupChat` → same components with `group` (guid = team_id) |
| Voice & Video Calling | Chat bubbles / headers (1-on-1 & Group) | Managed by `@cometchat/calls-sdk-javascript` & `<CometChatIncomingCall />` |
| Top-Right / Desktop Ringing Sound | Browser | Custom call event listener playing dual-frequency phone tone (440Hz + 480Hz) |
| Typing indicators, presence, read receipts | Built into the UI Kit | enabled via `subscribePresenceForAllUsers()` |

Messages, typing indicators, presence, and read receipts are all handled by the UI Kit out of the box once the SDK is initialized and the user is logged in. When rendering headers (such as `CometChatMessageHeader`), the UI Kit automatically detects Calls SDK status and attaches Voice + Video calling buttons.

## 5. Role-Based Access Control (RBAC) & Group Scopes Mapping

The system maps application roles and restrictions to CometChat using a multi-tiered approach:

### User Roles (App-Level Roles)
- **Role Sync**: When registering a new user, they are assigned the default CometChat role (`"default"`), and their specific platform role (`Hacker`, `Mentor`, `Organizer`, etc.) is set in user **Tags** and user **Metadata** (`app_role: role`). When a user's role is updated (e.g. from Hacker to Mentor), the backend calls `UpdateUser` to sync the `"role"` field directly to CometChat.
- **Why this approach?** App Roles in CometChat require manual setup in the console first. By mapping platform roles to CometChat user tags and metadata, the integration is plug-and-play and works out-of-the-box on new CometChat apps, while still allowing operators to create matching console roles later.

### Group Member Scopes (Group-Level Access Control)
Within CometChat group communications, we leverage CometChat's native group scopes (`owner`/`admin`/`participant` roles):
- **Team Chat**: The team leader (who creates the team) is designated as the group **Owner/Admin** in CometChat. Other team members are added as standard **Members**.
- **Support Chat (Tickets)**: The mentor who claims the help ticket is set as the group **Owner/Admin** (since they create the support session). The requesting hackers are added as standard **Members**. This guarantees that mentors retain administrative authority over the help group, preventing hackers from changing group settings or removing the mentor.

### Group-Level Access Control (Private Groups)
- All team chats and support ticket chats are created as **Private Groups** in CometChat.
- Because they are private, these groups are hidden from search and cannot be joined using standard SDK queries. A user must be explicitly added by the Go backend (via `AddMemberToGroup` REST call) upon team creation, membership approval, or ticket claiming. This enforces strict isolation—hackers cannot view, listen to, or message other teams' conversations or support desks.

---

## 6. Authentication Model

The app keeps its existing JWT auth. CometChat login is **silent and automatic**:
1. User logs into the app (existing flow) — JWT cookie set.
2. On any chat-enabled page, the `CometChatProvider` is initialized and the page calls `loginUser(user.id)`.
3. The user is logged into CometChat using their `user_id` as UID. No separate CometChat login screen.

Current mode uses the **Auth Key** (dev/staging). For production, swap to **auth tokens** minted server-side — see `DECISION_LOG.md` Step 2 and the `cometchat-production` skill.

## 6. AI & Moderation Features

These are **dashboard-toggled** features that auto-wire into the UI Kit (no per-component props in v6):

- **Smart Replies** (AI) — enable on the CometChat dashboard with an OpenAI key. Renders suggested-reply chips above the composer in all chat surfaces, including mentor/team chats.
- **Message Translation** — enable the extension on the dashboard. Adds a "translate" option to message bubbles in team group chats.
- **Moderation (Rules Management)** — configure keyword/toxicity rules on the dashboard. Flagged messages fire a webhook (see `COMETCHAT_WEBHOOKS.md`).

Enablement commands and rationale are documented in `COMETCHAT_SKILLS_USAGE.md`.

## 7. Environment Variables

See `.env.example`. Backend uses `COMETCHAT_APP_ID/REGION/API_KEY/AUTH_KEY`; frontend uses the `NEXT_PUBLIC_COMETCHAT_*` prefixed equivalents.

## 8. What Did NOT Change (Step 1 preserved)

- App JWT auth, registration, login, logout — unchanged.
- Existing FCM push notifications (team join, ticket updates, announcements) — unchanged and still functional.
- Ticket/mentor-queue workflow — unchanged. The "one open ticket per team" spam guard still enforced server-side.
- All existing REST APIs — unchanged. CometChat additions are net-new endpoints.
