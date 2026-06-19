package com.matrix.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.cometchat.chat.core.Call;
import com.cometchat.chat.core.CometChat;
import com.cometchat.chat.exceptions.CometChatException;
import com.cometchat.chatuikit.calls.incomingcall.CometChatIncomingCall;

/**
 * IncomingCallActivity
 *
 * Hosts the CometChatIncomingCall VIEW component inside a proper Activity.
 *
 * CometChatIncomingCall is NOT an Activity itself — it's a UIKit View.
 * Attempting to start it directly as an Activity causes:
 *   "InstantiationException: has no zero argument constructor"
 *
 * This Activity is launched by MatrixApplication's global CallListener
 * and by MyFirebaseMessagingService when a call push arrives.
 * The active Call object is passed via a static holder (Call is not Parcelable).
 *
 * Manifest flags: showOnLockScreen + turnScreenOn so it appears on the lock screen.
 */
public class IncomingCallActivity extends AppCompatActivity {

    private static final String TAG = "IncomingCallActivity";

    private final ActivityResultLauncher<String[]> requestPermissionsLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                boolean recordAudioGranted = result.getOrDefault(Manifest.permission.RECORD_AUDIO, false);
                boolean cameraGranted = result.getOrDefault(Manifest.permission.CAMERA, false);
                if (!recordAudioGranted || !cameraGranted) {
                    Toast.makeText(this, "Camera and microphone permissions are required to answer calls", Toast.LENGTH_LONG).show();
                }
            });

    /** Static holder — the only safe way to pass a non-Parcelable Call object to an Activity. */
    private static Call pendingCall = null;

    /** Called by MatrixApplication / FCM service before starting this Activity. */
    public static void setIncomingCall(Call call) {
        pendingCall = call;
    }

    private CometChatIncomingCall incomingCallView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure window flags to show over lock screen and wake the screen
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            android.app.KeyguardManager keyguardManager = (android.app.KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                keyguardManager.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                    | android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
                    | android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        }

        setContentView(R.layout.activity_incoming_call);

        incomingCallView = findViewById(R.id.incoming_call_view);
        bindCall();
        checkAndRequestPermissions();
    }

    /**
     * Called when a second call arrives while this Activity is already on top
     * (because we use FLAG_ACTIVITY_SINGLE_TOP).
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Log.d(TAG, "onNewIntent — re-binding incoming call");
        bindCall();
    }

    private void bindCall() {
        Call callToBind = pendingCall;
        if (callToBind != null) {
            Log.d(TAG, "Showing incoming call screen for session: " + callToBind.getSessionId());
            // Ensure Calls SDK is logged in before showing the UI.
            // If not, accept/reject buttons will fail silently.
            ensureCallsSdkLoggedIn(callToBind);
            pendingCall = null; // consumed
        } else {
            // Fallback: try to get the active call from the SDK
            // This handles the case where the Activity is recreated after process death
            Log.w(TAG, "No pending call found — checking active call from SDK");
            Call activeCall = CometChat.getActiveCall();
            if (activeCall != null) {
                Log.d(TAG, "Found active call from SDK: " + activeCall.getSessionId());
                ensureCallsSdkLoggedIn(activeCall);
            } else {
                Log.e(TAG, "No active call available — finishing IncomingCallActivity");
                finish();
                return;
            }
        }

        // Observe call accepted/rejected/cancelled states on the ViewModel to finish this Activity.
        // We do NOT call setOnAcceptClick or setOnRejectClick because setting them overrides
        // the default SDK call handling logic (acceptCall/rejectCall) in CometChatIncomingCall.
        incomingCallView.getViewModel().getAcceptedCall().observe(this, call -> {
            Log.d(TAG, "Observed call accepted, finishing IncomingCallActivity");
            finish();
        });

        incomingCallView.getViewModel().getRejectCall().observe(this, call -> {
            Log.d(TAG, "Observed call rejected/cancelled, finishing IncomingCallActivity");
            finish();
        });
    }

    /**
     * Ensures CometChatCalls is logged in before binding the call.
     * Without a Calls SDK session, accept/reject silently fails.
     *
     * API (Calls SDK v5.0.0):
     *   CometChatCalls.login(uid, authKey, CallbackListener)
     *
     * Note: User class in Chat SDK v5.0.1 has no getAuthToken(), so we use UID + AUTH_KEY.
     */
    @SuppressWarnings("unchecked")
    private void ensureCallsSdkLoggedIn(Call call) {
        com.cometchat.chat.models.User loggedInUser = CometChat.getLoggedInUser();
        if (loggedInUser == null) {
            Log.w(TAG, "CometChat user not logged in — binding call anyway");
            incomingCallView.setCall(call);
            return;
        }

        String uid = loggedInUser.getUid();
        com.cometchat.calls.core.CometChatCalls.login(uid, com.matrix.app.CometChatManager.AUTH_KEY,
                new com.cometchat.calls.core.CometChatCalls.CallbackListener() {
                    @Override
                    public void onSuccess(Object callUser) {
                        Log.d(TAG, "Calls SDK session ensured for UID=" + uid + " ✓");
                        incomingCallView.setCall(call);
                    }
                    @Override
                    public void onError(com.cometchat.calls.exceptions.CometChatException e) {
                        // Error code ERR_ALREADY_LOGGED_IN means we are already logged in — just bind
                        Log.d(TAG, "Calls SDK login result: " + e.getCode() + " — binding call anyway");
                        incomingCallView.setCall(call);
                    }
                });
    }

    private void checkAndRequestPermissions() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionsLauncher.launch(new String[]{
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.CAMERA
            });
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        pendingCall = null;
    }
}
