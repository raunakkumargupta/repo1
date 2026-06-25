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

        // AI Chatbot FAB
        findViewById(R.id.fab_ai_chat).setOnClickListener(v ->
                startActivity(new Intent(this, AIChatActivity.class)));

        progressBar.setVisibility(View.VISIBLE);
        tvSummary.setText("Loading your registrations...");

        // ── Two parallel calls instead of N+1 ──────────────────────────────────
        final List<Registration>[] regsHolder = new List[]{null};
        final List<Hackathon>[]    hacksHolder = new List[]{null};
        final int[] done = {0};

        Runnable merge = () -> {
            done[0]++;
            if (done[0] < 2) return; // wait for both
            progressBar.setVisibility(View.GONE);

            List<Registration> myRegs = regsHolder[0] != null ? regsHolder[0] : new ArrayList<>();
            List<Hackathon> hackathons = hacksHolder[0] != null ? hacksHolder[0] : new ArrayList<>();

            // Pair each registration with its hackathon
            List<Object[]> results = new ArrayList<>();
            for (Registration reg : myRegs) {
                if (reg.getId() == null) continue;
                Hackathon matched = null;
                for (Hackathon h : hackathons) {
                    if (h.getId().equals(reg.getHackathonId())) { matched = h; break; }
                }
                results.add(new Object[]{reg, matched != null ? matched : new Hackathon()});
            }
            renderResults(results, tvSummary, container);
        };

        api.getMyAllRegistrations().enqueue(new Callback<List<Registration>>() {
            @Override
            public void onResponse(Call<List<Registration>> call, Response<List<Registration>> r) {
                regsHolder[0] = (r.isSuccessful() && r.body() != null) ? r.body() : new ArrayList<>();
                runOnUiThread(merge);
            }
            @Override
            public void onFailure(Call<List<Registration>> call, Throwable t) {
                regsHolder[0] = new ArrayList<>();
                runOnUiThread(merge);
            }
        });

        api.listHackathons().enqueue(new Callback<List<Hackathon>>() {
            @Override
            public void onResponse(Call<List<Hackathon>> call, Response<List<Hackathon>> r) {
                hacksHolder[0] = (r.isSuccessful() && r.body() != null) ? r.body() : new ArrayList<>();
                runOnUiThread(merge);
            }
            @Override
            public void onFailure(Call<List<Hackathon>> call, Throwable t) {
                hacksHolder[0] = new ArrayList<>();
                runOnUiThread(merge);
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