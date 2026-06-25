package com.matrix.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.matrix.app.chat.ConversationsActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.card.MaterialCardView;
import com.matrix.app.models.ApiUser;
import com.matrix.app.models.Hackathon;
import com.matrix.app.models.Registration;
import com.matrix.app.CometChatManager;



import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DashboardActivity extends AppCompatActivity {

    private MatrixApi api;
    private SecurityManager securityManager;

    private TextView tvWelcomeName, tvWelcomeSubtitle, tvAvatarInitials;
    private TextView tvApplicationsCount, tvTeamCount, tvMentorCount;
    private LinearLayout registrationsContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        securityManager = new SecurityManager(this);
        api = ApiClient.getClient(securityManager).create(MatrixApi.class);

        tvWelcomeName        = findViewById(R.id.tv_welcome_name);
        tvWelcomeSubtitle    = findViewById(R.id.tv_welcome_subtitle);
        tvAvatarInitials     = findViewById(R.id.tv_avatar_initials);
        tvApplicationsCount  = findViewById(R.id.tv_applications_count);
        tvTeamCount          = findViewById(R.id.tv_team_count);
        tvMentorCount        = findViewById(R.id.tv_mentor_count);
        registrationsContainer = findViewById(R.id.registrations_container);

        // Avatar tap → Profile
        MaterialCardView btnAvatar = findViewById(R.id.btn_avatar);
        btnAvatar.setOnClickListener(v -> startActivity(new Intent(this, ProfileActivity.class)));

        // Quick action buttons
        findViewById(R.id.btn_explore).setOnClickListener(v ->
                startActivity(new Intent(this, ExploreActivity.class)));
        findViewById(R.id.btn_my_apps).setOnClickListener(v ->
                startActivity(new Intent(this, ApplicationsActivity.class)));
        findViewById(R.id.btn_see_all).setOnClickListener(v ->
                startActivity(new Intent(this, ApplicationsActivity.class)));

        // Bottom navigation
        BottomNavigationView bottomNav = findViewById(R.id.bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_home);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_home) return true;
            if (id == R.id.nav_explore) {
                startActivity(new Intent(this, ExploreActivity.class));
                overridePendingTransition(0, 0);
                return true;
            }
            if (id == R.id.nav_chat) {
                startActivity(new Intent(this, ConversationsActivity.class));
                overridePendingTransition(0, 0);
                return true;
            }
            if (id == R.id.nav_applications) {
                startActivity(new Intent(this, ApplicationsActivity.class));
                overridePendingTransition(0, 0);
                return true;
            }
            if (id == R.id.nav_profile) {
                startActivity(new Intent(this, ProfileActivity.class));
                overridePendingTransition(0, 0);
                return true;
            }
            return false;
        });

        // Register/refresh FCM token
        com.google.firebase.messaging.FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful() && task.getResult() != null) {
                        String token = task.getResult();
                        api.registerDeviceToken(new com.matrix.app.models.DeviceTokenRequest(token))
                                .enqueue(new Callback<Void>() {
                                    @Override
                                    public void onResponse(Call<Void> call, Response<Void> response) {
                                        android.util.Log.d("DashboardActivity", "FCM token registered");
                                    }
                                    @Override
                                    public void onFailure(Call<Void> call, Throwable t) {
                                        android.util.Log.e("DashboardActivity", "FCM token registration failed", t);
                                    }
                                });
                    }
                });

        // Ensure CometChat is initialised and user is logged in (handles cold-start / session loss)
        CometChatManager.getInstance().init(this, new CometChatManager.InitCallback() {
            @Override
            public void onSuccess() {
                android.util.Log.d("DashboardActivity", "CometChat SDK ready");

                String savedUserId = securityManager.getUserId();
                if (savedUserId != null && !savedUserId.isEmpty()) {
                    CometChatManager.getInstance().loginAsUser(savedUserId, new CometChatManager.LoginCallback() {
                        @Override
                        public void onSuccess(com.cometchat.chat.models.User user) {
                            android.util.Log.d("DashboardActivity", "CometChat login/session verify success: " + user.getUid());
                            registerFCMTokenWithCometChat();
                        }
                        @Override
                        public void onError(String message) {
                            android.util.Log.w("DashboardActivity", "CometChat login/session verify failed: " + message);
                        }
                    });
                }
            }
            @Override
            public void onError(String message) {
                android.util.Log.w("DashboardActivity", "CometChat init warn: " + message);
            }
        });

        // AI Chatbot FAB
        findViewById(R.id.fab_ai_chat).setOnClickListener(v ->
                startActivity(new Intent(this, AIChatActivity.class)));

        loadDashboard();
    }

    private void registerFCMTokenWithCometChat() {
        com.google.firebase.messaging.FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (task.isSuccessful() && task.getResult() != null) {
                        com.matrix.app.notifications.MyFirebaseMessagingService
                                .registerTokenWithCometChat(task.getResult());
                    }
                });
    }

    private void loadDashboard() {
        // ── Parallel: user info ──────────────────────────────────────────────
        api.getMe().enqueue(new Callback<ApiUser>() {
            @Override
            public void onResponse(Call<ApiUser> call, Response<ApiUser> response) {
                if (!response.isSuccessful() || response.body() == null) return;
                ApiUser user = response.body();
                String firstName = user.getName().split(" ")[0];
                tvWelcomeName.setText("Hey, " + firstName + " 👋");
                tvWelcomeSubtitle.setText(user.getEmail());
                String initials = user.getName().length() >= 1
                        ? String.valueOf(user.getName().charAt(0)).toUpperCase() : "?";
                tvAvatarInitials.setText(initials);
            }
            @Override
            public void onFailure(Call<ApiUser> call, Throwable t) {}
        });

        // ── Parallel: my registrations and hackathons list ───────────────────
        final List<Registration>[] regsHolder = new List[]{null};
        final List<Hackathon>[] hacksHolder = new List[]{null};
        final boolean[] failedRegs = {false};
        final int[] done = {0};

        Runnable merge = () -> {
            done[0]++;
            if (done[0] < 2) return; // wait for both

            if (failedRegs[0]) {
                showEmptyState("Unable to load data. Check your connection.");
                return;
            }

            List<Registration> myRegs = regsHolder[0] != null ? regsHolder[0] : new ArrayList<>();
            List<Hackathon> hackathons = hacksHolder[0] != null ? hacksHolder[0] : new ArrayList<>();

            // Update stat counters immediately
            long accepted = 0, pending = 0;
            for (Registration r : myRegs) {
                if ("accepted".equalsIgnoreCase(r.getApprovalStatus())) accepted++;
                else if ("pending".equalsIgnoreCase(r.getApprovalStatus())) pending++;
            }
            tvApplicationsCount.setText(String.valueOf(myRegs.size()));
            tvTeamCount.setText(String.valueOf(accepted));
            tvMentorCount.setText(String.valueOf(pending));

            renderRegistrations(myRegs, hackathons);
        };

        api.getMyAllRegistrations().enqueue(new Callback<List<Registration>>() {
            @Override
            public void onResponse(Call<List<Registration>> call, Response<List<Registration>> response) {
                if (response.isSuccessful() && response.body() != null) {
                    regsHolder[0] = response.body();
                } else {
                    regsHolder[0] = new ArrayList<>();
                }
                runOnUiThread(merge);
            }
            @Override
            public void onFailure(Call<List<Registration>> call, Throwable t) {
                regsHolder[0] = new ArrayList<>();
                failedRegs[0] = true;
                runOnUiThread(merge);
            }
        });

        api.listHackathons().enqueue(new Callback<List<Hackathon>>() {
            @Override
            public void onResponse(Call<List<Hackathon>> call, Response<List<Hackathon>> response) {
                hacksHolder[0] = (response.isSuccessful() && response.body() != null)
                        ? response.body() : new ArrayList<>();
                runOnUiThread(merge);
            }
            @Override
            public void onFailure(Call<List<Hackathon>> call, Throwable t) {
                hacksHolder[0] = new ArrayList<>();
                runOnUiThread(merge);
            }
        });
    }

    private void renderRegistrations(List<Registration> registrations, List<Hackathon> hackathons) {
        registrationsContainer.removeAllViews();

        if (registrations.isEmpty()) {
            showEmptyState("You haven't applied to any hackathons yet.\nTap 🔍 Explore to discover events.");
            return;
        }

        for (Registration reg : registrations) {
            View card = getLayoutInflater().inflate(R.layout.item_hackathon_card, registrationsContainer, false);
            TextView tvTitle  = card.findViewById(R.id.card_title);
            TextView tvStatus = card.findViewById(R.id.card_status);
            TextView tvDetail = card.findViewById(R.id.card_detail);

            // Find matching hackathon name
            String hackTitle = "Hackathon";
            Hackathon matched = null;
            for (Hackathon h : hackathons) {
                if (h.getId().equals(reg.getHackathonId())) {
                    hackTitle = h.getTitle();
                    matched = h;
                    break;
                }
            }
            tvTitle.setText(hackTitle);
            tvStatus.setText(reg.getApprovalStatus().toUpperCase());
            tvDetail.setText("Preference: " + reg.getTeamPreference()
                    + (reg.getGithubUrl() != null ? "  •  GitHub: ✓" : ""));

            // Color status
            switch (reg.getApprovalStatus().toLowerCase()) {
                case "accepted": tvStatus.setTextColor(0xFF10B981); break;
                case "pending":  tvStatus.setTextColor(0xFFF59E0B); break;
                case "rejected": tvStatus.setTextColor(0xFFEF4444); break;
            }

            // Tap → hackathon detail
            final Hackathon finalMatched = matched;
            final String finalTitle = hackTitle;
            card.setOnClickListener(v -> {
                if (finalMatched != null) {
                    Intent intent = new Intent(DashboardActivity.this, HackathonDetailActivity.class);
                    intent.putExtra("hackathon_id", finalMatched.getId());
                    intent.putExtra("hackathon_title", finalTitle);
                    intent.putExtra("hackathon_description", finalMatched.getDescription());
                    startActivity(intent);
                }
            });

            registrationsContainer.addView(card);
        }
    }

    private void showEmptyState(String message) {
        registrationsContainer.removeAllViews();
        TextView tv = new TextView(this);
        tv.setText(message);
        tv.setTextColor(0xFFA5B8D5);
        tv.setTextSize(14f);
        tv.setPadding(8, 32, 8, 32);
        tv.setLineSpacing(6f, 1f);
        registrationsContainer.addView(tv);
    }
}

