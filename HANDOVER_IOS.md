# HANDOVER_IOS.md — Matrix Command iOS App (SwiftUI)
**Date:** June 10, 2026  
**Project:** Hackathon Command & Mentor Routing Matrix — Native iOS Application  
**Handover Purpose:** Build the native iOS app from scratch using Swift and SwiftUI, targeted exclusively at **Hacker/Participant users**. All other roles (Organizer, Admin, Mentor, Judge) manage operations on the Next.js web application.

> **App Name:** `Matrix Command`  
> **Aesthetic Target:** High-fidelity, premium dark navy glassmorphic UI. Harmonies of HSL-derived colors, smooth micro-animations, custom gradients, and SwiftUI transitions.
> **DO NOT** use the name "Hack2Skill" — that is a reference brand only.

---

## 1. High-Level Architecture
- **Tech Stack:** Native iOS app using Swift, SwiftUI, and standard iOS architectures (e.g., MVVM).
- **Network Layer:** Use `URLSession` or `Alamofire` for API calls, with JSON encoding/decoding matching backend schemas.
- **Authentication:** Keep users logged in by saving their JWT in the **iOS Keychain** (never in UserDefaults). Intercept all network requests to inject the `Authorization: Bearer <token>` header if a token is present.
- **Base API URL:** `http://192.168.29.115:8080/api/` (Use local LAN IP of the Go backend. Be sure to configure App Transport Security in `Info.plist` to allow HTTP or local network access for development).

---

## 2. Design System & Theme
Use these exact hex colors in your SwiftUI views/assets for a matching dark navy look:

| Asset Name | Light Mode (Fallback) | Dark Mode / Dark Theme (Primary) |
|---|---|---|
| **Background** | `#050B1A` | `#050B1A` (very dark navy) |
| **Surface** | `#0F1A36` | `#0F1A36` (card/panel background) |
| **SurfaceVariant** | `#102644` | `#102644` (slightly lighter surface) |
| **TextPrimary** | `#EAF2FF` | `#EAF2FF` (near-white text) |
| **TextSecondary** | `#A5B8D5` | `#A5B8D5` (muted blue-grey) |
| **PrimaryAccent** | `#0EA5E9` | `#0EA5E9` (cyan-blue, main CTA color) |
| **PrimaryAccentDark** | `#0284C7` | `#0284C7` (pressed/accent shadow) |
| **AccentSecondary** | `#14B8A6` | `#14B8A6` (teal, success/secondary) |
| **OnPrimary** | `#FFFFFF` | `#FFFFFF` (text on CTA buttons) |

### UI Specifications
1. **Gradients:** Background should use a linear gradient from top-left to bottom-right or top-to-bottom: `#050B1A` → `#0A1628`.
2. **Glassmorphism:** Card containers should use a subtle semi-transparent dark blue color (`#0F1A36` with 60% opacity) overlaid with a thin border/stroke (`Color.white.opacity(0.15)`) and a subtle background blur (`.background(.ultraThinMaterial)` if iOS 15+).
3. **Corner Radius:** Standard cards should have `.cornerRadius(20)`. Button controls should have `.cornerRadius(16)`.
4. **Badges:** Colored capsules with opacity. For registration approval status:
   - `Accepted`: Green capsule (`#14B8A6` background at 15% opacity, text color `#14B8A6`)
   - `Pending`: Amber capsule (`#F59E0B` background at 15% opacity, text color `#F59E0B`)
   - `Rejected`: Red capsule (`#EF4444` background at 15% opacity, text color `#EF4444`)
   - `Not Applied`: Blue capsule (`#0EA5E9` background at 15% opacity, text color `#0EA5E9`)

---

## 3. Backend API Reference
All request/response payloads must be JSON. Include `Authorization: Bearer <JWT>` header in all authenticated requests.

### 3.1 Authentication & Profile
- **Login:** `POST /api/auth/login`
  - Request: `{ "email": "hacker1@matrix.com", "password": "password123" }`
  - Response: `{ "token": "JWT_TOKEN_STRING" }`
- **Logout:** `POST /api/auth/logout` (Auth required)
- **Get Logged-in User:** `GET /api/auth/me` (Auth required)
  - Response: `{ "id": 1, "name": "Hacker One", "email": "hacker1@matrix.com", "role": "Hacker", "status": "Active" }`
- **Get Full Profile:** `GET /api/profile/me` (Auth required)
- **Update Profile:** `POST /api/profile/me` (Auth required)
  - Payload: `{ "github_url": "...", "linkedin_url": "...", "bio": "...", "skills": ["Go", "SwiftUI"] }`
