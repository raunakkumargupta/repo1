# Scope of Work: Hackathon Command & Mentor Routing Matrix

## Application Use Case
The application is a centralized dispatch and communication platform designed for managing high-concurrency technical events and hackathons. It handles team formation, real-time participant collaboration, and a specialized routing system to connect hackathon teams with available technical mentors.

## Problem Statement
During large-scale hackathons, participants face severe bottlenecks when seeking technical help. Organizers rely on fragmented communication tools that lack structured ticketing, leading to lost requests and chaotic event management. A production-ready application is required to cleanly handle user roles, ticket routing, real-time support chats, and platform-wide moderation.

## Target Users
*   **Participants:** Individuals hacking on projects who require team collaboration tools and fast technical support.
*   **Mentors/Subject Matter Experts:** Professionals providing technical guidance who need a structured queue of help requests.
*   **Event Organizers:** Hackathon administrators who need global oversight, user management, and broadcast capabilities.

## User Roles
*   **Admin (Organizer):** Full system access.
*   **Manager (Lead Mentor):** Oversees the mentor queue and active mentor-participant chats.
*   **Agent (Mentor):** Accepts incoming help tickets and engages in 1-on-1 support chats with participants.
*   **User (Participant):** Submits mentor requests and chats within their dedicated team group.
*   **Moderator:** Monitors public event channels for spam or inappropriate content.

## User Permissions
*   **Admins:** Create/Read/Update/Delete (CRUD) on all entities; full access to the admin dashboard.
*   **Managers:** Read all tickets; update ticket assignments.
*   **Agents:** Read unassigned tickets; update the status of assigned tickets.
*   **Users:** Create and update their own profiles; create tickets; read own team data.
*   **Moderators:** Read public channels; flag or delete messages.

## User Workflows
*   **Participant Workflow:** Registers -> Joins a Team -> Submits a "Mentor Request" activity -> Receives a push notification when an Agent accepts -> Chats with the Agent -> Ticket is marked resolved.
*   **Agent Workflow:** Logs in -> Views active ticket queue -> Accepts a ticket -> Joins a support chat with the User -> Resolves the issue.
*   **Admin Workflow:** Logs into the web dashboard -> Views system usage and webhook activity -> Monitors moderation logs.

## Screens/Pages
**Frontend (Next.js - Admin & Mentor Web App):**
*   Login and Registration screens.
*   Admin Dashboard.
*   Role-specific screens (Mentor Support Queue).
*   Activity screens (Active Tickets).
*   Error, empty, and loading states.

**Mobile (Flutter - Participant App):**
*   Login and Registration screens.
*   User dashboard (Team Status).
*   Notification UI.
*   Profile screen.

## Backend APIs
*   REST APIs built with Go.
*   Authentication and Authorization endpoints.
*   User and Role management APIs.
*   Activity and Notification trigger APIs.
*   Admin APIs.

## Database Entities
*   **Users:** Manages credentials, roles, and profiles for 100+ seeded users.
*   **Teams:** Manages team structures and project links.
*   **Tickets:** Tracks user activities (mentor requests), statuses, and assigned agents.
*   **Announcements:** Stores global broadcast messages.

## Notification Flows
*   **Pre-Integration (App Core):** Push notifications are triggered for selected user activities, such as a new task (ticket) assigned or a request updated.
*   **Post-Integration (CometChat):** Existing app notifications continue working alongside CometChat push notifications for one-on-one messages, group messages, and calls.

## Admin Dashboard Scope
*   View, create, update, and deactivate users.
*   Assign roles or levels.
*   View user activities and notification logs.
*   Search or filter users and activities.
*   View basic system-level usage summaries.

## Assumptions
*   The system will process high concurrent reads during event announcements, mitigated by Redis caching.
*   FCM (Firebase Cloud Messaging) is used for all device token handling and push notification delivery.
*   All seeded users and new registrants will be automatically synced with CometChat UIDs.

## Out-of-Scope Items
*   Live video broadcasting functionality.
*   Automated resume parsing or algorithmic team matching.
*   Payment gateways or financial transactions.

## Acceptance Criteria
*   **Step 1:** The production-ready app is functional with an implemented frontend, backend, and admin dashboard. 100+ users are seeded with different roles and levels. Push notifications for app activities work.
*   **Step 2:** Existing and new users are synced with CometChat. Real-time messaging, agent chat, and moderation features work. Existing app push notifications continue working alongside CometChat notifications. At least one webhook use case is implemented and visible in the dashboard.

## Testing Plan
*   **Multi-Outcome Edge Case Testing:** Verify system stability under varied outcomes, including network drops during chat sessions, invalid ticket assignments, and unauthorized API access attempts.
*   **Database Validation:** Confirm seeders accurately generate 100+ users across all required roles.
*   **Webhook Integrity:** Test CometChat webhook payload processing to ensure database logging does not fail under high message volumes.

## Demo Plan
1.  Admin logs in and views seeded users, verifying role assignments.
2.  User logs in and performs an activity triggering an existing app push notification.
3.  User opens CometChat, sending a one-on-one message and joining a group conversation to demonstrate real-time updates and typing indicators.
4.  User chats with an agent, who responds from the agent dashboard.
5.  A moderation rule is triggered and demonstrated.
6.  A webhook event is received, logged, and viewed by the admin in the dashboard.