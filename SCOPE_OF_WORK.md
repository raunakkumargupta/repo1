# Scope of Work: Hackathon Command & Mentor Routing Matrix

## Application Use Case
A production-ready "Hackathon Command & Mentor Routing Matrix" designed to manage live event logistics, participant registration, team formation, and technical mentor ticket routing.

## Problem Statement
During large-scale hackathons, managing mentor requests via Discord or Slack becomes chaotic. Organizers lack visibility into which teams need help, which mentors are active, and how long participants have been waiting. There is a need for a centralized platform to manage users, route technical issues to available agents, and track resolution metrics.

## Target Users
1. **Hackathon Participants (Hackers)**: Need to form teams, ask for help, and share ideas.
2. **Technical Mentors (Agents)**: Need to see a live queue of who needs help and claim tickets.
3. **Event Organizers (Admins/Managers)**: Need a bird's-eye view of the event, user management, and system metrics.

## User Roles
- **Admin**: Full system access. Can modify roles and view system-wide metrics.
- **Manager**: Can manage teams and oversee the ticket queue.
- **Agent (Mentor)**: Can view the unassigned ticket queue, accept, and resolve tickets.
- **User (Participant)**: Can register, submit mentor requests, and post in the community hub.
- **Moderator**: Can moderate the community hub posts.

## User Workflows
1. **Participant Registration**: User lands on the public site, enters the 3-step registration funnel (Account -> Hacker Profile -> Team Status).
2. **Mentor Request Flow**: A participant submits a ticket detailing their bug/issue. The ticket enters the global Redis-backed queue.
3. **Ticket Resolution Flow**: An Agent views the live mentor queue, clicks "Accept Ticket", helps the team, and marks the ticket as "Resolved".
4. **Community Building**: Participants post ideas or "Looking for Group" requests in the Community Hub using rich-text markdown.

## Screens & Pages
- **Public Landing Page** (`/`): High-conversion hero, event tracks, and live countdown.
- **Registration Funnel** (`/register`): Multi-step state machine for onboarding.
- **Participant Dashboard** (`/dashboard`): Team status, live schedule, and ticket submission modal.
- **Community Hub** (`/community`): Filterable forum feed with markdown support.
- **Admin Dashboard** (`/admin`): System metrics, user directory, and role modification tables.
- **Mentor Queue** (`/mentor-queue`): Live auto-polling queue of active tickets.

## Backend APIs
- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forget-password`
- **Users**: `GET /api/users`, `PUT /api/users/{id}/role`
- **Tickets**: `POST /api/tickets`, `GET /api/tickets/queue`, `PUT /api/tickets/{id}/status`
- **Teams**: `POST /api/teams`, `POST /api/teams/{id}/members`
- **Registrations**: `POST /api/registrations`, `GET /api/registrations/me`
- **Community**: `POST /api/community`, `GET /api/community`

## Database Entities (PostgreSQL)
- `users`: Core identity and role management.
- `teams` & `team_members`: Hackathon team grouping.
- `tickets`: Mentor requests tracking status and timestamps.
- `registrations`: Extended hacker profiles (GitHub, LinkedIn, Skills).
- `community_posts`: Forum posts with categories.

## Notification Flows
- **Push Notification Trigger**: When an Agent accepts a ticket, a push notification is dispatched to the User's FCM/APNS token indicating "A mentor is on their way!".
- **Push Notification Trigger**: When an Admin makes a global announcement, a broadcast push notification is sent to all active devices.

## Admin Dashboard Scope
- View all 100+ seeded users in a data table.
- Update user roles (e.g., promote a User to an Agent).
- View high-level metrics: Total active tickets, unresolved tickets, total registered hackers.

## Assumptions
- Users have GitHub and LinkedIn accounts.
- The event operates in a single timezone.
- Agents are physically present at the venue or available via a third-party call link.

## Out-of-Scope Items
- **Real-Time Chat & Video Calling**: Currently out of scope. (This is intentionally reserved for Step 2: CometChat Integration).
- **Advanced Code-Execution Environments**: We are routing mentors, not providing an online IDE.

## Acceptance Criteria
- A user can register, log in, and submit a mentor ticket.
- An Agent can view the ticket in the queue and change its status.
- An Admin can view the user directory and change roles.
- The Next.js frontend and Go backend communicate securely via JWTs.
- The Native Mobile shells successfully compile and interface with the API.

## Testing Plan
- **Backend**: Unit testing the Chi router endpoints and PostgreSQL queries.
- **Frontend**: Manual end-to-end testing of the registration funnel, JWT cookie persistence, and layout responsiveness.
- **Security**: Verifying that RBAC middleware strictly rejects unauthorized role access.

## Demo Plan
1. Demonstrate the public landing page and seamless registration flow.
2. Log in as the newly created User and submit a Mentor Request from the Dashboard.
3. Log in as an Agent on a separate browser, view the live Mentor Queue, and accept the ticket.
4. Log in as an Admin, view the system metrics reflecting the active ticket, and upgrade a User to a Moderator.