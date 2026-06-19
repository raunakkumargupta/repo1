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
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.matrix.app.models.Hackathon;
import com.matrix.app.chat.ConversationsActivity;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ExploreActivity extends AppCompatActivity {

    private LinearLayout container;
    private MatrixApi api;

    // Pagination & Search
    private int currentPage = 1;
    private final int pageSize = 10;
    private boolean hasMore = false;
    private String currentSearchQuery = "";
    private int queryCounter = 0;

    private LinearLayout layoutPagination;
    private MaterialButton btnPrevPage;
    private MaterialButton btnNextPage;
    private TextView tvPageNum;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_explore);

        container = findViewById(R.id.hackathon_container);
        TextInputEditText etSearch = findViewById(R.id.et_search);

        layoutPagination = findViewById(R.id.layout_hackathon_pagination);
        btnPrevPage = findViewById(R.id.btn_hackathon_prev);
        btnNextPage = findViewById(R.id.btn_hackathon_next);
        tvPageNum = findViewById(R.id.tv_hackathon_page_num);

        api = ApiClient.getClient(new SecurityManager(this)).create(MatrixApi.class);

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
            if (id == R.id.nav_chat) {
                startActivity(new Intent(this, ConversationsActivity.class));
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

        // Pagination buttons
        btnPrevPage.setOnClickListener(v -> {
            if (currentPage > 1) {
                currentPage--;
                loadHackathons();
            }
        });

        btnNextPage.setOnClickListener(v -> {
            if (hasMore) {
                currentPage++;
                loadHackathons();
            }
        });

        // Debounced universal search
        etSearch.addTextChangedListener(new TextWatcher() {
            private Runnable searchRunnable;
            private final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());

            @Override public void beforeTextChanged(CharSequence s, int i, int i1, int i2) {}
            @Override public void onTextChanged(CharSequence s, int i, int i1, int i2) {
                if (searchRunnable != null) {
                    handler.removeCallbacks(searchRunnable);
                }
                searchRunnable = () -> {
                    currentSearchQuery = s.toString().trim();
                    currentPage = 1;
                    loadHackathons();
                };
                handler.postDelayed(searchRunnable, 300); // 300ms delay
            }
            @Override public void afterTextChanged(Editable s) {}
        });

        loadHackathons();
    }

    private void loadHackathons() {
        final int thisQueryId = ++queryCounter;
        int offset = (currentPage - 1) * pageSize;
        String searchVal = currentSearchQuery.isEmpty() ? null : currentSearchQuery;

        api.searchHackathons(pageSize, offset, searchVal).enqueue(new Callback<List<Hackathon>>() {
            @Override
            public void onResponse(Call<List<Hackathon>> call, Response<List<Hackathon>> response) {
                if (thisQueryId != queryCounter) return; // ignore stale query responses

                List<Hackathon> list = response.body();
                if (list == null || list.isEmpty()) {
                    showEmpty(currentSearchQuery.isEmpty() ? "No hackathons found." : "No matching hackathons.");
                    hasMore = false;
                    layoutPagination.setVisibility(View.GONE);
                    return;
                }

                hasMore = list.size() == pageSize;
                renderList(list);

                if (currentPage > 1 || hasMore) {
                    layoutPagination.setVisibility(View.VISIBLE);
                    tvPageNum.setText("Page " + currentPage);
                    btnPrevPage.setEnabled(currentPage > 1);
                    btnNextPage.setEnabled(hasMore);
                } else {
                    layoutPagination.setVisibility(View.GONE);
                }
            }

            @Override
            public void onFailure(Call<List<Hackathon>> call, Throwable t) {
                if (thisQueryId != queryCounter) return;
                showEmpty("Failed to load hackathons. Check your connection.");
                layoutPagination.setVisibility(View.GONE);
            }
        });
    }

    private void renderList(List<Hackathon> list) {
        container.removeAllViews();
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