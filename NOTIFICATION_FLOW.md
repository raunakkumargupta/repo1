# Notification Flow & Architecture

This document describes the notification pipeline implemented in the **Matrix Hackathon Command Platform**, covering:
1. **Application-level activities** (FCM tokens, PostgreSQL routing, async background workers).
2. **CometChat-level communication events** (real-time chat pushes, incoming calls, missed calls).
3. **Frontend presentation** (custom UI toasts, web desktop notifications).

---

## 1. Core Architecture

The notification engine keeps chat notifications and application state notifications decoupled to guarantee that chat integration does not regress or break existing workflows (Step 1 compliance).

```
[ App-Level Activity Trigger ]
  ├── Mentor claims ticket
  ├── Admin broadcasts announcement
  └── Project gets winner badge
       │
       ▼ (Go Backend Service)
  Enqueue Worker Job (worker.Job{Type: "FCM_NOTIFICATION"})
       │
       ▼ (Asynchronous Goroutine Worker)
  Dispatch push payloads via Firebase Admin Client
       │
       ├─────────────────────────┼─────────────────────────┐
       ▼                         ▼                         ▼
  (Hacker Mobile Device)   (Mentor Mobile Device)    (Web Browser Interface)
  APNS / FCM Native Push    APNS / FCM Native Push   Real-time Toast Alert (Top-Right)
                                                     & browser desktop push API

[ CometChat Message / Call Activity ]
  ├── 1-on-1/Group Chat Sent
  └── Incoming/Missed Call Event
       │
       ▼ (CometChat WebSocket / APNS-FCM Push Provider)
  CometChat Native Push Channels & Web Client SDK listeners
```

---

## 2. Application-Level Push Notifications (FCM)

### FCM Token Management
When a user logs into either the Web frontend or Native Mobile app, the client retrieves a token from Firebase Cloud Messaging (FCM) and registers it on the backend:
- **API Endpoint**: `POST /api/users/fcm-token`
- **Database Column**: Stored directly in the `users` table (`fcm_token` and `apns_token`).
- **Authorization**: Protected via JWT.

### Asynchronous Worker Execution
To prevent network delays to Firebase servers from slowing down REST API responses, the backend utilizes an asynchronous worker pool queue:
1. A controller handler updates ticket state or issues an announcement.
2. It pushes a job payload to the `WorkerPool`.
3. An active goroutine picks up the job, retrieves target device tokens from PostgreSQL, compiles the FCM JSON payload, and calls the Google FCM HTTP v1 API.

### Target Notification Flows

#### A. Mentor Claims Support Ticket
- **Trigger**: Mentor clicks "Accept Ticket" on the dashboard (`PUT /tickets/{ticket_id}/status` to `Active`).
- **Query**: Backend retrieves `fcm_token` for all hackers in the ticket's `team_id`.
- **Payload**:
  ```json
  {
    "notification": {
      "title": "Mentor Assigned!",
      "body": "A mentor has claimed your support ticket and is on their way."
    },
    "data": {
      "ticket_id": "uuid",
      "status": "Active",
      "click_action": "/workspace/hackathon_id"
    }
  }
  ```

#### B. Event Broadcast / Announcement
- **Trigger**: Organizer or SuperAdmin posts a broadcast message.
- **Query**: Backend fetches active tokens for all hackers registered for the hackathon.
- **Payload**:
  ```json
  {
    "notification": {
      "title": "Global Announcement",
      "body": "The hacking phase ends in 1 hour. Submit your project repositories now!"
    }
  }
  ```

---

## 3. CometChat Communication Notifications

CometChat notifications are enabled natively for messages and calls:

### 1. One-on-One and Group Messages
- Handles real-time indicators when the recipient's app is in the background or closed.
- Integrates with the CometChat Push Notifications Extension configured in the CometChat dashboard.
- Users receive native alerts on mobile or desktop when they receive a new direct message or group mention.

### 2. Video and Audio Call Alerts & Web Ringing Sound
- **Incoming Calls Overlay**: Triggers a prebuilt `<CometChatIncomingCall />` modal layout dynamically imported inside the React context provider.
- **Ringing Sound (Audible Alert)**: Uses the **Web Audio API** internally to generate a dual-frequency telephone ring (440Hz + 480Hz double beep) programmatically in real-time when an `onIncomingCallReceived` event fires. This operates without loading any external network files. The tone automatically pauses when the call is accepted, rejected, cancelled, or ended.
- **Missed Calls**: Sends a summary alert containing the caller name and timestamp if the call is rejected or unanswered.
- **Presence Indicators**: Visual cues (Online, Offline, Away) are updated dynamically in the UI header via `subscribePresenceForAllUsers()`.

---

## 4. Frontend Web UI Presentation

The Next.js client presents notifications to active users in two premium formats:

### 1. Real-Time Top-Right Toast Alerts
- Powered by a custom context provider that polls ticket updates or listens to live WebSocket messages.
- Slide-in card overlays display in the top-right corner with distinct color themes:
  - **Success (Green)**: Team join accepted, ticket resolved.
  - **Info (Blue)**: Chat message received, mentor assigned.
  - **Warning (Yellow)**: Action required, submission deadline warning.
  - **Error (Red)**: Request failed.

### 2. Browser Desktop Push API
- If the browser is in the background, the app requests notification permissions:
  ```ts
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      new Notification('Matrix Hackathon Matrix', {
        body: 'A mentor has joined your chat session.',
        icon: '/favicon.ico'
      });
    }
  });
  ```
- Ensures users are notified even when coding in an external editor.
