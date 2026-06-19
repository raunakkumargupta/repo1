# Demo Guide & Step-by-Step Script

This guide provides a step-by-step script for reproducing the complete workflow of the **Matrix Hackathon Command Platform** to showcase the full-stack system and CometChat integration.

---

## Prepare for the Demo

### 1. Verification Credentials
Use the pre-seeded credentials (all passwords are `M@tr1x_P@ssw0rd!2026`):
- **Super Admin**: `admin@matrix.com`
- **Hacker 1 (Leader)**: `hacker1@matrix.com` (Team: `HackerTeam1`)
- **Hacker 2 (Member)**: `hacker2@matrix.com` (Team: `HackerTeam1`)
- **Hacker 3 (Solo)**: `hacker3@matrix.com` (Looking for team)
- **Technical Mentor**: `mentor@matrix.com`

### 2. Startup Verification
Verify that both servers and databases are running locally:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`

---

## Demo Script Steps

### Step 1: Admin Log In & User Directory Check
1. Open a browser tab and navigate to `http://localhost:3000/login`.
2. Enter the Super Admin credentials (`admin@matrix.com` / `M@tr1x_P@ssw0rd!2026`).
3. Click **Log In**.
4. Navigate to the **Super Admin Panel** (`/super-admin/organizers` or `/admin`).
5. Verify the seeded users table displays the 100+ registered users with their roles (`Hacker`, `Mentor`, etc.).

---

### Step 2: Role Management & Pre-Existing User Sync
1. In the Super Admin panel, locate a user (e.g. `Hacker 3`) and update their role to a `Mentor` or back.
2. Click **Sync Users with CometChat** (calls `POST /api/admin/cometchat/sync-users` backend backfill).
3. Verify the success message indicating that seeded users are successfully registered/synced with CometChat.

---

### Step 3: Hacker Registration Onboarding (Existing App Workflows)
1. Open an incognito browser tab and navigate to `/register`.
2. Fill out the registration form for a new account (e.g. `hacker99@example.com`).
3. Proceed through the registration funnel:
   - **Step 1**: Personal Identity (Name, Email, Password)
   - **Step 2**: Technical Profile (GitHub, LinkedIn, Resume link, Skills selection)
   - **Step 3**: Team Preference selection (`Looking for Team`).
4. Click **Submit**. You will be redirected to the Participant Dashboard.

---

### Step 4: Existing App Push Notification Flow
1. Log in as **Hacker 1** (`hacker1@matrix.com` / `M@tr1x_P@ssw0rd!2026`).
2. Go to the workspace page: `/workspace/[hackathon_id]`.
3. Submit a new **Mentor Help Request** with the description: *"React build fails with out of memory error when starting next dev"*
4. Submit the request. Verify the ticket status is displayed in the panel as `⏳ Open`.
5. Open a separate browser tab, log in as the **Technical Mentor** (`mentor@matrix.com` / `M@tr1x_P@ssw0rd!2026`).
6. Navigate to `/mentor/[hackathon_id]`.
7. Click **Accept Ticket** in the unassigned help request queue.
8. **Verify notifications**:
   - The Hacker's browser window immediately receives a top-right toast notification and a desktop notification alert: *"👨‍🏫 Mentor has claimed your support ticket and joined the chat."*
   - Verify that this toast notification matches the Step 1 custom notification flow.

---

### Step 5: Real-Time Direct Message (1-on-1 CometChat)
1. On **Hacker 1's** dashboard, navigate to **Find Teammates** page (`/workspace/[hackathon_id]/find-team`).
2. Find another hacker looking for a team (e.g. `Hacker 3`).
3. Click **Message** to open the 1-on-1 Chat Modal.
4. Send a message: *"Hey, are you interested in forming a team for the AI track?"*
5. Open an incognito window, log in as `hacker3@matrix.com`, and navigate to **Find Teammates**. Open the chat and verify the message appears in real time without refreshing the page. Note typing indicators and presence updates.

---

### Step 6: Real-Time Team Group Chat (CometChat Private Groups)
1. Log in as **Hacker 1**, go to the workspace project page (`/workspace/[hackathon_id]/project`).
2. The embedded **Team Chat** card is loaded automatically.
3. Send a message to the group chat: *"Repository created. Let's start coding the API!"*
4. Log in as **Hacker 2** (`hacker2@matrix.com` - same team) and open the project page.
5. Verify the team message appears in real-time.

---

### Step 7: Isolated Support Chat with Agent (Mentor)
1. Go back to the active ticket on **Hacker 1's** workspace dashboard.
2. Click **Join Live Chat** next to the claimed support ticket.
3. Open the **Technical Mentor's** browser tab at `/mentor/[hackathon_id]`.
4. Under the Active Workspace panel, click **Open Live Hacker Chat**.
5. The support session modal overlays open on both sides.
6. Type a message from Mentor to Hacker: *"Hi, please share your package.json contents so I can check the dependencies."*
7. **Verify**:
   - The message is updated instantly in real-time.
   - The chat content is restricted entirely to this ticket group session and is isolated from the main team chat channel.

---

### Step 8: Moderation Webhook Logging & Action
1. Set up a profanity/restricted keyword in your CometChat moderation settings (e.g. `badword`).
2. As a hacker, send a message containing `badword` in the support chat.
3. **Verify**:
   - The message is moderated in CometChat.
   - CometChat sends a webhook callback to the backend public endpoint `/api/webhooks/cometchat`.
   - The backend records this flag in the SQL database logs table.
4. Log in as the Super Admin, navigate to `/super-admin/moderation`.
5. Verify that the message sent by the hacker containing the restricted word is flagged and logged in the moderation table with its category and reason.

---

### Step 9: Support Ticket Resolution
1. As the Hacker, click **Query Resolved** in the ticket status card. (Or as the Mentor, click **Mark as Resolved**).
2. The ticket status in PostgreSQL is updated to `Resolved`.
3. **Verify**:
   - The ticket-specific private CometChat group is deleted.
   - The Live Support Chat modal closes automatically.
   - Under the Mentor's Active Workspace panel, the active ticket is cleared, and the count under **Resolved Tickets** increments by 1.

---

### Step 10: Real-Time Voice & Video Calling & Ringing Sound
1. Ensure you have **Hacker 1** (`hacker1@matrix.com`) logged in on your primary browser, and **Hacker 3** (`hacker3@matrix.com`) logged in on an Incognito tab.
2. In Hacker 1's browser window, navigate to **Find Teammates** and click **Message** on Hacker 3's card.
3. Observe the Call and Video Call icons are displayed in the chat header.
4. Click the **Video Call** icon.
5. **Verify Outgoing Ringing**:
   - Hacker 1's window shows a dialing call panel.
   - Hacker 3's window receives a slide-in incoming call popup card.
   - **Ringing Tone**: Hacker 3's browser plays a programmatic dual-frequency double-beep ringtone (Web Audio synthesized).
6. Click **Accept** on Hacker 3's call banner.
7. **Verify WebRTC Connection**:
   - The ringing sound stops immediately.
   - Both screens load the WebRTC video feeds container.
8. Click the red **End Call** button on either screen.
9. Verify the calling session terminates successfully, the media interface closes, and the normal chat screen is restored on both ends.
