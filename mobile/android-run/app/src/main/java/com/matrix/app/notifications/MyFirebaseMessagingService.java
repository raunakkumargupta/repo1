package com.matrix.app.notifications;

import android.util.Log;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.matrix.app.ApiClient;
import com.matrix.app.MatrixApi;
import com.matrix.app.SecurityManager;
import com.matrix.app.models.DeviceTokenRequest;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Service to handle Firebase Cloud Messaging (FCM) push notification events
 * and register/update device tokens with the Go backend.
 */
public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";
    private static int notifId = 3000;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        String title = null;
        String body = null;

        // Check if message contains a notification payload.
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
        }

        // Check if message contains a data payload (allows customization/silent background push handling)
        if (remoteMessage.getData().size() > 0) {
            if (title == null && remoteMessage.getData().containsKey("title")) {
                title = remoteMessage.getData().get("title");
            }
            if (body == null && remoteMessage.getData().containsKey("body")) {
                body = remoteMessage.getData().get("body");
            }
        }

        if (title == null) title = "Hackathon Announcement";
        if (body == null) body = "New update received from server.";

        // Fire a local user notification
        NotificationHelper helper = new NotificationHelper(this);
        helper.showNotification(title, body, notifId++);

        // Save to local notification store
        NotificationStore store = new NotificationStore(this);
        store.addNotification(new NotificationItem(title, body, System.currentTimeMillis()));
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "Refreshed token: " + token);

        // Upload token to backend if authenticated
        SecurityManager securityManager = new SecurityManager(this);
        if (securityManager.getToken() != null) {
            sendTokenToBackend(securityManager, token);
        }
    }

    private void sendTokenToBackend(SecurityManager securityManager, String token) {
        MatrixApi api = ApiClient.getClient(securityManager).create(MatrixApi.class);
        DeviceTokenRequest request = new DeviceTokenRequest(token);

        api.registerDeviceToken(request).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                if (response.isSuccessful()) {
                    Log.d(TAG, "Successfully registered FCM token on backend");
                } else {
                    Log.w(TAG, "Failed to register FCM token: " + response.code());
                }
            }

            @Override
            public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                Log.e(TAG, "Error registering FCM token", t);
            }
        });
    }
}
