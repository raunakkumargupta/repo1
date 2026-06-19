package com.matrix.app;

import android.content.Context;
import android.util.Log;

import com.cometchat.chat.core.CometChat;
import com.cometchat.chat.exceptions.CometChatException;
import com.cometchat.chat.models.User;
import com.cometchat.chatuikit.shared.cometchatuikit.CometChatUIKit;
import com.cometchat.chatuikit.shared.cometchatuikit.UIKitSettings;

/**
 * Singleton manager for CometChat SDK initialization and login.
 *
 * Usage:
 *   CometChatManager.getInstance().init(context, callback)
 *   CometChatManager.getInstance().loginAsUser(uid, callback)
 */
public class CometChatManager {

    private static final String TAG = "CometChatManager";

    // CometChat App credentials — from .env
    public static final String APP_ID   = "1680184fff9efba78";
    public static final String REGION   = "in";
    public static final String AUTH_KEY = "c973c5607c75f3dbebe07a8845e6fa7a7cddfab7";

    private static CometChatManager instance;

    public static synchronized CometChatManager getInstance() {
        if (instance == null) {
            instance = new CometChatManager();
        }
        return instance;
    }

    private CometChatManager() {}

    public interface InitCallback {
        void onSuccess();
        void onError(String message);
    }

    public interface LoginCallback {
        void onSuccess(User user);
        void onError(String message);
    }

    /**
     * Initialize CometChat UIKit.
     * Safe to call multiple times — guards with isSDKInitialized().
     */
    public void init(Context context, InitCallback callback) {
        if (CometChatUIKit.isSDKInitialized()) {
            Log.d(TAG, "SDK already initialized");
            callback.onSuccess();
            return;
        }

        UIKitSettings uiKitSettings = new UIKitSettings.UIKitSettingsBuilder()
                .setAppId(APP_ID)
                .setRegion(REGION)
                .setAuthKey(AUTH_KEY)
                .subscribePresenceForAllUsers()
                .build();

        CometChatUIKit.init(context, uiKitSettings, new CometChat.CallbackListener<String>() {
            @Override
            public void onSuccess(String s) {
                Log.d(TAG, "CometChat SDK initialized successfully");
                
                // Initialize Calls SDK here, AFTER Chat SDK
                com.cometchat.calls.core.CallAppSettings callAppSettings = new com.cometchat.calls.core.CallAppSettings.CallAppSettingBuilder()
                        .setAppId(APP_ID)
                        .setRegion(REGION)
                        .build();

                com.cometchat.calls.core.CometChatCalls.init(context, callAppSettings, new com.cometchat.calls.core.CometChatCalls.CallbackListener<String>() {
                    @Override
                    public void onSuccess(String s) {
                        Log.d(TAG, "CometChatCalls SDK initialized ✓");
                        callback.onSuccess();
                    }
                    @Override
                    public void onError(com.cometchat.calls.exceptions.CometChatException e) {
                        Log.w(TAG, "CometChatCalls init failed: " + e.getMessage());
                        callback.onError(e.getMessage());
                    }
                });
            }

            @Override
            public void onError(CometChatException e) {
                Log.e(TAG, "CometChat init failed: " + e.getMessage());
                callback.onError(e.getMessage());
            }
        });
    }

    /**
     * Login a user by UID.
     * The UID must match a user registered in CometChat. For Matrix users, the UID
     * is derived from the backend user ID (e.g. "user-<uuid>") or the email username.
     * We store the CometChat UID as the backend user's email prefix.
     */
    public void loginAsUser(String uid, LoginCallback callback) {
        // Check if already logged in as this user
        User loggedIn = CometChatUIKit.getLoggedInUser();
        if (loggedIn != null) {
            if (loggedIn.getUid().equals(uid)) {
                Log.d(TAG, "Already logged in as: " + uid + " — ensuring Calls SDK is logged in");
                loginCallsSdk(loggedIn, callback);
                return;
            }
            // Different user — logout first
            CometChatUIKit.logout(new CometChat.CallbackListener<String>() {
                @Override
                public void onSuccess(String s) {
                    performLogin(uid, callback);
                }
                @Override
                public void onError(CometChatException e) {
                    // Still try to login
                    performLogin(uid, callback);
                }
            });
        } else {
            performLogin(uid, callback);
        }
    }

    private void performLogin(String uid, LoginCallback callback) {
        CometChatUIKit.login(uid, new CometChat.CallbackListener<User>() {
            @Override
            public void onSuccess(User user) {
                Log.d(TAG, "CometChat login success: " + user.getUid());

                // Register FCM token with CometChat immediately after login
                com.google.firebase.messaging.FirebaseMessaging.getInstance().getToken()
                        .addOnCompleteListener(task -> {
                            if (task.isSuccessful() && task.getResult() != null) {
                                com.matrix.app.notifications.MyFirebaseMessagingService
                                        .registerTokenWithCometChat(task.getResult());
                            }
                        });

                // CRITICAL: Login to Calls SDK using auth token — required for
                // accept/reject to work in CometChatIncomingCall.
                loginCallsSdk(user, callback);
            }

            @Override
            public void onError(CometChatException e) {
                Log.e(TAG, "CometChat login failed for UID=" + uid + ": " + e.getMessage());
                callback.onError(e.getMessage());
            }
        });
    }

    /**
     * Log in to CometChatCalls SDK.
     * Must be called after Chat SDK login — without this, accept/reject in
     * CometChatIncomingCall silently fails.
     *
     * API (Calls SDK v5.0.0):
     *   CometChatCalls.login(uid, authKey, CallbackListener) — UID + auth key
     *
     * Note: Chat SDK v5.0.1 User class does NOT expose getAuthToken(), so we
     * use the UID + AUTH_KEY overload exclusively.
     */
    @SuppressWarnings("unchecked")
    private void loginCallsSdk(User user, LoginCallback callback) {
        String uid = user.getUid();
        com.cometchat.calls.core.CometChatCalls.login(uid, AUTH_KEY,
                new com.cometchat.calls.core.CometChatCalls.CallbackListener() {
                    @Override
                    public void onSuccess(Object callUser) {
                        Log.d(TAG, "CometChatCalls SDK logged in for UID=" + uid + " ✓");
                        callback.onSuccess(user);
                    }
                    @Override
                    public void onError(com.cometchat.calls.exceptions.CometChatException e) {
                        Log.w(TAG, "CometChatCalls login failed (" + e.getCode() + ") — calls may not work");
                        // Still report chat login success — messaging will still work
                        callback.onSuccess(user);
                    }
                });
    }

    /**
     * Logout from CometChat. Call this when the user signs out of the Matrix app.
     */
    public void logout() {
        if (CometChatUIKit.getLoggedInUser() != null) {
            CometChatUIKit.logout(new CometChat.CallbackListener<String>() {
                @Override
                public void onSuccess(String s) {
                    Log.d(TAG, "CometChat logged out");
                }
                @Override
                public void onError(CometChatException e) {
                    Log.w(TAG, "CometChat logout error: " + e.getMessage());
                }
            });
        }
    }

    /**
     * Derive a CometChat UID from the backend user email.
     * Convention: lowercase email prefix (before @). Matches the sync-cometchat-users script.
     * Example: hacker1@matrix.com → hacker1-matrix-com  (safe chars only)
     */
    public static String uidFromEmail(String email) {
        if (email == null) return "unknown";
        // Replace special chars with hyphen and lowercase
        return email.toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
    }
}
