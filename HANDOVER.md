# HANDOVER.md — Matrix Command Android App
**Date:** June 10, 2026  
**Project:** Hackathon Command & Mentor Routing Matrix — Native Android App  
**Handover Purpose:** Continue building the Android Java app that is targeted at **Hacker/Participant users only**. All other roles (Organizer, Admin, Mentor, Judge) use the **Next.js web frontend**.

> **App Name:** `Matrix Command` (see `strings.xml` — this is already set)  
> **Web frontend branding:** Also uses "Matrix Command" / dark navy glassmorphic theme.  
> **DO NOT** rename this to "Hack2Skill" — that was only used as a reference example.

---

## 1. Project Structure

```
d:\internships\comet chat\cometChat task 2\repo1\
├── backend/                  ← Go (chi) REST API on :8080
├── frontend/                 ← Next.js 14 web app on :3000 (all roles)
└── mobile/
    └── android-run/          ← Native Java Android app (HACKER ONLY)
        ├── build.gradle                (root — has google-services classpath)
        ├── settings.gradle
        ├── gradle.properties
        ├── gradle/wrapper/
        │   └── gradle-wrapper.properties  (Gradle 8.7 download URL set)
        └── app/
            ├── build.gradle            (Firebase BOM + FCM + Retrofit deps)
            ├── google-services.json    ⚠ STUB — must replace with real one
            └── src/main/
                ├── AndroidManifest.xml
                ├── java/com/matrix/app/
                │   ├── LoginActivity.java         ✅ complete + FCM
                │   ├── DashboardActivity.java     ⚠ stub — needs full rewrite
                │   ├── ApiClient.java             ✅ complete (LAN IP set)
                │   ├── MatrixApi.java             ✅ complete (all endpoints)
                │   ├── SecurityManager.java       ✅ complete (EncryptedPrefs)
                │   ├── MatrixFirebaseMessagingService.java  ✅ complete
                │   └── models/
                │       ├── ApiUser.java
                │       ├── Hackathon.java
                │       ├── Registration.java
                │       ├── LoginRequest.java
                │       ├── LoginResponse.java
                │       ├── ApplyHackathonRequest.java
                │       ├── CreateTicketRequest.java
                │       └── FcmTokenRequest.java   ✅ new
                └── res/
                    ├── layout/
                    │   ├── activity_login.xml     ✅ styled dark glassmorphic
                    │   └── activity_dashboard.xml ⚠ needs full rewrite
                    ├── drawable/
                    │   ├── bg_gradient.xml
                    │   └── card_gradient.xml
                    └── values/
                        ├── colors.xml             ✅ design tokens set
                        ├── strings.xml
                        └── themes.xml
```

---

## 2. Backend API Reference

**Base URL (from physical device on same Wi-Fi):** `http://192.168.29.115:8080/api/`  
**Auth:** JWT Bearer token in `Authorization` header  
**DB:** PostgreSQL on port `5433`, DB name `hackathon`

### Auth Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login → returns `{ token: "..." }` |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/auth/me` | Yes | Get logged-in user `{ id, name, email, role, status }` |

### Hackathon Endpoints (Hacker-facing)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/hackathons` | No | List all approved hackathons |
| POST | `/api/hackathons/{id}/apply` | Yes | Apply to hackathon |
| GET | `/api/hackathons/{id}/my-registration` | Yes | Get my registration status |

### Team Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/hackathons/{id}/teams` | Yes | Create team |
| POST | `/api/hackathons/{id}/teams/join` | Yes | Join by invite code `{ invite_code: "..." }` |
| GET | `/api/hackathons/{id}/my-team` | Yes | Get my team details |
| PUT | `/api/hackathons/{id}/teams/submit` | Yes | Submit project `{ repository_url: "..." }` |
| DELETE | `/api/hackathons/{id}/teams/{team_id}/members/{member_id}` | Yes | Remove member (leader only) |
| GET | `/api/hackathons/{id}/teams/public` | Yes | Browse all teams in hackathon |
| POST | `/api/hackathons/{id}/teams/{team_id}/request` | Yes | Request to join a team |
| GET | `/api/hackathons/{id}/my-requests` | Yes | My pending join requests |
| DELETE | `/api/hackathons/{id}/requests/{req_id}` | Yes | Withdraw join request |
| GET | `/api/hackathons/{id}/my-invitations` | Yes | Pending invites for me |
| PUT | `/api/hackathons/{id}/invitations/{inv_id}` | Yes | Accept/reject invite `{ status: "Accepted"/"Rejected" }` |

