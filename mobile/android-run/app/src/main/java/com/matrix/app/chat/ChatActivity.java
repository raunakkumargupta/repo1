package com.matrix.app.chat;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.cometchat.chat.core.CometChat;
import com.cometchat.chat.exceptions.CometChatException;
import com.cometchat.chat.models.User;
import com.cometchat.chatuikit.messagecomposer.CometChatMessageComposer;
import com.cometchat.chatuikit.messageheader.CometChatMessageHeader;
import com.cometchat.chatuikit.messagelist.CometChatMessageList;
import com.matrix.app.R;

/**
 * Full-screen 1-on-1 direct message activity powered by CometChat UIKit v5.
 *
 * Launch with:
 *   Intent intent = new Intent(context, ChatActivity.class);
 *   intent.putExtra("uid", "<cometchat_uid>");
 *   intent.putExtra("name", "John Doe");    // optional display name for title
 *   startActivity(intent);
 */
public class ChatActivity extends AppCompatActivity {

    private final ActivityResultLauncher<String[]> requestPermissionsLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), result -> {
                boolean recordAudioGranted = result.getOrDefault(Manifest.permission.RECORD_AUDIO, false);
                boolean cameraGranted = result.getOrDefault(Manifest.permission.CAMERA, false);
                if (!recordAudioGranted || !cameraGranted) {
                    Toast.makeText(this, "Camera and microphone permissions are required for calling", Toast.LENGTH_LONG).show();
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);

        String uid  = getIntent().getStringExtra("uid");
        String name = getIntent().getStringExtra("name");

        if (uid == null || uid.isEmpty()) {
            Toast.makeText(this, "No user to chat with", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        CometChatMessageHeader header     = findViewById(R.id.chat_header);
        CometChatMessageList   messageList = findViewById(R.id.chat_message_list);
        CometChatMessageComposer composer  = findViewById(R.id.chat_composer);

        header.setBackIconVisibility(View.VISIBLE);
        header.setOnBackPress(() -> finish());

        // Fetch user object then wire into all components
        CometChat.getUser(uid, new CometChat.CallbackListener<User>() {
            @Override
            public void onSuccess(User user) {
                header.setUser(user);
                messageList.setUser(user);
                composer.setUser(user);
            }

            @Override
            public void onError(CometChatException e) {
                Toast.makeText(ChatActivity.this,
                        "Could not load chat: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                finish();
            }
        });

        checkAndRequestPermissions();
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
}
