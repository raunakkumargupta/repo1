# Testing Notes & Validation Scenarios

This document outlines the test cases, execution instructions, expected inputs/outputs, and validation checklist for the **Matrix Hackathon Command Platform** (Step 1 and Step 2).

---

## 1. Automated Tests

### Backend Unit and Integration Tests
To run the Go backend test suite, execute the following command in the `backend/` directory:
```bash
go test -v ./...
```
Tests cover:
- Password hashing and JWT generation.
- RBAC middleware (`RequireRole`).
- DB repository queries and Redis connection health.
- Ticket queue creation and lifecycle state machine.

### Frontend Linting
To validate TypeScript types and ESLint constraints:
```bash
cd frontend
npm run lint
```

---

## 2. Manual Test Cases (Step 1 & Step 2 Validation)

### Scenario 1: Registration Funnel & User Seeding
- **Action**: Register a new user at `/register`. Proceed through the 3-step state funnel (1: Identity details -> 2: Tech profile -> 3: Team preference).
- **Verification**:
  - Verify database writes `users` and `registrations` tables.
  - Check the backend server logs. Verify async call to CometChat `CreateUser` responds with status `201 Created` or `200 OK`.
  - Validate that registering an existing email returns:
    - **Status**: `400 Bad Request` or `409 Conflict`
    - **Body**: `{"message": "user with this email already exists"}`
- **Seeded Users Check**:
  - Run the seed script: `docker-compose exec backend ./scripts/seed` (or run backend's seed cmd).
  - Verify that 100+ realistic users are present in the SQL database.

---

### Scenario 2: Authentication & Role-Based Access Control (RBAC)
- **Hacker Access Control**:
  - Log in as a Hacker (role `Hacker`).
  - Attempt to call Admin dashboard API `GET /api/admin/metrics`.
  - **Expected Outcome**: Mismatch rejected by `RequireRole` middleware, returns `403 Forbidden`.
- **Mentor Access Control**:
  - Log in as a Mentor (role `Mentor`).
  - Try to access `/admin`. Redirected to `/login` or blocked.
  - Navigate to `/mentor/[hackathon_id]`. Verify queue loads successfully.
- **Admin Access Control**:
  - Log in as `admin@matrix.com` / `M@tr1x_P@ssw0rd!2026`.
  - Navigate to `/admin`. Directory of users and global platform statistics load correctly.

---

### Scenario 3: Live Mentor Help Ticket Lifecycle & Chat Isolation
- **Hacker Request Help**:
  - Log in as a Hacker, navigate to `/workspace/{hackathon_id}`.
  - Submit a mentor request with a description.
  - Check team ticket history panel. Status shows `⏳ Open`.
  - **Spam Guard Test**: Try submitting a second ticket.
    - **Expected Outcome**: Button is disabled, or API returns a conflict error: `"your team already has an open ticket. Please wait for it to be resolved before creating another"`.
- **Mentor Claim Ticket**:
  - Open a separate browser window and log in as a Mentor.
  - Navigate to the ticket desk. The Hacker's request appears in the live queue.
  - Click **Accept Ticket**.
  - **Expected Outcome**:
    - Ticket status changes from `Open` to `Active` (In Progress).
    - Hacker's dashboard receives an FCM push notification (or top-right toast alert) saying "Mentor has joined your chat!".
    - **CometChat Group Provisioning**: Backend creates a private CometChat group with GUID = `ticket_id`. Adds the claiming mentor and all hacker team members as participants.
- **Hacker & Mentor Real-Time Support Chat**:
  - Hacker clicks **Join Live Chat** in their ticket panel.
  - Mentor clicks **Open Live Hacker Chat** on the right workspace card.
  - Send messages, check typing indicators, presence, and read receipts.
  - Verify chat history is completely isolated to this specific ticket.
- **Ticket Resolution**:
  - Hacker clicks **Query Resolved** (or Mentor clicks **Mark as Resolved**).
  - **Expected Outcome**:
    - Ticket status becomes `Resolved`.
    - Ticket-specific CometChat private group is deleted programmatically from CometChat servers (`DeleteGroup` REST API called on the backend).
    - Chat overlays close automatically.

---

### Scenario 4: Content Moderation & Webhook Log Auditing
- **Setup**: Add a banned keyword rule on your CometChat dashboard (e.g. block keyword `badword`).
- **Send Flagged Message**:
  - Log in as a Hacker, open Team Chat or Support Chat.
  - Send a message containing `badword`.
  - **Expected Outcome**:
    - CometChat moderation rules intercept and flag the message.
    - CometChat fires a POST request to `/api/webhooks/cometchat` with trigger `after_message_moderated`.
    - Backend parses webhook, identifies flag status, and saves it to the `moderation_logs` database table.
- **Admin Logs Audit**:
  - Log in as SuperAdmin, navigate to `/super-admin/moderation` (or view `/api/admin/moderation/logs`).
  - **Expected Outcome**: The flagged message details (Sender, Receiver, Banned text, Category, Reason) appear at the top of the audit table.

---

### Scenario 5: Pre-Existing User Sync (Backfill)
- **Setup**: Seed the database with users who do not exist on CometChat.
- **Action**: Log in as SuperAdmin and call `/api/admin/cometchat/sync-users` (or click "Sync Users" on SuperAdmin panel).
- **Verification**:
  - Verify console logs show sequential creation calls.
  - Return body contains counts: `{"total_users": 105, "synced": 98, "failed": 0}` (existing users return 409 and are skipped without errors).
  - Seeded users are now able to log in and chat immediately.

---

### Scenario 6: Voice & Video Calling & Ringing Sound
- **Setup**: Use **two isolated browser contexts** (e.g. Chrome normal window + Chrome incognito, or two different browsers). Log in as **Hacker 1** in one, and **Hacker 3** in the other.
- **Action**:
  - In Hacker 1's browser window, open the 1-on-1 chat modal with Hacker 3 (from Find Teammates page).
  - Notice the Call and Video Call buttons are rendered in the `CometChatMessageHeader`.
  - Click the **Video Call** icon.
- **Verification**:
  - **Caller Side**: Outgoing call screen appears showing a dialing spinner.
  - **Recipient Side (Hacker 3)**: A slide-in `<CometChatIncomingCall />` alert overlay pops up presenting Accept and Decline buttons.
  - **Ringing Sound**: A dual-frequency beep tone (440Hz + 480Hz telephone ring) is played programmatically on the recipient's browser.
  - **Decline / Accept Action**:
    - If Hacker 3 clicks **Decline**, the sound stops instantly and both call overlays close.
    - If Hacker 3 clicks **Accept**, the sound stops, and both browsers connect to the WebRTC video session container. Clicking **End Call** closes the connection on both sides.
