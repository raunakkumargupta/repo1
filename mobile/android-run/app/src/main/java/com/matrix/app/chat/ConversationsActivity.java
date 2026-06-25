package com.matrix.app.chat;

import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.cometchat.chat.models.Conversation;
import com.cometchat.chat.models.Group;
import com.cometchat.chat.models.User;
import com.cometchat.chatuikit.conversations.CometChatConversations;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.matrix.app.ApplicationsActivity;
import com.matrix.app.AIChatActivity;
import com.matrix.app.DashboardActivity;
import com.matrix.app.ExploreActivity;
import com.matrix.app.ProfileActivity;
import com.matrix.app.R;

/**
 * Chat Inbox — shows all CometChat conversations (1-on-1 + groups).
 * Accessible from the bottom nav "Chat" tab.
 *
 * Tapping a conversation:
 *  - User conversation → opens ChatActivity
 *  - Group conversation → opens GroupChatActivity
 */
public class ConversationsActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_conversations);

        CometChatConversations conversations = findViewById(R.id.conversations);

        conversations.setOnItemClick((view, position, conversation) -> {
            if (conversation == null) return;

            Object convWith = conversation.getConversationWith();

            if (convWith instanceof User) {
                User user = (User) convWith;
                Intent intent = new Intent(this, ChatActivity.class);
                intent.putExtra("uid", user.getUid());
                intent.putExtra("name", user.getName());
                startActivity(intent);

            } else if (convWith instanceof Group) {
                Group group = (Group) convWith;
                Intent intent = new Intent(this, GroupChatActivity.class);
                intent.putExtra("guid", group.getGuid());
                intent.putExtra("name", group.getName());
                startActivity(intent);
            }
        });

        // Bottom navigation
        BottomNavigationView bottomNav = findViewById(R.id.bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_chat);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_chat) return true;
            if (id == R.id.nav_home) {
                startActivity(new Intent(this, DashboardActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            if (id == R.id.nav_explore) {
                startActivity(new Intent(this, ExploreActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            if (id == R.id.nav_applications) {
                startActivity(new Intent(this, ApplicationsActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            if (id == R.id.nav_profile) {
                startActivity(new Intent(this, ProfileActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
            return false;
        });

        // AI Chatbot FAB
        findViewById(R.id.fab_ai_chat).setOnClickListener(v ->
                startActivity(new Intent(this, AIChatActivity.class)));
    }
}
