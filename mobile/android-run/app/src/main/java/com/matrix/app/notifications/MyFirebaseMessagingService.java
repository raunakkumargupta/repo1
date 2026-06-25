package com.matrix.app.notifications;

import android.app.PendingIntent;
import android.content.Intent;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.cometchat.chat.core.CometChat;
import com.matrix.app.IncomingCallActivity;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.matrix.app.ApiClient;
import com.matrix.app.CometChatManager;
import com.matrix.app.LoginActivity;
import com.matrix.app.MatrixApi;
import com.matrix.app.R;
import com.matrix.app.SecurityManager;
import com.matrix.app.models.DeviceTokenRequest;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Firebase Messaging Service.
 *
 * Handles two types of push messages:
 *   1. CometChat data pushes  — type == "chat" or type == "call"
 *   2. Matrix backend pushes  — hackathon announcements
 *
 * CometChat sends data-only FCM messages (no notification block), so we
 * must build and display notifications ourselves in onMessageReceived().
 */
public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";
    private static int notifId = 3000;

    // -----------------------------------------------------------------------
    // IMPORTANT: Set this to your CometChat Push Provider ID.
    // Go to https://app.cometchat.com → your app → Notifications →
    // Push Notifications → Add Provider → FCM → upload Firebase service
    // account JSON → copy the Provider ID here.
    // -----------------------------------------------------------------------
    public static final String COMETCHAT_PUSH_PROVIDER_ID = "cometchat-push-android";

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "Message received from: " + remoteMessage.getFrom());

        // ── CometChat data push ──────────────────────────────────────────
        if (!remoteMessage.getData().isEmpty()) {
            String type = remoteMessage.getData().get("type");
            if ("call".equalsIgnoreCase(type)) {
                handleCometChatCall(remoteMessage);
                return;
            }
            if ("chat".equalsIgnoreCase(type)) {
                handleCometChatMessage(remoteMessage);
                return;
            }
        }

        // ── Matrix backend notification push ─────────────────────────────
        String title = null;
        String body  = null;

        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body  = remoteMessage.getNotification().getBody();
        }
        if (remoteMessage.getData().containsKey("title")) title = remoteMessage.getData().get("title");
        if (remoteMessage.getData().containsKey("body"))  body  = remoteMessage.getData().get("body");

        if (title == null) title = "Matrix Update";
        if (body  == null) body  = "New update from Matrix.";

        NotificationHelper helper = new NotificationHelper(this);
        helper.showNotification(title, body, notifId++);

        NotificationStore store = new NotificationStore(this);
        store.addNotification(new NotificationItem(title, body, System.currentTimeMillis()));
    }

    // -----------------------------------------------------------------------
    // CometChat incoming CALL push
    // callAction: "initiated" → show incoming call screen
    //             "cancelled" / "unanswered" → dismiss
    // -----------------------------------------------------------------------
    private void handleCometChatCall(RemoteMessage message) {
        String callAction = message.getData().get("callAction");
        String sessionId  = message.getData().get("sessionId");
        String callType   = message.getData().get("callType");   // "audio" or "video"
        String senderName = message.getData().get("senderName");

        Log.d(TAG, "CometChat call push — action=" + callAction + " session=" + sessionId);

        if ("initiated".equalsIgnoreCase(callAction)) {
            // Launch the IncomingCallActivity which wraps CometChatIncomingCall view
            // For FCM-triggered calls we don't have the Call object yet — the Activity
            // will fall back to CometChat.getActiveCall() to find the ringing call.
            Intent intent = new Intent(this, IncomingCallActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(intent);

            // Also show a heads-up notification as fallback (e.g. if screen is locked)
            showCallNotification(senderName, callType, sessionId);
        }
        // For "cancelled" / "unanswered" — CometChat SDK handles dismissal automatically
    }

    // -----------------------------------------------------------------------
    // CometChat chat message push — mark delivered + show notification
    // -----------------------------------------------------------------------
    private void handleCometChatMessage(RemoteMessage message) {
        String title          = message.getData().get("title");
        String body           = message.getData().get("body");
        String sender         = message.getData().get("sender");
        String receiver       = message.getData().get("receiver");
        String receiverType   = message.getData().get("receiverType");
        String tagStr         = message.getData().get("tag");  // message ID
        String messageType    = message.getData().get("messageType");

        // Mark the message as delivered even when app is backgrounded
        if (tagStr != null && sender != null && receiverType != null && receiver != null) {
            try {
                CometChat.markAsDelivered(Long.parseLong(tagStr), sender, receiverType, receiver);
            } catch (NumberFormatException ignored) {}
        }

        boolean isMeeting = "meeting".equalsIgnoreCase(messageType) 
                || (body != null && body.toLowerCase().contains("meeting"))
                || (title != null && title.toLowerCase().contains("call") && "group".equalsIgnoreCase(receiverType));

        if (isMeeting) {
            title = "Live Group Call";
            if (body == null || body.isEmpty() || body.equals("You have a new message")) {
                body = "A team member started a video call.";
            }
        }

        if (title == null) title = "New Message";
        if (body  == null) body  = "You have a new message";

        // Route tap: group message/call -> open GroupChatActivity; direct message -> open LoginActivity
        Intent tapIntent;
        if ("group".equalsIgnoreCase(receiverType) && receiver != null) {
            tapIntent = new Intent(this, com.matrix.app.chat.GroupChatActivity.class);
            tapIntent.putExtra("guid", receiver);
            tapIntent.putExtra("name", "Team Chat");
        } else {
            tapIntent = new Intent(this, LoginActivity.class);
            if (sender != null) tapIntent.putExtra("uid", sender);
        }
        tapIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, notifId, tapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, isMeeting ? "Call" : "Message")
                .setSmallIcon(isMeeting ? android.R.drawable.ic_menu_call : android.R.drawable.ic_dialog_email)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);

        NotificationManagerCompat.from(this).notify(notifId++, builder.build());

        // Store locally
        NotificationStore store = new NotificationStore(this);
        store.addNotification(new NotificationItem(title, body, System.currentTimeMillis()));
    }

    // -----------------------------------------------------------------------
    // Heads-up call notification (shown on lock screen / status bar)
    // -----------------------------------------------------------------------
    private void showCallNotification(String callerName, String callType, String sessionId) {
        if (callerName == null) callerName = "Someone";
        String callTypeLabel = "video".equalsIgnoreCase(callType) ? "Video" : "Voice";
        String title = "Incoming " + callTypeLabel + " Call";
        String body  = callerName + " is calling…";

        Intent fullScreenIntent = new Intent(this, IncomingCallActivity.class);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this, 0, fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "Call")
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(false)
                .setOngoing(true);

        NotificationManagerCompat.from(this).notify(9999, builder.build());
    }

    // -----------------------------------------------------------------------
    // FCM token refresh — re-register with both Matrix backend and CometChat
    // -----------------------------------------------------------------------
    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM token refreshed");

        // 1. Register with Matrix backend
        SecurityManager securityManager = new SecurityManager(this);
        if (securityManager.getToken() != null) {
            sendTokenToMatrixBackend(securityManager, token);
        }

        // 2. Register with CometChat (so call/message pushes arrive)
        registerTokenWithCometChat(token);
    }

    private void sendTokenToMatrixBackend(SecurityManager securityManager, String token) {
        MatrixApi api = ApiClient.getClient(securityManager).create(MatrixApi.class);
        api.registerDeviceToken(new DeviceTokenRequest(token)).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(@NonNull Call<Void> call, @NonNull Response<Void> response) {
                Log.d(TAG, "FCM token registered with Matrix backend");
            }
            @Override
            public void onFailure(@NonNull Call<Void> call, @NonNull Throwable t) {
                Log.e(TAG, "FCM token registration with Matrix backend failed", t);
            }
        });
    }

    /**
     * Registers the FCM token with CometChat so it can deliver call and
     * message push notifications. Must be called after CometChat login.
     */
    public static void registerTokenWithCometChat(String token) {
        if (token == null || token.isEmpty()) return;

        // Only register if CometChat is initialised and user is logged in
        if (!com.cometchat.chatuikit.shared.cometchatuikit.CometChatUIKit.isSDKInitialized()) return;
        if (com.cometchat.chatuikit.shared.cometchatuikit.CometChatUIKit.getLoggedInUser() == null) return;

        com.cometchat.chat.core.CometChatNotifications.registerPushToken(
                token,
                com.cometchat.chat.enums.PushPlatforms.FCM_ANDROID,
                COMETCHAT_PUSH_PROVIDER_ID,
                new CometChat.CallbackListener<String>() {
                    @Override
                    public void onSuccess(String s) {
                        Log.d(TAG, "FCM token registered with CometChat ✓");
                    }
                    @Override
                    public void onError(com.cometchat.chat.exceptions.CometChatException e) {
                        Log.w(TAG, "FCM token registration with CometChat failed: " + e.getMessage());
                    }
                }
        );
    }
}
