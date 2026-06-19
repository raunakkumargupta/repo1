# Decision Log

## Decision 1: Application Use Case Selection
### Selected Approach
We selected a "Hackathon Command & Mentor Routing Matrix" as the application use case.
### Alternate Options Considered
1. Learning management system
2. Customer support dashboard
3. Internal company portal
### Why This Was Chosen
A Hackathon Mentor Matrix provides a high-stakes, fast-paced real-world scenario. It naturally requires multi-tiered roles (Hackers, Mentors, Admins), ticket routing, and community forums. Most importantly, it creates a perfect vacuum for integrating real-time chat and video calls (CometChat) later, as participants and mentors will eventually need to communicate directly once a ticket is accepted.
### Trade-offs
It requires building complex queue-polling logic and strict RBAC compared to a simple blog or portal.
### Limitations or Assumptions
Initial mentor matching is manual (Agents claim tickets) rather than AI-auto-assigned.
### Future Improvements
Integrating real-time messaging so Mentors can chat with Hackers before physically walking to their table.

---

## Decision 2: Frontend Framework Selection
### Selected Approach
Next.js 14+ (App Router) with Tailwind CSS v4 and Framer Motion.
### Alternate Options Considered
1. React (Vite) Single Page Application
2. Vue.js / Nuxt
### Why This Was Chosen
Next.js provides excellent file-based routing and allows us to build secure API route proxies (hiding backend URLs and managing HttpOnly cookies). Tailwind v4 enables a strict, premium design system (Nordic Slate / Gunmetal Obsidian) efficiently, while Framer Motion provides the premium "hacker-grade" micro-interactions required for a modern tech product.
### Trade-offs
Slightly steeper learning curve with Server Components and Route Handlers compared to a pure SPA.
### Future Improvements
Implementing full Server-Side Rendering (SSR) for the public community hub to improve SEO.

---

## Decision 3: Backend Framework Selection
### Selected Approach
Go (Golang) using the `chi` router and `pgxpool`.
### Alternate Options Considered
1. Node.js with Express/NestJS
2. Python with FastAPI
### Why This Was Chosen
Go offers unparalleled hyper-scale concurrency. Hackathons generate massive, sudden spikes in traffic (e.g., when submissions open or a global announcement is made). Go's lightweight goroutines and `chi`'s fast, idiomatic routing ensure the backend will not buckle under load.
### Trade-offs
More verbose error handling and lack of "magic" ORMs compared to Node/Python ecosystems.
### Future Improvements
Implementing gRPC for internal microservice communication as the platform scales.

---

## Decision 4: Database Selection
### Selected Approach
PostgreSQL (Primary Relational) + Redis (In-Memory Cache).
### Alternate Options Considered
1. MongoDB (NoSQL)
2. MySQL
### Why This Was Chosen
PostgreSQL provides strict ACID compliance, which is critical for transactional integrity when assigning tickets and managing RBAC. Redis was chosen to handle rate-limiting (Token Bucket algorithm) and fast-caching for the live Mentor Queue, protecting the Postgres DB from excessive polling.
### Trade-offs
Requires managing database migrations (using `golang-migrate`) and maintaining two separate database services.

---

## Decision 5: Authentication Approach
### Selected Approach
Stateless JWT (JSON Web Tokens) with a dual-transport strategy (HttpOnly Cookies for Web, `Authorization: Bearer` Headers for Mobile).
### Alternate Options Considered
1. Stateful Session IDs in Redis
2. Third-party providers (Auth0/Firebase)
### Why This Was Chosen
JWTs scale infinitely without database lookups for every request. By engineering the `AuthMiddleware` to accept both headers and cookies, we seamlessly support both the Next.js web application (protecting against XSS via HttpOnly cookies) and the Native Mobile applications (Android/iOS).
### Trade-offs
Token revocation is harder (requires a Redis blacklist for logged-out tokens).

---

## Decision 6: Push Notification Approach
### Selected Approach
FCM (Firebase Cloud Messaging) and APNS (Apple Push Notification Service) integration via database token storage.
### Alternate Options Considered
1. WebSockets for all alerts
2. SMS / Email only
### Why This Was Chosen
Hackathons require immediate attention. When a mentor accepts a ticket, the user needs a native push notification on their phone to know help is arriving. We added `fcm_token` and `apns_token` to the core `users` schema to natively support this workflow prior to any chat integration.
### Trade-offs
Requires maintaining mobile OS notification permissions and certificate management.

---