- **Save Push Token:** `POST /api/users/fcm-token` (Auth required)
  - Payload: `{ "token": "APNS_OR_FCM_DEVICE_TOKEN", "platform": "ios" }`

### 3.2 Hackathons
- **List Approved Hackathons:** `GET /api/hackathons`
  - Response: Array of Hackathon objects:
    `[{ "id": 1, "title": "Matrix Matrix Hackathon", "description": "...", "cover_image": "https://...", "is_approved": true }]`
- **Get Application Status:** `GET /api/hackathons/{id}/my-registration` (Auth required)
  - Response: `{ "id": 2, "user_id": 1, "hackathon_id": 1, "github_url": "...", "linkedin_url": "...", "skills": ["Go", "SwiftUI"], "team_preference": "JoinTeam", "approval_status": "Accepted" }` (Can be `Pending`, `Accepted`, `Rejected`, or `Not Applied` / `404`)
- **Apply to Hackathon:** `POST /api/hackathons/{id}/apply` (Auth required)
  - Payload: `{ "github_url": "https://github.com/hacker", "linkedin_url": "https://linkedin.com/in/hacker", "skills": ["Go", "SwiftUI"], "team_preference": "JoinTeam" }` (values: `JoinTeam`, `CreateTeam`, `Solo`)

### 3.3 Team Management
- **Get My Team Status:** `GET /api/hackathons/{id}/my-team` (Auth required)
  - Response (if has team): `{ "id": 10, "hackathon_id": 1, "team_name": "Matrix Builders", "invite_code": "MB-X9F2", "repository_url": "", "is_submitted": false, "leader_id": 1, "members": [{"id": 1, "name": "Hacker One", "email": "hacker1@matrix.com"}] }`
- **Create Team:** `POST /api/hackathons/{id}/teams` (Auth required)
  - Payload: `{ "team_name": "Matrix Builders" }`
- **Join Team by Invite Code:** `POST /api/hackathons/{id}/teams/join` (Auth required)
  - Payload: `{ "invite_code": "MB-X9F2" }`
- **Submit Project Repo:** `PUT /api/hackathons/{id}/teams/submit` (Auth required)
  - Payload: `{ "repository_url": "https://github.com/hacker/matrix-submission" }`
- **Browse Public Teams:** `GET /api/hackathons/{id}/teams/public` (Auth required)
  - Response: Array of Team objects available for requesting to join.
- **Request to Join a Team:** `POST /api/hackathons/{id}/teams/{team_id}/request` (Auth required)
- **Get My Pending Sent Requests:** `GET /api/hackathons/{id}/my-requests` (Auth required)
- **Withdraw Join Request:** `DELETE /api/hackathons/{id}/requests/{req_id}` (Auth required)
- **Get Pending Invitations for Me:** `GET /api/hackathons/{id}/my-invitations` (Auth required)
- **Manage/Accept Invitation:** `PUT /api/hackathons/{id}/invitations/{inv_id}` (Auth required)
  - Payload: `{ "status": "Accepted" }` (or `"Rejected"`)
- **Remove Member (Leader Only):** `DELETE /api/hackathons/{id}/teams/{team_id}/members/{member_id}` (Auth required)

### 3.4 Tickets & Support
- **Submit Mentor Help Ticket:** `POST /api/hackathons/{id}/tickets` (Auth required)
  - Payload: `{ "description": "Need assistance setting up database migrations inside the Docker environment." }`

### 3.5 Announcements
- **Get Hackathon Announcements:** `GET /api/hackathons/{id}/broadcasts` (Auth required)
  - Response: Array of broadcasts:
    `[{ "id": 1, "hackathon_id": 1, "message": "Round 1 submissions are due in 2 hours!", "created_at": "2026-06-10T09:00:00Z" }]`

---

## 4. UI/UX Flow & Screen Layouts (SwiftUI)

### 4.1 Login View
- A beautifully aligned, central glassmorphic card on a dark gradient background.
- Simple, validation-enabled textfields for Email and Password.
- Large accent CTA button: "Authorize Mission".
- Handles error state overlay (e.g. invalid credentials) smoothly.
- On success: Saves JWT to Keychain and updates parent app state (`isLoggedIn = true`) with a smooth `.transition(.opacity)`.

