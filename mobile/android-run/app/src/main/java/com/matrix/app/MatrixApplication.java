package com.matrix.app;

import android.app.Application;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.cometchat.chat.core.CometChat;
import com.cometchat.chatuikit.calls.incomingcall.CometChatIncomingCall;
import com.cometchat.chat.models.CustomMessage;
import com.cometchat.chat.models.Group;
import com.cometchat.chat.models.User;
import com.cometchat.chat.models.TextMessage;
import com.cometchat.chat.models.MediaMessage;
import androidx.core.app.NotificationCompat;
import android.app.PendingIntent;

/**
 * Application class:
 *  1. Creates notification channels (chat, call, announcements)
 *  2. Initialises CometChatCalls SDK
 *  3. Registers a global incoming-call listener (must be here, not in an Activity)
 */
public class MatrixApplication extends Application {

    private static final String TAG = "MatrixApplication";
    private static final String CALL_LISTENER_ID = "matrix-global-call-listener";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
        registerGlobalCallListener();
        registerGlobalMessageListener();
    }

    // ── Notification channels ────────────────────────────────────────────────
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            NotificationChannel messageChannel = new NotificationChannel(
                    "Message", "Message Notifications", NotificationManager.IMPORTANCE_HIGH);
            messageChannel.setDescription("New chat messages from Matrix");
            manager.createNotificationChannel(messageChannel);

            NotificationChannel callChannel = new NotificationChannel(
                    "Call", "Call Notifications", NotificationManager.IMPORTANCE_HIGH);
            callChannel.setDescription("Incoming voice and video calls");
            callChannel.setSound(null, null);
            manager.createNotificationChannel(callChannel);

            NotificationChannel announcementChannel = new NotificationChannel(
                    "matrix_channel", "Matrix Announcements", NotificationManager.IMPORTANCE_DEFAULT);
            announcementChannel.setDescription("Hackathon announcements and updates");
            manager.createNotificationChannel(announcementChannel);

            // Fallback notification channel for FCM / CometChat background notifications
            NotificationChannel fallbackChannel = new NotificationChannel(
                    "fcm_fallback_notification_channel", "Miscellaneous", NotificationManager.IMPORTANCE_DEFAULT);
            fallbackChannel.setDescription("Fallback channel for background push notifications");
            manager.createNotificationChannel(fallbackChannel);
        }
    }

    // ── Global incoming call listener ────────────────────────────────────────
    // Registered here (Application scope) so it fires even when the foreground
    // Activity has been destroyed. Per skill rule 1.7: NEVER register in an Activity.
    private void registerGlobalCallListener() {
        CometChat.addCallListener(CALL_LISTENER_ID, new CometChat.CallListener() {
            @Override
            public void onIncomingCallReceived(com.cometchat.chat.core.Call call) {
                Log.d(TAG, "Incoming call received, session: " + call.getSessionId()
                        + ", type: " + call.getType()
                        + ", from: " + (call.getSender() != null ? call.getSender().getUid() : "unknown"));

                launchIncomingCallScreen(call);
            }

            @Override
            public void onOutgoingCallAccepted(com.cometchat.chat.core.Call call) {
                Log.d(TAG, "Outgoing call accepted, session: " + call.getSessionId());
            }

            @Override
            public void onOutgoingCallRejected(com.cometchat.chat.core.Call call) {
                Log.d(TAG, "Outgoing call rejected, action: " + call.getAction());
            }

            @Override
            public void onIncomingCallCancelled(com.cometchat.chat.core.Call call) {
                Log.d(TAG, "Incoming call cancelled");
            }

            @Override
            public void onCallEndedMessageReceived(com.cometchat.chat.core.Call call) {
                Log.d(TAG, "Call ended");
            }
        });
    }

    /**
     * Launches the CometChatIncomingCall UIKit Activity.
     * The UIKit resolves the active call internally — we pass sessionId as an
     * extra so the screen can display caller info immediately without waiting
     * for an additional network round-trip.
     */
    private void launchIncomingCallScreen(com.cometchat.chat.core.Call call) {
        try {
            // Store the Call in the static holder BEFORE starting the Activity
            // (Call is not Parcelable, so we cannot pass it through Intent extras)
            IncomingCallActivity.setIncomingCall(call);

            Intent intent = new Intent(getApplicationContext(), IncomingCallActivity.class);
            // FLAG_ACTIVITY_NEW_TASK: required to start from Application context
            // FLAG_ACTIVITY_SINGLE_TOP: if IncomingCallActivity is already on top, reuse it
            // Do NOT use CLEAR_TOP — it destroys the back stack (kills any open ChatActivity)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(intent);
            Log.d(TAG, "IncomingCallActivity launched for session: " + call.getSessionId());
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch IncomingCallActivity: " + e.getMessage(), e);
        }
    }


    // ── Global message listener for Group Calls (meetings) ─────────────────────
    private void registerGlobalMessageListener() {
        CometChat.addMessageListener("matrix-global-message-listener", new CometChat.MessageListener() {
            @Override
            public void onTextMessageReceived(TextMessage textMessage) {}

            @Override
            public void onMediaMessageReceived(MediaMessage mediaMessage) {}

            @Override
            public void onCustomMessageReceived(CustomMessage customMessage) {
                Log.d(TAG, "Custom message received, category: " + customMessage.getCategory() 
                        + ", type: " + customMessage.getType());

                if ("custom".equalsIgnoreCase(customMessage.getCategory()) 
                        && "meeting".equalsIgnoreCase(customMessage.getType())) {
                    
                    // Trigger a group call notification!
                    showGroupCallNotification(customMessage);
                }
            }
        });
    }

    private void showGroupCallNotification(CustomMessage message) {
        String senderName = message.getSender() != null ? message.getSender().getName() : "A team member";
        String groupName = "Team";
        if ("group".equalsIgnoreCase(message.getReceiverType())) {
            if (message.getReceiver() instanceof Group) {
                groupName = ((Group) message.getReceiver()).getName();
            }
        }
        String guid = message.getReceiverUid();

        String title = "Live Group Call";
        String body = senderName + " started a video call in " + groupName;

        // Route tap -> open GroupChatActivity
        Intent tapIntent = new Intent(this, com.matrix.app.chat.GroupChatActivity.class);
        tapIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        tapIntent.putExtra("guid", guid);
        tapIntent.putExtra("name", groupName);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 1002, tapIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, "Call")
                .setSmallIcon(android.R.drawable.ic_menu_call)
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(1002, builder.build());
        }
    }
}
