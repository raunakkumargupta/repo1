# Matrix Command — Backend Services Overview

This document details all the backend services, databases, caching layers, and external integrations used in the **Matrix Command Hackathon Management System**.

---

## 1. System Architecture

The project follows a decoupled client-server architecture with a Go-based core REST API, a PostgreSQL database for persistent relational storage, a Redis store for caching/rate-limiting, and multiple frontend interfaces (Web and Mobile).

```mermaid
graph TD
    %% Clients
    Web["Next.js Web Client<br/>(Admin, Organizer, Mentor, Judge, Hacker)"]
    Android["Android Native App<br/>(Hacker Only)"]
    iOS["iOS Swift App<br/>(Hacker Only)"]
    
    %% Gateway / Core Service
    GoAPI["Go REST API Server<br/>(Go 1.25.0 + Chi Router)"]
    
    %% Databases & Cache
    Postgres[("PostgreSQL 15<br/>(Relational Store)")]
    Redis[("Redis 7<br/>(Cache & Rate Limiter)")]
    
    %% Workers
    WorkerPool["Asynchronous Worker Pool<br/>(Audit Logs, FCM Notifications)"]
    
    %% Connections
    Web -->|HTTP / JSON| GoAPI
    Android -->|HTTP / JSON + FCM| GoAPI
    iOS -->|HTTP / JSON| GoAPI
    
    GoAPI -->|pgx/v5 Pool| Postgres
    GoAPI -->|go-redis/v9| Redis
    GoAPI -->|Go Channels| WorkerPool
```

---

## 2. Core Backend API Server

The core server is a lightweight, high-performance REST API.

*   **Language & Runtime:** Go 1.25.0
*   **Web Framework & Router:** `go-chi/chi/v5`
    *   Provides clean, lightweight routing with full support for context propagation and subrouting.
*   **Cross-Origin Resource Sharing (CORS):** Managed via `go-chi/cors` for communication between frontend and mobile clients.
*   **Authentication & Session Management:**
    *   **JSON Web Tokens (JWT):** Signed using HS256 algorithm via `golang-jwt/jwt/v5`.
    *   Tokens are parsed, verified, and injected into Go's request contexts via custom authentication middleware (`auth_middleware.go`).
*   **Asynchronous Background Worker Pool:**
    *   Implemented locally in Go using goroutines and channels (`worker.go`).
    *   Processes heavy or non-blocking operations asynchronously:
        *   `AUDIT_LOG`: Saving logs to database/storage.
        *   `FCM_NOTIFICATION`: Pushing notifications to mobile applications.

---

## 3. Database Engine (PostgreSQL)

The central repository for persistent relational data.

*   **Version:** PostgreSQL 15 (Alpine Linux base Docker image)
*   **Database Driver:** `jackc/pgx/v5`
    *   Utilizes a connection pool (`pgxpool`) to handle concurrent requests efficiently.
    *   Configurable pool settings (`DB_MAX_CONNS`, `DB_MIN_CONNS`, `MaxConnIdleTime`, `MaxConnLifetime`).
*   **Migrations Management:** `golang-migrate/v4`
    *   Applied automatically on server startup using migrations located in `migrations/`.
*   **Database Schema Modules:**
    1.  **Users & Authentication:** Multi-role user accounts (Super Admin, Organizer, Mentor, Judge, Hacker).
    2.  **Hacker Profiles:** Profiles including bios, Github/Linkedin URLs, and tech skills.
    3.  **Hackathons & Details:** Custom events, descriptions, status badges, timelines.
    4.  **Teams & Members:** Team management, invitations, public lists, join requests, submission URLs, and winner status.
    5.  **Mentor Support Tickets:** Relates hackers to mentors to resolve issues.
    6.  **Broadcasts & Announcements:** Admin/Organizer global broadcasts for ongoing hackathons.

---

## 4. Caching & Rate Limiting (Redis)

Redis is deployed as an in-memory cache and a security gateway.

*   **Version:** Redis 7 (Alpine Linux base Docker image)
*   **Driver:** `go-redis/v9`
*   **Roles & Features:**
    1.  **Rate Limiting:**
        *   Secures public/authenticated API endpoints against brute force and DDoS.
        *   Uses a **Token Bucket algorithm** executed atomically inside Redis using a custom **Lua script**.
        *   Tracks limits per-IP and per-endpoint (`ratelimit:<path>:<ip>:tokens`).
    2.  **Caching:**
        *   Caches intensive database queries (e.g., Hackathon detail lists) to reduce PostgreSQL load.

---

## 5. Notification & Push Services (Firebase)

*   **Service:** Firebase Cloud Messaging (FCM)
*   **Database Columns:** `users.fcm_token` and `users.apns_token` store tokens for registered mobile devices.
*   **Registration API:** `POST /api/users/fcm-token` handles client device registration.
*   **FCM Integration Flow:**
    1.  Mobile application obtains token from Google Play Services.
    2.  Token is sent to the Go backend and upserted into the `users` table.
    3.  When announcements are made or tickets are updated, the backend enqueues an `FCM_NOTIFICATION` job into the worker pool.
    4.  The background worker fetches the target user's token and routes push notifications to the mobile device.

---

## 6. Dockerized Orchestration

All local backend components are orchestrated together via `docker-compose.yml`:

*   **`postgres` Container:** Runs Postgres on internal port `5432` (mapped to host port `5435`).
*   **`redis` Container:** Runs Redis on internal port `6379` (mapped to host port `6381`).
*   **`backend` Container:** Builds `./backend/Dockerfile` and exposes the Go REST API.
*   **`frontend` Container:** Builds `./frontend/Dockerfile` and hosts the Next.js web application.

---

## 7. Environment Configurations

All backend parameters are declared via environmental variables (`.env`):

| Variable Name | Description | Example / Default |
|---|---|---|
| `PORT` | Go REST API Server Port | `8080` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens | `super_secret_jwt_key` |
| `DB_URL` | PostgreSQL connection URL | `postgres://postgres:postgres@postgres:5432/hackathon?sslmode=disable` |
| `DB_MAX_CONNS` | Maximum database connection pool size | `100` |
| `DB_MIN_CONNS` | Minimum database connection pool size | `10` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379/0` |
| `ALLOWED_ORIGINS` | List of allowed CORS client origins | `http://localhost:3000,http://127.0.0.1:3000` |
| `WORKER_POOL_SIZE`| Total concurrent goroutines in background worker pool | `50` |
