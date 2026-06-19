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
import com.cometchat.chat.models.Group;
import com.cometchat.chatuikit.messagecomposer.CometChatMessageComposer;
import com.cometchat.chatuikit.messageheader.CometChatMessageHeader;
import com.cometchat.chatuikit.messagelist.CometChatMessageList;
import com.matrix.app.R;

/**
 * Full-screen group (team) chat Activity powered by CometChat UIKit v5.
 *
 * The GUID is the CometChat group identifier — for Matrix teams it is typically
 * the backend team UUID (set when the organizer creates the team CometChat group).
 *
 * Launch with:
 *   Intent intent = new Intent(context, GroupChatActivity.class);
 *   intent.putExtra("guid", "<team_id_or_ticket_id>");
 *   intent.putExtra("name", "Team Alpha");    // optional display name
 *   startActivity(intent);
 */
public class GroupChatActivity extends AppCompatActivity {

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
        setContentView(R.layout.activity_group_chat);

        String guid = getIntent().getStringExtra("guid");
        String name = getIntent().getStringExtra("name");

        if (guid == null || guid.isEmpty()) {
            Toast.makeText(this, "No group to chat with", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        CometChatMessageHeader header      = findViewById(R.id.group_chat_header);
        CometChatMessageList   messageList = findViewById(R.id.group_chat_message_list);
        CometChatMessageComposer composer  = findViewById(R.id.group_chat_composer);

        header.setBackIconVisibility(View.VISIBLE);
        header.setOnBackPress(() -> finish());

        // Fetch group object then wire into all components
        CometChat.getGroup(guid, new CometChat.CallbackListener<Group>() {
            @Override
            public void onSuccess(Group group) {
                header.setGroup(group);
                messageList.setGroup(group);
                composer.setGroup(group);
            }

            @Override
            public void onError(CometChatException e) {
                Toast.makeText(GroupChatActivity.this,
                        "Could not load group: " + e.getMessage(), Toast.LENGTH_SHORT).show();
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
