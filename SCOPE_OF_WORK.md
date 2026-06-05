# Scope of Work: Hackathon Command & Mentor Routing Matrix

## Application Use Case
The application is a centralized dispatch and communication platform designed for managing high-concurrency technical events and hackathons[cite: 1]. It handles team formation, real-time participant collaboration, and a specialized routing system to connect hackathon teams with available technical mentors[cite: 1].

## Problem Statement
During large-scale hackathons, participants face severe bottlenecks when seeking technical help. Organizers rely on fragmented communication tools that lack structured ticketing, leading to lost requests and chaotic event management. A production-ready application is required to cleanly handle user roles, ticket routing, real-time support chats, and platform-wide moderation[cite: 1].

## Target Users
*   **Participants:** Individuals hacking on projects who require team collaboration tools and fast technical support[cite: 1].
*   **Mentors/Subject Matter Experts:** Professionals providing technical guidance who need a structured queue of help requests[cite: 1].
*   **Event Organizers:** Hackathon administrators who need global oversight, user management, and broadcast capabilities[cite: 1].

## User Roles
*   **Admin (Organizer):** Full system access[cite: 1].
*   **Manager (Lead Mentor):** Oversees the mentor queue and active mentor-participant chats[cite: 1].
*   **Agent (Mentor):** Accepts incoming help tickets and engages in 1-on-1 support chats with participants[cite: 1].
*   **User (Participant):** Submits mentor requests and chats within their dedicated team group[cite: 1].
*   **Moderator:** Monitors public event channels for spam or inappropriate content[cite: 1].

## User Permissions
*   **Admins:** Create/Read/Update/Delete (CRUD) on all entities; full access to the admin dashboard[cite: 1].
*   **Managers:** Read all tickets; update ticket assignments[cite: 1].
*   **Agents:** Read unassigned tickets; update the status of assigned tickets[cite: 1].
*   **Users:** Create and update their own profiles; create tickets; read own team data[cite: 1].
*   **Moderators:** Read public channels; flag or delete messages[cite: 1].

## User Workflows
*   **Participant Workflow:** Registers -> Joins a Team -> Submits a "Mentor Request" activity -> Receives a push notification when an Agent accepts -> Chats with the Agent -> Ticket is marked resolved[cite: 1].
*   **Agent Workflow:** Logs in -> Views active ticket queue -> Accepts a ticket -> Joins a support chat with the User -> Resolves the issue[cite: 1].
*   **Admin Workflow:** Logs into the web dashboard -> Views system usage and webhook activity -> Monitors moderation logs[cite: 1].

## Screens/Pages
**Frontend (Next.js - Admin & Mentor Web App):**
*   Login and Registration screens[cite: 1].
*   Admin Dashboard[cite: 1].
*   Role-specific screens (Mentor Support Queue)[cite: 1].
*   Activity screens (Active Tickets)[cite: 1].
*   Error, empty, and loading states[cite: 1].

**Mobile (Flutter - Participant App):**
*   Login and Registration screens[cite: 1].
*   User dashboard (Team Status)[cite: 1].
*   Notification UI[cite: 1].
*   Profile screen[cite: 1].

## Backend APIs
*   REST APIs built with Go[cite: 1].
*   Authentication and Authorization endpoints[cite: 1].
*   User and Role management APIs[cite: 1].
*   Activity and Notification trigger APIs[cite: 1].
*   Admin APIs[cite: 1].

## Database Entities
*   **Users:** Manages credentials, roles, and profiles for 100+ seeded users[cite: 1].
*   **Teams:** Manages team structures and project links.
*   **Tickets:** Tracks user activities (mentor requests), statuses, and assigned agents[cite: 1].
*   **Announcements:** Stores global broadcast messages.

## Notification Flows
*   **Pre-Integration (App Core):** Push notifications are triggered for selected user activities, such as a new task (ticket) assigned or a request updated[cite: 1].
*   **Post-Integration (CometChat):** Existing app notifications continue working alongside CometChat push notifications for one-on-one messages, group messages, and calls[cite: 1].

## Admin Dashboard Scope
*   View, create, update, and deactivate users[cite: 1].
*   Assign roles or levels[cite: 1].
*   View user activities and notification logs[cite: 1].
*   Search or filter users and activities[cite: 1].
*   View basic system-level usage summaries[cite: 1].

## Assumptions
*   The system will process high concurrent reads during event announcements, mitigated by Redis caching.
*   FCM (Firebase Cloud Messaging) is used for all device token handling and push notification delivery.
*   All seeded users and new registrants will be automatically synced with CometChat UIDs[cite: 1].

## Out-of-Scope Items
*   Live video broadcasting functionality.
*   Automated resume parsing or algorithmic team matching.
*   Payment gateways or financial transactions.

## Acceptance Criteria
*   **Step 1:** The production-ready app is functional with an implemented frontend, backend, and admin dashboard[cite: 1]. 100+ users are seeded with different roles and levels[cite: 1]. Push notifications for app activities work[cite: 1].
*   **Step 2:** Existing and new users are synced with CometChat[cite: 1]. Real-time messaging, agent chat, and moderation features work[cite: 1]. Existing app push notifications continue working alongside CometChat notifications[cite: 1]. At least one webhook use case is implemented and visible in the dashboard[cite: 1].

## Testing Plan
*   **Multi-Outcome Edge Case Testing:** Verify system stability under varied outcomes, including network drops during chat sessions, invalid ticket assignments, and unauthorized API access attempts.
*   **Database Validation:** Confirm seeders accurately generate 100+ users across all required roles[cite: 1].
*   **Webhook Integrity:** Test CometChat webhook payload processing to ensure database logging does not fail under high message volumes[cite: 1].

## Demo Plan
1.  Admin logs in and views seeded users, verifying role assignments[cite: 1].
2.  User logs in and performs an activity triggering an existing app push notification[cite: 1].
3.  User opens CometChat, sending a one-on-one message and joining a group conversation to demonstrate real-time updates and typing indicators[cite: 1].
4.  User chats with an agent, who responds from the agent dashboard[cite: 1].
5.  A moderation rule is triggered and demonstrated[cite: 1].
6.  A webhook event is received, logged, and viewed by the admin in the dashboard[cite: 1].