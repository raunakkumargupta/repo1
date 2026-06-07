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
