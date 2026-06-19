package com.matrix.app;

import android.content.Intent;
import android.content.res.ColorStateList;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.matrix.app.models.Hackathon;
import com.matrix.app.models.Registration;
import com.matrix.app.chat.ConversationsActivity;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ApplicationsActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_applications);

        TextView tvSummary = findViewById(R.id.tv_application_summary);
        LinearLayout container = findViewById(R.id.applications_container);
        ProgressBar progressBar = findViewById(R.id.progress_bar);
        MatrixApi api = ApiClient.getClient(new SecurityManager(this)).create(MatrixApi.class);

        // Bottom nav
        BottomNavigationView bottomNav = findViewById(R.id.bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_applications);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_applications) return true;
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
            if (id == R.id.nav_chat) {
                startActivity(new Intent(this, ConversationsActivity.class));
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

        progressBar.setVisibility(View.VISIBLE);
        tvSummary.setText("Loading your registrations...");

        // Load all hackathons, then check registration for each
        api.listHackathons().enqueue(new Callback<List<Hackathon>>() {
            @Override
            public void onResponse(Call<List<Hackathon>> call, Response<List<Hackathon>> response) {
                if (response.body() == null || response.body().isEmpty()) {
                    progressBar.setVisibility(View.GONE);
                    tvSummary.setText("No hackathons available.");
                    return;
                }

                List<Hackathon> hackathons = response.body();
                AtomicInteger pending = new AtomicInteger(hackathons.size());
                List<Object[]> results = new ArrayList<>(); // [Registration, Hackathon]

                for (Hackathon h : hackathons) {
                    api.getMyRegistration(h.getId()).enqueue(new Callback<Registration>() {
                        @Override
                        public void onResponse(Call<Registration> call2, Response<Registration> r2) {
                            if (r2.isSuccessful() && r2.body() != null && r2.body().getId() != null) {
                                results.add(new Object[]{r2.body(), h});
                            }
                            if (pending.decrementAndGet() == 0) {
                                progressBar.setVisibility(View.GONE);
                                renderResults(results, tvSummary, container);
                            }
                        }
                        @Override
                        public void onFailure(Call<Registration> call2, Throwable t) {
                            if (pending.decrementAndGet() == 0) {
                                progressBar.setVisibility(View.GONE);
                                renderResults(results, tvSummary, container);
                            }
                        }
                    });
                }
            }
            @Override
            public void onFailure(Call<List<Hackathon>> call, Throwable t) {
                progressBar.setVisibility(View.GONE);
                tvSummary.setText("Failed to load. Check your connection.");
            }
        });
    }

    private void renderResults(List<Object[]> results, TextView tvSummary, LinearLayout container) {
        container.removeAllViews();

        if (results.isEmpty()) {
            tvSummary.setText("No applications yet");
            TextView tv = new TextView(this);
            tv.setText("You haven't applied to any hackathons yet.\nGo to Explore to discover events.");
            tv.setTextColor(0xFFA5B8D5);
            tv.setTextSize(14f);
            tv.setPadding(8, 48, 8, 8);
            tv.setLineSpacing(6f, 1f);
            container.addView(tv);
            return;
        }

        tvSummary.setText(results.size() + " application" + (results.size() == 1 ? "" : "s"));

        for (Object[] pair : results) {
            Registration reg = (Registration) pair[0];
            Hackathon h      = (Hackathon) pair[1];

            View card = getLayoutInflater().inflate(R.layout.item_hackathon_card, container, false);
            TextView tvTitle  = card.findViewById(R.id.card_title);
            TextView tvStatus = card.findViewById(R.id.card_status);
            TextView tvDetail = card.findViewById(R.id.card_detail);

            tvTitle.setText(h.getTitle());
            tvStatus.setText(reg.getApprovalStatus().toUpperCase());
            tvDetail.setText("Team pref: " + reg.getTeamPreference()
                    + (reg.getGithubUrl() != null && !reg.getGithubUrl().isEmpty() ? "  •  GitHub ✓" : ""));

            int textColor = 0xFF0EA5E9; // default cyan
            int bgColor = 0x1A0EA5E9;

            switch (reg.getApprovalStatus().toLowerCase()) {
                case "accepted":
                    textColor = 0xFF10B981; // green
                    bgColor = 0x1A10B981;
                    break;
                case "pending":
                    textColor = 0xFFF59E0B; // amber
                    bgColor = 0x1AF59E0B;
                    break;
                case "rejected":
                    textColor = 0xFFEF4444; // red
                    bgColor = 0x1AEF4444;
                    break;
            }

            tvStatus.setTextColor(textColor);
            tvStatus.setBackgroundTintList(ColorStateList.valueOf(bgColor));

            card.setOnClickListener(v -> {
                Intent intent = new Intent(this, HackathonDetailActivity.class);
                intent.putExtra("hackathon_id", h.getId());
                intent.putExtra("hackathon_title", h.getTitle());
                intent.putExtra("hackathon_description", h.getDescription());
                startActivity(intent);
            });

            container.addView(card);
        }
    }
}