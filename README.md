# Matrix Hackathon Platform

Matrix is a production-ready, full-stack hackathon management and live mentor support platform. It is built using Go (backend), PostgreSQL (database), Redis (caching and queues), Next.js (frontend), and integrates CometChat for real-time ticket-based support chat.

## Repository Structure

```
assignment-1-cometchat-integration/
├── frontend/                     # Next.js web application
├── backend/                      # Go REST API backend
│   └── scripts/                  # Standalone administrative and database utilities
├── docker-compose.yml            # Container orchestration config
├── SCOPE_OF_WORK.md              # Requirement & scope specification
├── README.md                     # Setup and overall project guide (This file)
├── API_DOCUMENTATION.md          # REST API reference documentation
├── DATABASE_DESIGN.md            # PostgreSQL and Redis schema design
├── NOTIFICATION_FLOW.md          # FCM, Web Toasts, and CometChat push design
├── COMETCHAT_INTEGRATION.md      # CometChat setup & integration overview
├── COMETCHAT_SKILLS_USAGE.md     # Report on how CometChat AI skills were utilized
├── COMETCHAT_WEBHOOKS.md         # CometChat webhook ingestion architecture
├── DECISION_LOG.md               # Technical choices, alternatives, and trade-offs
├── TESTING_NOTES.md              # Test matrix, instructions, and credentials
└── DEMO_GUIDE.md                 # Guided user walkthrough script
```

## Quick Start Setup

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [Go 1.21+](https://go.dev/dl/) (optional, for local script execution)

### 1. Configure Environment variables
Copy the `.env.example` file to `.env` in the root directory and fill out the CometChat credentials:
```bash
cp .env.example .env
```
Ensure `COMETCHAT_APP_ID`, `COMETCHAT_REGION`, `COMETCHAT_API_KEY`, and `COMETCHAT_AUTH_KEY` are correctly specified.

### 2. Build & Launch Containers
Spin up PostgreSQL, Redis, backend, and frontend containers in the background:
```bash
docker compose up --build -d
```

### 3. Seed the Database
The platform comes with a preloaded seeder that inserts **100+ realistic users** with varying profiles, hackathon events, and pre-configured staff roles:
```bash
docker compose exec backend ./seed
```

### 4. Access the Applications
* **Next.js Web Portal**: `http://localhost:3000`
* **Go Backend API Service**: `http://localhost:8080`

---

## Pre-seeded Test Credentials

| Email | Password | Role | Description |
|---|---|---|---|
| `admin@matrix.com` | `M@tr1x_P@ssw0rd!2026` | Admin | Full platform access, user manager |
| `organizer@matrix.com` | `M@tr1x_P@ssw0rd!2026` | Organizer | Manage hackathons, approve applicants, assign staff |
| `mentor@matrix.com` | `M@tr1x_P@ssw0rd!2026` | Mentor | Claim help tickets, live chat with teams |
| `judge@matrix.com` | `M@tr1x_P@ssw0rd!2026` | Judge | Review and evaluate project submissions |
| `hacker1@matrix.com` | `M@tr1x_P@ssw0rd!2026` | Hacker | Form teams, request mentor help, submit projects |

---

## Standalone Go Scripts (in `backend/scripts`)
* **Database Seeder**: `go run scripts/seed.go`
* **Verify Push Tokens**: `go run scripts/check_tokens.go`
* **Sync CometChat Users**: `go run scripts/sync_cometchat_users.go`
* **Clean DB Utility**: `go run scripts/clean_db.go`