### Mentor Support Tickets
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/hackathons/{id}/tickets` | Yes | Submit mentor support ticket `{ description: "..." }` |

### Profile & FCM
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/profile/me` | Yes | Get full profile |
| POST | `/api/profile/me` | Yes | Update profile |
| POST | `/api/users/fcm-token` | Yes | Register FCM token `{ token: "...", platform: "android" }` |

### Announcements
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/hackathons/{id}/broadcasts` | Yes | Get hackathon announcements |

---

## 3. Design System (Colors)

The app uses a **dark navy/glassmorphic** theme — match this exactly:

```xml
background:       #050B1A   (very dark navy)
surface:          #0F1A36   (card/panel background)
surfaceVariant:   #102644   (slightly lighter surface)
textPrimary:      #EAF2FF   (near-white)
textSecondary:    #A5B8D5   (muted blue-grey)
primaryAccent:    #0EA5E9   (cyan-blue, main CTA color)
primaryAccentDark:#0284C7   (pressed/dark state)
onPrimary:        #FFFFFF   (text on accent)
accentSecondary:  #14B8A6   (teal, success/secondary)
```

Gradients — `bg_gradient.xml` sweeps from `#050B1A` → `#0A1628` (top to bottom).  
Card style: rounded corners 20–28dp, `cardElevation` 8dp, background `@color/surface`.

### Existing String Resources (`strings.xml`)
These are already defined — **use `@string/` references**, don't hardcode:
```
app_name              → "Matrix Command"
login_title           → "Matrix Command"
login_tagline         → "Launch your hackathon mission with speed and style"
login_subtitle        → "Sign in to continue to your event control center"
dashboard_title       → "Matrix Command"
dashboard_subtitle    → "Hackathon mission control"
request_mentor        → "Request Mentor"
live_status           → "Live status"
```
Add new strings for Hackathons, Teams, and Profile screens in `strings.xml`.

---

## 4. What Is Complete ✅

1. **LoginActivity** — styled dark UI, email/password login, FCM permission request, FCM token upload after login.
2. **ApiClient** — Retrofit singleton, injects `Authorization: Bearer <token>` header, base URL is `http://192.168.29.115:8080/api/`.
3. **SecurityManager** — `EncryptedSharedPreferences` stores JWT securely.
4. **MatrixFirebaseMessagingService** — handles FCM token refresh + shows `NotificationCompat` notifications with channel name `Matrix Command Notifications`.
5. **MatrixApi interface** — declares all REST endpoints with Retrofit annotations.
6. **All models** — `ApiUser`, `Hackathon`, `Registration`, `LoginRequest`, `LoginResponse`, `FcmTokenRequest`, `CreateTicketRequest`, `ApplyHackathonRequest`.
7. **AndroidManifest.xml** — FCM service registered, `POST_NOTIFICATIONS` permission declared.
8. **app/build.gradle** — Firebase BoM 33.1.0 + FCM, Retrofit, Material, Security-crypto deps all added.
9. **Backend** — `POST /api/users/fcm-token` endpoint added, FCM token saved to `users.fcm_token` column.

---

## 5. What Must Be Built ⚠️

This is the **full task list** for the next AI session:

### 5.1 Fix Gradle Build (FIRST PRIORITY)
The project has no `gradlew.bat` (Windows wrapper). You need to:
1. Check if a `gradlew.bat` file exists. If not, create it.
2. Build with: `.\gradlew.bat assembleDebug` from `mobile/android-run/`
3. Install with: `C:\Android\platform-tools\adb.exe install -r app\build\outputs\apk\debug\app-debug.apk`
4. The device serial is `5A280DLCQ001PF` (Pixel 10 Pro XL, Android API 37).

**CRITICAL:** `google-services.json` at `app/google-services.json` is a **STUB**. Firebase/FCM will NOT work until you replace it with a real file from Firebase Console. Create a Firebase project, add Android app with package name `com.matrix.app`, download `google-services.json`, and place it at `app/google-services.json`. Without this, FCM won't initialize but the rest of the app will work.

### 5.2 HackathonsActivity (List Screen)
Create `HackathonsActivity.java` — shown after login as the **main landing screen** (not DashboardActivity).

**Flow:** Login → HackathonsActivity (list of hackathons) → HackathonDetailActivity

**Layout requirements:**
- Dark gradient background
- `RecyclerView` of hackathon cards (title, description snippet, cover image, apply status badge)
- Each card: `MaterialCardView`, rounded 20dp, `@color/surface` background
- Top toolbar with app name + logout icon button
- Bottom `BottomNavigationView` with 3 tabs: **Hackathons**, **My Team**, **Profile**
- Pull-to-refresh support
- FAB is NOT needed here (move it to HackathonDetailActivity)

**API call:** `GET /api/hackathons` → returns list of `Hackathon` objects.

### 5.3 HackathonDetailActivity
Create `HackathonDetailActivity.java` — shown when user taps a hackathon card.

