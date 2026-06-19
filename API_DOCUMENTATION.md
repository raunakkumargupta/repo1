# API Documentation

This document describes all REST API endpoints available in the **Matrix Hackathon Command Platform** backend.

## Base URL
All API endpoints are relative to the backend server URL (e.g., `http://localhost:8080` or the production API domain).

## Authentication & Headers
- Most protected endpoints require a valid JSON Web Token (JWT) sent via:
  - **Cookies**: An `HttpOnly` cookie named `token` (for web applications)
  - **Headers**: `Authorization: Bearer <JWT_TOKEN>` (primarily for mobile apps)
- Requests with a payload must include `Content-Type: application/json`.

---

## 1. Authentication APIs

### Register User
Create a new account.
- **Method**: `POST`
- **Route**: `/api/auth/register`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePassword123!",
    "role": "Hacker"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "e27a6c9e-5b12-4c22-b91c-2234abcc9988",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "Hacker"
  }
  ```

### Login User
Authenticate and receive a JWT.
- **Method**: `POST`
- **Route**: `/api/auth/login`
- **Authentication**: None (Rate-limited to 10 requests per 10 seconds per IP)
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK)**:
  - Sets `token` cookie.
  - Body:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "e27a6c9e-5b12-4c22-b91c-2234abcc9988",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "Hacker"
      }
    }
    ```

### Request Password Reset
Generates a random reset token.
- **Method**: `POST`
- **Route**: `/api/auth/forget-password`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "email": "jane@example.com"
  }
  ```
- **Response (200 OK)**: Empty object. (Simulated email output printed to backend console).

### Reset Password
Reset password using token.
- **Method**: `POST`
- **Route**: `/api/auth/reset-password`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "token": "45f8b90a6e382d...",
    "new_password": "NewSecurePassword123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Password reset successfully"
  }
  ```

### Logout User
Clears the JWT cookie and blacklists token.
- **Method**: `POST`
- **Route**: `/api/auth/logout`
- **Authentication**: Required
- **Response (200 OK)**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

---

## 2. Profile and Identity APIs

### Get Current User
- **Method**: `GET`
- **Route**: `/api/auth/me`
- **Authentication**: Required
- **Response (200 OK)**:
  ```json
  {
    "id": "e27a6c9e-5b12-4c22-b91c-2234abcc9988",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "Hacker",
    "fcm_token": "fcm_token_xyz"
  }
  ```