### 4.2 Main Tabbed Hub (`DashboardTabView`)
Once authorized, show a custom bottom TabView featuring:
1. **Hackathons Tab:** Main list of available hackathons.
2. **My Team Tab:** Manage/Join/Create team for the active hackathon context.
3. **Profile Tab:** View/edit participant profile details and logout button.

### 4.3 Hackathons Screen (Tab 1)
- Header with branding "Matrix Command" and a notification bell icon (to access broadcast archives).
- Pull-to-refresh container with a vertical ScrollView of hackathons.
- Each Card contains: Cover Image (or placeholder with gradient), title, truncated description, and application status badge.
- Tapping a Card opens a full-screen or sheets detail view (`HackathonDetailView`).

### 4.4 Hackathon Detail Screen
- Detailed header, scrollable description, schedule, and rules.
- **Registration Panel (Glassmorphic):**
  - If **Not Applied**: Shows an "Apply to Hackathon" button. Tapping it triggers a SwiftUI `.sheet` presenting a form:
    - LinkedIn URL (input)
    - GitHub URL (input)
    - Skills (list of tags or text entry)
    - Team Preference (Segmented Picker: "Solo", "Join Team", "Create Team")
    - Submit Button calling `POST /api/hackathons/{id}/apply`.
  - If **Pending**: Shows "Application Under Review" with an amber badge.
  - If **Rejected**: Shows "Application Rejected" with a red badge.
  - If **Accepted**: Shows "Application Approved" with a green badge, and unlocks the team/announcements sections.
- **Announcements / Broadcast Section:** List of notifications retrieved from the broadcasts endpoint.
- **Request Mentor Floating Button (FAB):** A cyan button at the bottom-right corner. Tapping launches a sheet with a TextEditor to describe the issue. Tapping "Request Help" calls the ticket endpoint.

### 4.5 Team Management Screen (Tab 2 / Contextual)
Provides full hacker team lifecycle. If the user has applied and is accepted:
1. **State A: No Team**
   - Option 1: "Create Team" (text input for Name, creates team and yields an invite code).
   - Option 2: "Browse Public Teams" (list view of other public teams with a "Request to Join" button, or an invite code field to enter code directly and join).
2. **State B: Team Member**
   - Shows Team Name, invite code (so they can share it), list of team members.
   - Project submission input at bottom: "Submit Repository" (TextField + Submit Button).
3. **State C: Team Leader**
   - Same as member screen, but members have a swipe-to-delete or trash button (calls remove member endpoint).
   - Displays incoming join requests with Approve/Deny buttons.

### 4.6 Profile Screen (Tab 3)
- Shows avatar, name, email, and current role.
- Input fields for GitHub, LinkedIn, bio, and skills list (save edits via Profile endpoint).
- A red danger-accent button "Wipe Session / Logout".
- Clears JWT from Keychain, resets `isLoggedIn = false` to transition instantly back to the Login view.

---

## 5. Development Steps (For ChatGPT)
1. **Initialize iOS App:** Create a SwiftUI Multiplatform App called `MatrixApp`. Configure Swift Package Manager (SPM) or CocoaPods if any dependency is needed (standard Swift standard library and SwiftUI are highly recommended to avoid complex external integrations).
2. **Configure Local Network Access:** Add `NSAppTransportSecurity` to `Info.plist` with `NSAllowsArbitraryLoads = true` so the app can communicate with the local Go backend.
3. **Write Security/Network Helpers:**
   - Implement a Swift `KeychainHelper` class using Security framework (`SecItemAdd`, `SecItemCopyMatching`, `SecItemDelete`) to secure JWT.
   - Implement `NetworkManager` class with URLSession that decodes payloads and adds `Authorization: Bearer <Token>` interceptors.
4. **Design Custom Theme Styles:** Setup Theme/Color catalog extensions in Swift (`Color(hex: "...")`) to implement the dark navy styling tokens.
5. **Build Login View:** Implement input textfields, validation, Keychain saving, and state transitions.
6. **Implement Tab Hub:** Host navigation flows for Hackathons list, Profile, and Team screens.
7. **Create Hackathons & Details View:** Implement RecyclerView equivalent (SwiftUI `ScrollView` + `LazyVStack` or `List`), status badge color-coding, and registration application sheets.
8. **Create Team & Ticket Views:** Implement the 3 states of the team page dynamically based on API responses. Build the floating button sheet for mentor support ticket.
9. **Configure Push Notifications:** Integrate `UNUserNotificationCenter` delegate. On launch/login, prompt user for push notifications, retrieve device token, and POST it to `/api/users/fcm-token` with `{ "token": "<device_token>", "platform": "ios" }`.