**Features:**
- Show hackathon title, description, cover image at top
- Show user's registration status (`approval_status`: Pending / Accepted / Rejected / Not Applied)
- **Apply Button:** If not applied → show "Apply Now" button that calls `POST /api/hackathons/{id}/apply`
  - `ApplyHackathonRequest` fields: `github_url`, `linkedin_url`, `skills` (List<String>), `team_preference`
  - Show a bottom sheet dialog to enter these fields before applying
- **Team section:** If accepted → show team status (or "Create/Join Team" if no team)
- **Announcements tab:** `GET /api/hackathons/{id}/broadcasts` → show list
- **Mentor Ticket FAB:** Floating button → dialog → `POST /api/hackathons/{id}/tickets`

### 5.4 TeamActivity (Full Team Management)
Create `TeamActivity.java` — complete team management for a given hackathon.

**States to handle:**
1. **No Team** → show two buttons: "Create Team" + "Browse Public Teams"
2. **Has Team (Member)** → show team name, members list, invite code (if leader), join requests (if leader)
3. **Has Team (Leader)** → all member features + ability to remove members + see join requests + send invites by email

**API calls needed:**
- `GET /api/hackathons/{id}/my-team` → check if user has a team
- `POST /api/hackathons/{id}/teams` body: `{ team_name: "..." }` → create team
- `POST /api/hackathons/{id}/teams/join` body: `{ invite_code: "..." }` → join by code
- `GET /api/hackathons/{id}/teams/public` → list of public teams to browse
- `POST /api/hackathons/{id}/teams/{team_id}/request` → request to join public team
- `GET /api/hackathons/{id}/my-invitations` → pending invites
- `PUT /api/hackathons/{id}/invitations/{inv_id}` body: `{ status: "Accepted" }` → accept invite
- `DELETE /api/hackathons/{id}/teams/{team_id}/members/{member_id}` → remove member (leader)
- `PUT /api/hackathons/{id}/teams/submit` body: `{ repository_url: "..." }` → submit project

### 5.5 ProfileActivity
Create `ProfileActivity.java` — user profile view/edit.

**Features:**
- Show user name, email, role (always "Hacker" for mobile users)
- Edit profile form: GitHub URL, LinkedIn URL, bio, skills
- **API:** `GET /api/profile/me` and `POST /api/profile/me`
- Logout button → clears JWT via `securityManager.clearToken()` → go to LoginActivity

### 5.6 Rewrite DashboardActivity → NavigationActivity
`DashboardActivity.java` is currently a stub. Replace it with a proper **NavigationActivity** that hosts a `BottomNavigationView` with fragments, OR restructure so the flow is:

```
LoginActivity → HackathonsActivity (main entry, has bottom nav)
```

Recommended approach: Make `HackathonsActivity` the main post-login screen with bottom nav tabs:
- Tab 1: Hackathons list (RecyclerView)
- Tab 2: My Teams overview (list of hackathons user has teams in)
- Tab 3: Profile

### 5.7 Notifications Screen
Create `NotificationsActivity.java` — add a bell icon to the toolbar.
- `GET /api/hackathons/{id}/broadcasts` for announcements
- Show team invite notifications in-app

---

## 6. Existing Models Reference

```java
// ApiUser
{ id, name, email, role, status }

// Hackathon
{ id, title, description, cover_image, is_approved }

// Registration
{ id, user_id, hackathon_id, github_url, linkedin_url, skills, team_preference, approval_status }

// LoginRequest  → { email, password }
// LoginResponse → { token }
// FcmTokenRequest → { token, platform:"android" }
// CreateTicketRequest → { hackathon_id, description }
// ApplyHackathonRequest → { github_url, linkedin_url, skills, team_preference }
```

You will need to add these new models:
```java
// Team
{ id, hackathon_id, team_name, invite_code, repository_url, is_submitted, is_winner, leader_id, members[] }

// TeamMember
{ id, name, email }

// TeamInvitation
{ id, team_id, team_name, invitee_id, status }

// TeamJoinRequest
{ id, team_id, team_name, user_id, status }

// Announcement/Broadcast
{ id, hackathon_id, message, created_at }

// CreateTeamRequest  → { team_name }
// JoinTeamRequest    → { invite_code }
// InviteByEmailRequest → { email }
// SubmitProjectRequest → { repository_url }
// UpdateInviteRequest  → { status }  ("Accepted" or "Rejected")
```

---

## 7. How to Build & Run

