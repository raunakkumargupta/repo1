package com.matrix.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.matrix.app.models.FcmTokenRequest;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MatrixFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MatrixFCM";
    private static final String CHANNEL_ID = "matrix_notifications";

    /**
     * Called when a new FCM token is generated.
     * We immediately sync it with our backend so push notifications can be targeted to this device.
     */
    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token: " + token);
        sendTokenToServer(token);
    }

    /**
     * Called when a push notification arrives while the app is in the foreground.
     * For background messages, the system tray handles display automatically.
     */
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "Message received from: " + remoteMessage.getFrom());

        String title = "Matrix Command";
        String body = "";

        // Check for a data payload (key-value pairs)
        if (!remoteMessage.getData().isEmpty()) {
            Log.d(TAG, "Data payload: " + remoteMessage.getData());
            if (remoteMessage.getData().containsKey("title")) {
                title = remoteMessage.getData().get("title");
            }
            if (remoteMessage.getData().containsKey("body")) {
                body = remoteMessage.getData().get("body");
            }
        }

        // Check for a notification payload
        if (remoteMessage.getNotification() != null) {
            String notifTitle = remoteMessage.getNotification().getTitle();
            String notifBody = remoteMessage.getNotification().getBody();
            if (notifTitle != null) title = notifTitle;
            if (notifBody != null) body = notifBody;
        }

        showNotification(title, body);
    }

    private void showNotification(String title, String body) {
        Intent intent = new Intent(this, DashboardActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(pendingIntent);

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Create notification channel (required for Android 8+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Matrix Command Notifications",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Team invites, ticket updates, announcements");
            notificationManager.createNotificationChannel(channel);
        }

        notificationManager.notify((int) System.currentTimeMillis(), builder.build());
    }

    private void sendTokenToServer(String token) {
        SecurityManager securityManager = new SecurityManager(this);
        String authToken = securityManager.getToken();

        if (authToken == null) {
            // User not logged in yet; token will be sent upon next login
            Log.d(TAG, "No auth token, skipping FCM registration");
            return;
        }

        MatrixApi api = ApiClient.getClient(securityManager).create(MatrixApi.class);
        api.registerFcmToken(new FcmTokenRequest(token)).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    Log.d(TAG, "FCM token synced with backend successfully");
                } else {
                    Log.w(TAG, "Failed to sync FCM token: " + response.code());
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Log.e(TAG, "Network error syncing FCM token: " + t.getMessage());
            }
        });
    }
}
