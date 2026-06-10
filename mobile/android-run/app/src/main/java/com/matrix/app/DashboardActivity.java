package com.matrix.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.card.MaterialCardView;
import com.matrix.app.models.ApiUser;
import com.matrix.app.models.Hackathon;
import com.matrix.app.models.Registration;

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

        loadDashboard();
    }

    private void loadDashboard() {
        // Load user info
        api.getMe().enqueue(new Callback<ApiUser>() {
            @Override
            public void onResponse(Call<ApiUser> call, Response<ApiUser> response) {
                if (response.isSuccessful() && response.body() != null) {
                    ApiUser user = response.body();
                    String firstName = user.getName().split(" ")[0];
                    tvWelcomeName.setText("Hey, " + firstName + " 👋");
                    tvWelcomeSubtitle.setText(user.getEmail());
                    // Avatar initials
                    String initials = user.getName().length() >= 2
                            ? String.valueOf(user.getName().charAt(0)).toUpperCase()
                            : "?";
                    tvAvatarInitials.setText(initials);
                }
            }
            @Override
            public void onFailure(Call<ApiUser> call, Throwable t) {}
        });

        // Load hackathons → then load registrations for each
        api.listHackathons().enqueue(new Callback<List<Hackathon>>() {
            @Override
            public void onResponse(Call<List<Hackathon>> call, Response<List<Hackathon>> response) {
                if (!response.isSuccessful() || response.body() == null || response.body().isEmpty()) {
                    showEmptyState("No hackathons available yet.");
                    tvApplicationsCount.setText("0");
                    tvTeamCount.setText("0");
                    tvMentorCount.setText("0");
                    return;
                }
                List<Hackathon> hackathons = response.body();
                final int[] pending = {hackathons.size()};
                final List<Registration> myRegs = new ArrayList<>();

                for (Hackathon h : hackathons) {
                    api.getMyRegistration(h.getId()).enqueue(new Callback<Registration>() {
                        @Override
                        public void onResponse(Call<Registration> call2, Response<Registration> r2) {
                            if (r2.isSuccessful() && r2.body() != null && r2.body().getId() != null) {
                                myRegs.add(r2.body());
                            }
                            pending[0]--;
                            if (pending[0] == 0) renderRegistrations(myRegs, hackathons);
                        }
                        @Override
                        public void onFailure(Call<Registration> call2, Throwable t) {
                            pending[0]--;
                            if (pending[0] == 0) renderRegistrations(myRegs, hackathons);
                        }
                    });
                }
            }
            @Override
            public void onFailure(Call<List<Hackathon>> call, Throwable t) {
                showEmptyState("Unable to load hackathons. Check your connection.");
            }
        });
    }

    private void renderRegistrations(List<Registration> registrations, List<Hackathon> hackathons) {
        long accepted = 0, pending = 0;
        for (Registration r : registrations) {
            if ("accepted".equalsIgnoreCase(r.getApprovalStatus())) accepted++;
            else if ("pending".equalsIgnoreCase(r.getApprovalStatus())) pending++;
        }

        tvApplicationsCount.setText(String.valueOf(registrations.size()));
        tvTeamCount.setText(String.valueOf(accepted));
        tvMentorCount.setText(String.valueOf(pending));

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
