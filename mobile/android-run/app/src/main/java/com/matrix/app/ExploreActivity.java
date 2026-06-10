package com.matrix.app;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.textfield.TextInputEditText;
import com.matrix.app.models.Hackathon;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ExploreActivity extends AppCompatActivity {

    private LinearLayout container;
    private List<Hackathon> allHackathons = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_explore);

        container = findViewById(R.id.hackathon_container);
        TextInputEditText etSearch = findViewById(R.id.et_search);

        MatrixApi api = ApiClient.getClient(new SecurityManager(this)).create(MatrixApi.class);

        // Bottom nav
        BottomNavigationView bottomNav = findViewById(R.id.bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_explore);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_explore) return true;
            if (id == R.id.nav_home) {
                startActivity(new Intent(this, DashboardActivity.class));
                overridePendingTransition(0, 0);
                finish();
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

        // Load hackathons
        api.listHackathons().enqueue(new Callback<List<Hackathon>>() {
            @Override
            public void onResponse(Call<List<Hackathon>> call, Response<List<Hackathon>> response) {
                if (response.body() == null || response.body().isEmpty()) {
                    showEmpty("No hackathons found.");
                    return;
                }
                allHackathons = response.body();
                renderList(allHackathons);
            }
            @Override
            public void onFailure(Call<List<Hackathon>> call, Throwable t) {
                showEmpty("Failed to load hackathons. Check your connection.");
            }
        });

        // Live search filter
        etSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int i, int i1, int i2) {}
            @Override public void onTextChanged(CharSequence s, int i, int i1, int i2) {
                String q = s.toString().toLowerCase().trim();
                if (q.isEmpty()) { renderList(allHackathons); return; }
                List<Hackathon> filtered = new ArrayList<>();
                for (Hackathon h : allHackathons) {
                    if (h.getTitle().toLowerCase().contains(q)
                            || (h.getDescription() != null && h.getDescription().toLowerCase().contains(q))) {
                        filtered.add(h);
                    }
                }
                renderList(filtered);
            }
            @Override public void afterTextChanged(Editable s) {}
        });
    }

    private void renderList(List<Hackathon> list) {
        container.removeAllViews();
        if (list.isEmpty()) { showEmpty("No matching hackathons."); return; }

        for (Hackathon h : list) {
            View card = getLayoutInflater().inflate(R.layout.item_hackathon_card, container, false);
            TextView tvTitle  = card.findViewById(R.id.card_title);
            TextView tvStatus = card.findViewById(R.id.card_status);
            TextView tvDetail = card.findViewById(R.id.card_detail);

            tvTitle.setText(h.getTitle());
            tvStatus.setText("OPEN · " + h.getRegistrationStatus().toUpperCase());
            tvStatus.setTextColor(0xFF0EA5E9);
            String desc = h.getDescription() != null && !h.getDescription().isEmpty()
                    ? h.getDescription()
                    : "Tap to view details and apply.";
            tvDetail.setText(desc.length() > 90 ? desc.substring(0, 87) + "…" : desc);

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

    private void showEmpty(String msg) {
        container.removeAllViews();
        TextView tv = new TextView(this);
        tv.setText(msg);
        tv.setTextColor(0xFFA5B8D5);
        tv.setTextSize(14f);
        tv.setPadding(8, 48, 8, 8);
        container.addView(tv);
    }
}