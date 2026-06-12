package com.matrix.app.notifications;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

/**
 * Local storage for in-app notifications.
 * Persists notifications using SharedPreferences + Gson serialization.
 */
public class NotificationStore {

    private static final String PREFS_NAME = "matrix_notifications";
    private static final String KEY_NOTIFICATIONS = "notification_list";
    private static final int MAX_NOTIFICATIONS = 50;

    private final SharedPreferences prefs;
    private final Gson gson;

    public NotificationStore(Context context) {
        this.prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        this.gson = new Gson();
    }

    public void addNotification(NotificationItem item) {
        List<NotificationItem> list = getNotifications();
        list.add(0, item); // newest first
        // Cap at max
        if (list.size() > MAX_NOTIFICATIONS) {
            list = list.subList(0, MAX_NOTIFICATIONS);
        }
        save(list);
    }

    public List<NotificationItem> getNotifications() {
        String json = prefs.getString(KEY_NOTIFICATIONS, null);
        if (json == null) return new ArrayList<>();

        Type type = new TypeToken<List<NotificationItem>>() {}.getType();
        List<NotificationItem> result = gson.fromJson(json, type);
        return result != null ? result : new ArrayList<>();
    }

    public int getUnreadCount() {
        int count = 0;
        for (NotificationItem item : getNotifications()) {
            if (!item.isRead()) count++;
        }
        return count;
    }

    public void markAllRead() {
        List<NotificationItem> list = getNotifications();
        for (NotificationItem item : list) {
            item.markRead();
        }
        save(list);
    }

    public void clear() {
        prefs.edit().remove(KEY_NOTIFICATIONS).apply();
    }

    private void save(List<NotificationItem> list) {
        String json = gson.toJson(list);
        prefs.edit().putString(KEY_NOTIFICATIONS, json).apply();
    }
}