```powershell
# From: d:\internships\comet chat\cometChat task 2\repo1\mobile\android-run\

# Build debug APK (Gradle wrapper downloads Gradle 8.7 on first run)
.\gradlew.bat assembleDebug

# Install on connected Pixel 10 Pro XL (device serial: 5A280DLCQ001PF)
C:\Android\platform-tools\adb.exe -s 5A280DLCQ001PF install -r app\build\outputs\apk\debug\app-debug.apk

# Or use installDebug task directly
.\gradlew.bat installDebug

# Watch logcat for debug output (tag: MatrixApp or MatrixFCM)
C:\Android\platform-tools\adb.exe -s 5A280DLCQ001PF logcat -s MatrixApp MatrixFCM
```

**Android SDK location:** `C:\Android`  
**ADB path:** `C:\Android\platform-tools\adb.exe`  
**Java:** `C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot\bin\java.exe`

### If `gradlew.bat` is missing, create it:
```powershell
# Create gradlew.bat in mobile/android-run/
@echo off
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.17.10-hotspot
java -jar "%~dp0gradle\wrapper\gradle-wrapper.jar" %*
```
And download `gradle-wrapper.jar` from:  
`https://github.com/gradle/gradle/raw/v8.7.0/gradle/wrapper/gradle-wrapper.jar`  
Place it at: `gradle/wrapper/gradle-wrapper.jar`

---

## 8. Backend State

- **Go backend** is already running (or run with `go run ./cmd/server` from `backend/`)
- **DB:** PostgreSQL on `localhost:5433`, DB: `hackathon`, user: `postgres`, pass: `postgres`
- **JWT secret:** `super_secret_jwt_key`
- **FCM token endpoint:** `POST /api/users/fcm-token` — stores token in `users.fcm_token` column
- **CORS:** Allows `http://192.168.29.115:3000` and `http://localhost:3000`

### Test Credentials (from seed data):
```
Hacker:   hacker1@matrix.com  / password123
Hacker:   hacker2@matrix.com  / password123
Hacker:   hacker3@matrix.com  / password123
...up to hacker12@matrix.com
```

---

## 9. Key Architectural Decisions

1. **Hacker-only app** — Mobile app is exclusively for participants/hackers. No organizer/admin/mentor/judge flows exist in mobile. Those roles use the web.
2. **JWT Bearer Token** — Stored encrypted in `EncryptedSharedPreferences`. Passed as `Authorization: Bearer <token>` header via Retrofit interceptor in `ApiClient`.
3. **LAN IP for backend** — `http://192.168.29.115:8080/api/` — the physical device reaches the backend over Wi-Fi. If IP changes, update `ApiClient.BASE_URL`.
4. **FCM Push Notifications** — `MatrixFirebaseMessagingService` handles foreground messages + shows `NotificationCompat` notifications. Token is synced to backend via `POST /api/users/fcm-token` after login.
5. **No Emulator** — Development is on a physical Pixel 10 Pro XL (API 37), serial `5A280DLCQ001PF`.

---

## 10. UI/UX Guidelines

- **Theme:** Dark navy (`#050B1A` background), `primaryAccent` = `#0EA5E9` (cyan-blue)
- **Cards:** `MaterialCardView`, `cardCornerRadius="20dp"`, elevation 6–8dp, background `@color/surface`
- **Typography:** Use `android:textStyle="bold"` for headings, regular for body, `textSecondary` color for subtitles
- **Buttons:** `MaterialButton` with `backgroundTint="@color/primaryAccent"`, `cornerRadius="16dp"`, `textAllCaps="false"`
- **Input fields:** `TextInputLayout` OutlinedBox style, `boxStrokeColor="@color/primaryAccent"`
- **Status badges:** Use `Chip` widgets — green tint for Accepted, amber for Pending, red for Rejected
- **Icons:** Use `android.R.drawable.*` builtins OR add Material Icons font (no external icon libraries unless already in deps)
- **Loading states:** Show `ProgressBar` (circular) centered on screen during API calls
- **Empty states:** Show centered icon + message text when lists are empty
- **Error states:** `Snackbar` with action for retryable errors; `Toast` for non-retryable

---

## 11. Next Immediate Steps (In Order)

1. **Create `gradlew.bat`** and download `gradle-wrapper.jar` so the project can build on Windows.
2. **Get real `google-services.json`** from Firebase Console (package: `com.matrix.app`) and place at `app/google-services.json`.
3. **Build + install** with `.\gradlew.bat installDebug`.
4. **Rewrite `DashboardActivity`** → make it a proper hub/landing page or replace with `HackathonsActivity`.
5. **Build `HackathonsActivity`** with RecyclerView + BottomNavigationView.
6. **Build `HackathonDetailActivity`** with apply flow + team + announcements + mentor ticket.
7. **Build `TeamActivity`** with full create/join/manage team flow.
8. **Build `ProfileActivity`** with view/edit + logout.
9. **Test end-to-end** on the Pixel device.
