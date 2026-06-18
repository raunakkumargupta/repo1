# CometChat Webhooks

This document describes the real-world webhook use case implemented in the Matrix platform: **moderation flag logging + message activity logging into the application database, surfaced to the SuperAdmin dashboard.**

## Use Case

> When a message is sent or flagged by CometChat Moderation, create an activity/moderation log entry in the application database so the SuperAdmin can review communication activity and moderation outcomes.

This satisfies two of the assignment's suggested webhook scenarios at once:
- "When a message is sent, create an activity log in the application database."
- "When a message is flagged by moderation, notify an admin or moderator."

## Endpoint

```
POST /api/webhooks/cometchat
```

- Registered as a **public** route (CometChat servers call it from outside our auth context).
- Implemented in `backend/internal/handler/cometchat_webhook_handler.go`.
- Always returns `200 OK` to CometChat to prevent webhook retries, even when processing branches log a soft error.

## Event Flow

```
CometChat (message sent / moderation rule fires)
        │  POST { trigger, data, appId, createdAt }
        ▼
/api/webhooks/cometchat  (HandleWebhook)
        │
        ├── trigger = after_message_sent      → handleMessageSent()    → moderation_logs (is_flagged=false)
        ├── trigger = message_edited          → handleMessageEdited()  → log only
        └── trigger = after_message_moderated → handleModeration()     → moderation_logs (is_flagged=true)
                                                                              │
                                                                              ▼
                                                          GET /api/admin/moderation/logs
                                                                              │
                                                                              ▼
                                                          SuperAdmin dashboard (Moderation panel)
```

## Supported Triggers

| Trigger | Handler | Action |
|---|---|---|
| `after_message_sent` | `handleMessageSent` | Logs message activity (sender, receiver, type) to `moderation_logs` with `is_flagged = false` |
| `message_edited` | `handleMessageEdited` | Logs the edit event |
| `after_message_moderated` / `message_moderated` | `handleModeration` | Logs the flagged message with category + reason, `is_flagged = true` |

## Data Model

Migration `000010_moderation_logs.up.sql` creates:

```sql
CREATE TABLE moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type    VARCHAR(50)  NOT NULL,   -- 'message_sent' | 'moderation_flag' | ...
    sender_uid    VARCHAR(255) NOT NULL,   -- CometChat UID (= app user_id)
    sender_name   VARCHAR(255) NOT NULL DEFAULT '',
    receiver_id   VARCHAR(255) NOT NULL DEFAULT '',
    message_type  VARCHAR(50)  NOT NULL DEFAULT 'text',
    message_text  TEXT         DEFAULT '',
    is_flagged    BOOLEAN      NOT NULL DEFAULT FALSE,
    flag_category VARCHAR(100) DEFAULT '',  -- 'toxicity', 'profanity', ...
    flag_reason   VARCHAR(255) DEFAULT '',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

Indexes optimise the two access patterns: flagged-messages-first (admin review) and per-sender lookup.

## Admin Visibility

`GET /api/admin/moderation/logs` (SuperAdmin only) now returns **real rows** from `moderation_logs` (previously returned mock data). The handler is `SuperAdminHandler.GetModerationLogs` → `SuperAdminService.GetModerationLogs` → `PostgresRepo.GetModerationLogs`.

## Security Validation

For staging, the endpoint accepts events as-is. For production, CometChat webhook security options:
1. **Basic Auth / custom header** — configure a secret header in the CometChat dashboard webhook settings and validate it in `HandleWebhook` before processing.
2. **IP allowlisting** — restrict the route to CometChat's published egress IPs at the reverse proxy.

The handler is structured so this check slots in at the top of `HandleWebhook` (read header → compare to `COMETCHAT_WEBHOOK_SECRET` → 401 on mismatch) without touching the processing branches.

## Dashboard Configuration (one-time)

1. CometChat Dashboard → your app → **Webhooks**.
2. Add a webhook pointing to `https://<your-domain>/api/webhooks/cometchat`.
3. Subscribe to triggers: `after_message_sent`, `after_message_moderated`.
4. (Production) set a secret header and mirror it into `COMETCHAT_WEBHOOK_SECRET`.

## Demo Steps

1. Enable a Moderation Rule (e.g. block a banned keyword) on the dashboard.
2. Log in as a hacker, open team or 1-on-1 chat, send a message containing the banned keyword.
3. CometChat flags the message and fires `after_message_moderated`.
4. The backend logs it to `moderation_logs` (watch the server log: `⚠️ MODERATION FLAG`).
5. Log in as SuperAdmin → Moderation panel → the flagged entry appears.
