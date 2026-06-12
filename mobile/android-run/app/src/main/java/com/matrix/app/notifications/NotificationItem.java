package com.matrix.app.notifications;

/**
 * Represents a single in-app notification item.
 */
public class NotificationItem {
    private final String title;
    private final String body;
    private final long timestamp;
    private boolean read;

    public NotificationItem(String title, String body, long timestamp) {
        this.title = title;
        this.body = body;
        this.timestamp = timestamp;
        this.read = false;
    }

    public String getTitle() { return title; }
    public String getBody() { return body; }
    public long getTimestamp() { return timestamp; }
    public boolean isRead() { return read; }
    public void markRead() { this.read = true; }
}
