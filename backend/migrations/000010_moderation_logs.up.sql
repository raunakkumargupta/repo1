-- CometChat Moderation Logs table
-- Stores webhook events from CometChat for moderation and activity tracking
CREATE TABLE IF NOT EXISTS moderation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,           -- 'message_sent', 'moderation_flag', etc.
    sender_uid VARCHAR(255) NOT NULL,          -- CometChat UID of the sender
    sender_name VARCHAR(255) NOT NULL DEFAULT '',
    receiver_id VARCHAR(255) NOT NULL DEFAULT '',
    message_type VARCHAR(50) NOT NULL DEFAULT 'text',
    message_text TEXT DEFAULT '',
    is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    flag_category VARCHAR(100) DEFAULT '',      -- 'toxicity', 'profanity', etc.
    flag_reason VARCHAR(255) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for admin dashboard queries (flagged messages)
CREATE INDEX idx_moderation_logs_flagged ON moderation_logs (is_flagged, created_at DESC);
-- Index for user-specific lookups
CREATE INDEX idx_moderation_logs_sender ON moderation_logs (sender_uid, created_at DESC);