## Decision 7: Role/Permission Model
### Selected Approach
Strict Custom RBAC (Role-Based Access Control) using Go Middleware.
### Alternate Options Considered
1. Simple Admin/User boolean flags
2. Casbin (complex policy engine)
### Why This Was Chosen
We defined 5 distinct roles: Admin, Manager, Agent, User, and Moderator. A custom middleware (`RequireRole`) checks the JWT claims injected into the HTTP context. This is incredibly fast, easy to audit, and perfectly fits the multi-tiered nature of a hackathon.
### Trade-offs
Roles are hardcoded into the JWT; changing a role requires the user to re-authenticate or wait for token expiry.

---

## Decision 8: Admin Dashboard Structure
### Selected Approach
Client-Side Rendering (CSR) with Skeleton Loaders.
### Alternate Options Considered
1. Server-Side Rendering (SSR)
2. Static Site Generation (SSG)
### Why This Was Chosen
The Admin Dashboard is highly dynamic and requires real-time data monitoring (live ticket queues, active users). CSR with fast `fetch` polling ensures the UI feels like a reactive, living dashboard rather than a static webpage.
### Trade-offs
Initial load might show skeleton states for a few milliseconds while data is fetched.

---

## Decision 9: Seed Data Structure
### Selected Approach
Automated database seeding of 100+ diverse users using a dedicated SQL seed script/command.
### Alternate Options Considered
1. Manual data entry
2. Relying strictly on e2e test creation
### Why This Was Chosen
To prove the architecture is production-ready and to prepare for CometChat integration, we needed a heavily populated database representing all roles (Admins, Managers, Agents, standard Users) with realistic activity histories.
### Trade-offs
Requires maintaining the seed script to align with any schema changes.

---

# Step 2 — CometChat Integration Decisions

## Decision 10: CometChat Integration Approach
### Selected Approach
Integrate the official CometChat **React UI Kit v6** on the frontend and the **CometChat REST API (v3)** on the Go backend, driven by the CometChat Skills packs.
### Alternate Options Considered
1. Pure SDK (no UI Kit) — build all chat UI by hand.
2. A third-party chat (e.g. Stream, Sendbird).
3. Self-hosted WebSocket chat.
### Why This Was Chosen
The UI Kit ships production-grade chat surfaces (typing, presence, receipts, reactions) out of the box, cutting weeks of UI work. The assignment specifically requires CometChat. The REST API lets the backend keep CometChat as the source of truth for identity while our PostgreSQL remains the source of truth for the app.
### Trade-offs
The UI Kit's look is customised via CSS variables rather than full control of markup.
### Limitations or Assumptions
Assumes a CometChat app is provisioned with valid App ID / Region / Auth Key / API Key.

## Decision 11: User Sync Method
### Selected Approach
Sync users to CometChat **server-side, asynchronously** (background goroutine) at registration, plus a one-time SuperAdmin backfill endpoint for the 100+ seeded users.
### Alternate Options Considered
1. Client-side user creation from the browser.
2. Synchronous (blocking) sync in the registration request path.
3. A nightly batch cron sync.
### Why This Was Chosen
Server-side keeps the API Key secret (never shipped to the browser). Async means a CometChat outage can never break app registration. The backfill endpoint handles users created before the integration. Calls are idempotent (409 = already exists → skip).
### Trade-offs
A brief eventual-consistency window between app user creation and CometChat availability.

## Decision 12: CometChat UID Strategy
### Selected Approach
Use the PostgreSQL `user_id` directly as the CometChat `UID`, and the `team_id` directly as the group `GUID`.
### Alternate Options Considered
1. A separate `cometchat_uid` column with a generated ID + mapping table.
2. Email-based UIDs.
### Why This Was Chosen
A shared-identity model removes an entire class of mapping/lookup bugs and keeps identity consistent across app and CometChat with zero extra storage. Email-based UIDs leak PII and break if a user changes email.
### Trade-offs
The app's internal IDs become visible inside CometChat (acceptable — they are opaque UUIDs).

## Decision 13: CometChat Tags
### Selected Approach
Tag every CometChat user with their app **role** (`Hacker`, `Mentor`, `Organizer`, `Judge`, `SuperAdmin`) and tag groups with `hackathon:<id>` + `team`.
### Alternate Options Considered
1. No tags (rely solely on app-side RBAC).
2. Department/region tags.
### Why This Was Chosen
Role tags let CometChat-side filtering, moderation routing, and future role-based conversation restrictions work without re-querying our DB. Hackathon tags scope groups to an event for clean filtering and webhook handling.
### Trade-offs
Tags must be kept in sync on role change (handled by `UpdateUser`).