### Update Profile
Create or update detailed Hacker profile (GitHub, LinkedIn, resume, etc.)
- **Method**: `POST`
- **Route**: `/api/profile/me`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "github_url": "https://github.com/janedoe",
    "linkedin_url": "https://linkedin.com/in/janedoe",
    "skills": "[\"Golang\", \"Next.js\", \"PostgreSQL\"]",
    "team_preference": "Looking for Team",
    "resume_url": "https://resume.example.com/jane.pdf"
  }
  ```
- **Response (200 OK)**: Updated profile model.

### Register FCM Token
Store device push token.
- **Method**: `POST`
- **Route**: `/api/users/fcm-token`
- **Authentication**: Required
- **Request Body**:
  ```json
  {
    "token": "d7a8b9e0f3..."
  }
  ```
- **Response (200 OK)**: Success status.

---

## 3. Team Management APIs

### Create Team
- **Method**: `POST`
- **Route**: `/api/hackathons/{id}/teams`
- **Authentication**: Required (Role: Hacker)
- **Request Body**:
  ```json
  {
    "team_name": "Go Masters"
  }
  ```
- **Response (201 Created)**: Team details.

### Get My Team
- **Method**: `GET`
- **Route**: `/api/hackathons/{id}/my-team`
- **Authentication**: Required
- **Response (200 OK)**:
  ```json
  {
    "team": {
      "id": "67f12a23-4567-89ab-cdef-0123456789ab",
      "team_name": "Go Masters",
      "hackathon_id": "hackathon_uuid",
      "owner_id": "user_uuid"
    },
    "members": [
      {
        "id": "user_uuid",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "Hacker"
      }
    ]
  }
  ```

### Invite User
Owner invites hacker.
- **Method**: `POST`
- **Route**: `/api/hackathons/{id}/teams/{team_id}/invite`
- **Authentication**: Required (Owner of the team)
- **Request Body**:
  ```json
  {
    "user_email": "teammate@example.com"
  }
  ```
- **Response (201 Created)**: Invitation details.

### Request to Join Team
Hacker requests to join an existing team.
- **Method**: `POST`
- **Route**: `/api/hackathons/{id}/teams/{team_id}/request`
- **Authentication**: Required
- **Response (201 Created)**: Join request details.

---

## 4. Tickets (Mentor Queue) APIs

### Create Ticket
Submit a bug or problem.
- **Method**: `POST`
- **Route**: `/api/hackathons/{id}/tickets`
- **Authentication**: Required (Hacker - must be in a team)
- **Request Body**:
  ```json
  {
    "team_id": "67f12a23-4567-89ab-cdef-0123456789ab",
    "description": "Docker container fails with port conflict error when running docker-compose up."
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "ticket_uuid",
    "team_id": "67f12a23-4567-89ab-cdef-0123456789ab",
    "description": "Docker container fails...",
    "status": "Open",
    "created_at": "2026-06-18T12:00:00Z"
  }
  ```

### Get My Team's Tickets
- **Method**: `GET`
- **Route**: `/api/hackathons/{id}/my-tickets`
- **Authentication**: Required
- **Response (200 OK)**: Array of team tickets.

### Resolve Ticket (Hacker side)
- **Method**: `PUT`
- **Route**: `/api/hackathons/{id}/tickets/{ticket_id}/resolve`
- **Authentication**: Required (Hacker)
- **Response (200 OK)**: Success status.

### Get Unassigned Queue (Mentor side)
- **Method**: `GET`
- **Route**: `/api/hackathons/{id}/tickets`
- **Authentication**: Required (Mentor/Organizer/Admin)
- **Response (200 OK)**: Array of open tickets.

### Get Resolved Tickets (Mentor side)
- **Method**: `GET`
- **Route**: `/api/hackathons/{id}/tickets/resolved`
- **Authentication**: Required (Mentor)
- **Response (200 OK)**: Array of tickets resolved by this mentor.

### Update Ticket Status (Accept/Resolve - Mentor side)
Claims or resolves a support ticket.
- **Method**: `PUT`
- **Route**: `/api/tickets/{ticket_id}/status`
- **Authentication**: Required (Mentor)
- **Request Body**:
  ```json
  {
    "status": "Active" // or "Resolved"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Ticket status updated successfully"
  }
  ```

---

## 5. Admin & Moderation APIs

### Get System Metrics
- **Method**: `GET`
- **Route**: `/api/admin/metrics`
- **Authentication**: Required (SuperAdmin/Admin)
- **Response (200 OK)**:
  ```json
  {
    "total_users": 105,
    "active_hackathons": 2
  }
  ```

### Get Moderation & Activity Logs
Surfaces webhook logs to the dashboard.
- **Method**: `GET`
- **Route**: `/api/admin/moderation/logs`
- **Authentication**: Required (SuperAdmin/Admin)
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "log_uuid",
      "event_type": "moderation_flag",
      "sender_uid": "user_uuid",
      "sender_name": "Naughty Hacker",
      "receiver_id": "ticket_uuid",
      "message_text": "Buy these illegal pills at scam.com!",
      "is_flagged": true,
      "flag_category": "profanity",
      "flag_reason": "banned_keyword",
      "created_at": "2026-06-18T15:20:00Z"
    }
  ]
  ```

### Sync Users to CometChat (Backfill)
- **Method**: `POST`
- **Route**: `/api/admin/cometchat/sync-users`
- **Authentication**: Required (SuperAdmin/Admin)
- **Response (200 OK)**:
  ```json
  {
    "total_users": 104,
    "synced": 98,
    "failed": 0
  }
  ```

### Ban/Deactivate User
- **Method**: `PUT`
- **Route**: `/api/admin/users/{id}/status`
- **Authentication**: Required (SuperAdmin/Admin)
- **Request Body**:
  ```json
  {
    "status": "deactivated"
  }
  ```
- **Response (200 OK)**: Status updated.

---

## 6. CometChat Webhook Receiver

- **Method**: `POST`
- **Route**: `/api/webhooks/cometchat`
- **Authentication**: Public endpoint (validated via header matching or IP restrictions)
- **Request Body**:
  ```json
  {
    "trigger": "after_message_moderated",
    "appId": "cometchat_app_id",
    "createdAt": 1781252000,
    "data": {
      "sender": "user_uuid",
      "receiver": "ticket_uuid",
      "receiverType": "group",
      "type": "text",
      "data": {
        "text": "Buy these illegal pills at scam.com!"
      },
      "moderation": {
        "isFlagged": true,
        "category": "profanity",
        "reason": "banned_keyword"
      }
    }
  }
  ```
- **Response (200 OK)**: (Always returns 200 OK to acknowledge receipt)
  ```json
  {
    "status": "success"
  }
  ```