## Decision 14: Role-Based Access Control Design
### Selected Approach
1. **App JWT & Custom Go Middleware** gates initial access to platform routes and dashboards (Hacker panel vs Mentor queue).
2. **CometChat App Roles & Tags Mapping**: Platform roles (Hacker, Mentor, etc.) are synced as Tags and metadata on user creation, and mapped to the `"role"` field during user profile updates.
3. **CometChat Group Scopes**: For group communication access control, the system uses group scopes. In support sessions, the technical Mentor is assigned as the group **Owner/Admin** to retain administrative control, and Hackers are added as standard **Members/Participants**.
4. **CometChat Private Groups**: Team and ticket groups are set to `"private"`, restricting access to explicitly added members.
### Alternate Options Considered
1. CometChat-only RBAC.
2. App-only RBAC with open CometChat.
### Why This Was Chosen
Defence in depth: the app gates UI/route access (existing `useAuth` + Go `RequireRole`), while CometChat private group status and scopes mapping ensure a user can only read/post in groups they actually belong to, and mentors maintain control. Neither layer alone is sufficient.
### Trade-offs
Two systems to keep aligned; mitigated by syncing membership at the same point as the DB write.

## Decision 15: Push Notification Setup
### Selected Approach
Keep the existing Firebase FCM push (app events: team join, ticket updates, announcements) **untouched**, and layer CometChat push as a separate channel for chat/call events.
### Alternate Options Considered
1. Route all notifications through CometChat.
2. Route all notifications through FCM (including chat).
### Why This Was Chosen
The assignment explicitly requires that existing app notifications keep working after CometChat is added. Keeping the two channels separate guarantees no regression and lets each system do what it does best. Notification source is distinguishable by payload.
### Trade-offs
Two notification pipelines to operate.

## Decision 16: Agent (Mentor) Chat Flow
### Selected Approach
Reuse the existing ticket system for routing/assignment, and use CometChat group/1-on-1 chat as the live conversation channel once a mentor engages.
### Alternate Options Considered
1. A brand-new CometChat-only agent routing system.
2. Pure ticket system with no live chat.
### Why This Was Chosen
The ticket queue (with its one-open-ticket-per-team spam guard) already handles availability/assignment well. Adding CometChat chat on top gives real-time conversation without discarding the proven routing logic.
### Trade-offs
Two concepts (ticket + chat) the mentor sees; acceptable for traceability.

## Decision 17: Moderation Rules
### Selected Approach
Use CometChat **Rules Management** (keyword/toxicity rules configured on the dashboard) + a webhook that logs flagged messages to `moderation_logs` for SuperAdmin review.
### Alternate Options Considered
1. Legacy moderation extensions (Profanity Filter, Sentiment Analysis).
2. Client-side word filtering.
### Why This Was Chosen
The `cometchat-features` skill flags the legacy extensions as deprecated and warns they double-process messages if run alongside Rules. Rules Management is the modern, server-enforced path. Client-side filtering is trivially bypassed.
### Trade-offs
Rules are configured in the dashboard (operator action), not in code.

## Decision 18: Webhook Use Case
### Selected Approach
A single endpoint `POST /api/webhooks/cometchat` handling `after_message_sent` (activity log) and `after_message_moderated` (flag log), both writing to `moderation_logs`.
### Alternate Options Considered
1. Group-created → sync to internal team.
2. Call started/ended → record call activity.
### Why This Was Chosen
Moderation logging delivers the highest real-world value for a hackathon platform (safety + admin oversight) and directly demonstrates webhook → DB → admin-dashboard visibility, which is the assignment's core requirement.
### Trade-offs
Other webhook scenarios (call logging, group sync) are left as documented future work.

## Decision 19: Real-Time Communication Flow
### Selected Approach
Lean entirely on the UI Kit's built-in realtime (websocket) for messages, typing, presence, and receipts; no custom polling for chat.
### Alternate Options Considered
1. Custom polling on top of REST.
2. Custom websocket layer.
### Why This Was Chosen
The UI Kit already maintains a single efficient websocket and renders realtime updates. Re-implementing this would be wasteful and less reliable.
### Trade-offs
Realtime behaviour is the kit's, not ours, to tune.

## Decision 20: UI Kit vs SDK vs Custom UI
### Selected Approach
Use the React UI Kit v6 components (`CometChatMessageHeader/List/Composer`) embedded in our own modal/panel chrome, styled via CSS variables.
### Alternate Options Considered
1. Full custom UI on the bare SDK.
2. The all-in-one `CometChatConversationsWithMessages` shell.
### Why This Was Chosen
The composable trio lets us drop chat exactly where it belongs (a modal on find-team, an embedded panel on the project page) while keeping our app's layout and design language. The all-in-one shell would impose its own full-screen layout.
### Trade-offs
Slightly more wiring than the all-in-one shell, in exchange for placement control.
