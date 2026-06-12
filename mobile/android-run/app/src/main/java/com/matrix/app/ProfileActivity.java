package com.matrix.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.snackbar.Snackbar;
import com.matrix.app.models.ApiUser;
import com.matrix.app.models.HackerProfile;
import com.matrix.app.notifications.NotificationPollingService;
import com.matrix.app.notifications.NotificationScheduler;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ProfileActivity extends AppCompatActivity {

    private MatrixApi api;
    private SecurityManager securityManager;
    private View rootView;

    private TextView tvAvatarBig, tvName, tvEmail, tvRole, tvCity;
    private TextView tvBio, tvSkills, tvEdu;
    private TextView tvGithub, tvLinkedin, tvResume;
    private LinearLayout rowGithub, rowLinkedin, rowResume;
    private TextView tvGender, tvTshirt, tvPhone;
    private TextView tvEmergencyName, tvEmergencyNumber;
    private TextView tvDietary, tvAllergies;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);

        rootView = findViewById(android.R.id.content);
        securityManager = new SecurityManager(this);
        api = ApiClient.getClient(securityManager).create(MatrixApi.class);

        tvAvatarBig = findViewById(R.id.tv_avatar_big);
        tvName      = findViewById(R.id.tv_profile_name);
        tvEmail     = findViewById(R.id.tv_profile_email);
        tvRole      = findViewById(R.id.tv_profile_role);
        tvCity      = findViewById(R.id.tv_profile_city);

        tvBio    = findViewById(R.id.tv_profile_bio);
        tvSkills = findViewById(R.id.tv_profile_skills);
        tvEdu    = findViewById(R.id.tv_profile_education);

        rowGithub   = findViewById(R.id.row_github);
        rowLinkedin = findViewById(R.id.row_linkedin);
        rowResume   = findViewById(R.id.row_resume);
        tvGithub    = findViewById(R.id.tv_profile_github);
        tvLinkedin  = findViewById(R.id.tv_profile_linkedin);
        tvResume    = findViewById(R.id.tv_profile_resume);

        tvGender          = findViewById(R.id.tv_profile_gender);
        tvTshirt          = findViewById(R.id.tv_profile_tshirt);
        tvPhone           = findViewById(R.id.tv_profile_phone);
        tvEmergencyName   = findViewById(R.id.tv_profile_emergency_name);
        tvEmergencyNumber = findViewById(R.id.tv_profile_emergency_number);
        tvDietary         = findViewById(R.id.tv_profile_dietary_preference);
        tvAllergies       = findViewById(R.id.tv_profile_allergies);

        findViewById(R.id.btn_edit_profile).setOnClickListener(v ->
                startActivity(new Intent(this, EditProfileActivity.class)));

        ((MaterialButton) findViewById(R.id.btn_sign_out)).setOnClickListener(v ->
                confirmSignOut());

        BottomNavigationView bottomNav = findViewById(R.id.bottom_nav);
        bottomNav.setSelectedItemId(R.id.nav_profile);
        bottomNav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_profile) return true;
            if (id == R.id.nav_home) {
                startActivity(new Intent(this, DashboardActivity.class));
                overridePendingTransition(0, 0);
                finish();
                return true;
            }
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
            return false;
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadProfile();
    }

    private void loadProfile() {
        api.getMe().enqueue(new Callback<ApiUser>() {
            @Override
            public void onResponse(Call<ApiUser> call, Response<ApiUser> response) {
                if (response.isSuccessful() && response.body() != null) {
                    ApiUser user = response.body();
                    tvName.setText(user.getName());
                    tvEmail.setText(user.getEmail());
                    tvRole.setText(user.getRole());
                    String initial = user.getName() != null && !user.getName().isEmpty()
                            ? String.valueOf(user.getName().charAt(0)).toUpperCase() : "?";
                    tvAvatarBig.setText(initial);
                }
            }
            @Override
            public void onFailure(Call<ApiUser> call, Throwable t) {}
        });

        api.getMyProfile().enqueue(new Callback<HackerProfile>() {
            @Override
            public void onResponse(Call<HackerProfile> call, Response<HackerProfile> response) {
                if (response.isSuccessful() && response.body() != null) {
                    bindProfile(response.body());
                } else {
                    tvBio.setText("Profile not set up yet. Tap Edit Profile to complete it.");
                }
            }
            @Override
            public void onFailure(Call<HackerProfile> call, Throwable t) {
                Snackbar.make(rootView, "Failed to load profile", Snackbar.LENGTH_SHORT).show();
            }
        });
    }

    private void bindProfile(HackerProfile p) {
        tvCity.setText(blank(p.getCity()) ? "" : "📍 " + p.getCity());
        tvBio.setText(blank(p.getBio()) ? "No bio added yet." : p.getBio());
        tvSkills.setText(blank(p.getSkills()) ? "No skills added yet." : p.getSkills());

        // Links — clickable if set
        bindLink(rowGithub, tvGithub, p.getGithubUrl());
        bindLink(rowLinkedin, tvLinkedin, p.getLinkedinUrl());
        bindLink(rowResume, tvResume, p.getResumeUrl());

        // Simple fields
        tvGender.setText(blank(p.getGender()) ? "—" : p.getGender());
        tvTshirt.setText(blank(p.getTshirtSize()) ? "—" : p.getTshirtSize());
        tvPhone.setText(blank(p.getPhoneNumber()) ? "—" : p.getPhoneNumber());
        tvEmergencyName.setText(blank(p.getEmergencyContactName()) ? "—" : p.getEmergencyContactName());
        tvEmergencyNumber.setText(blank(p.getEmergencyContactNumber()) ? "—" : p.getEmergencyContactNumber());
        tvDietary.setText(blank(p.getDietaryPreference()) ? "—" : p.getDietaryPreference());
        tvAllergies.setText(blank(p.getAllergies()) ? "—" : p.getAllergies());

        // Education
        StringBuilder edu = new StringBuilder();
        if (!p.isHasFormalEducation()) {
            edu.append("No formal education");
        } else if (!blank(p.getInstitution())) {
            edu.append(p.getInstitution());
            if (!blank(p.getFieldOfStudy())) edu.append("\n").append(p.getFieldOfStudy());
            if (!blank(p.getDegreeType())) edu.append(" · ").append(p.getDegreeType());
            if (!blank(p.getGradMonth()) || p.getGradYear() > 0) {
                edu.append("\nGrad: ");
                if (!blank(p.getGradMonth())) edu.append(p.getGradMonth()).append(" ");
                if (p.getGradYear() > 0) edu.append(p.getGradYear());
            }
        } else {
            edu.append("No education info added yet.");
        }
        tvEdu.setText(edu.toString());
    }

    private void bindLink(LinearLayout row, TextView valueView, String url) {
        if (!blank(url)) {
            valueView.setText(shortenUrl(url));
            valueView.setTextColor(0xFF0EA5E9);
            row.setOnClickListener(v -> openUrl(url));
            row.setClickable(true);
        } else {
            valueView.setText("—");
            valueView.setTextColor(0xFFA5B8D5);
            row.setOnClickListener(null);
            row.setClickable(false);
        }
    }

    // ─── Sign out ─────────────────────────────────────────────────────────────

    private void confirmSignOut() {
        new AlertDialog.Builder(this)
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out?")
                .setPositiveButton("Sign Out", (dialog, which) -> performSignOut())
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void performSignOut() {
        securityManager.clearToken();
        ApiClient.reset();
        NotificationPollingService.stop(this);
        NotificationScheduler.cancel(this);
        Intent intent = new Intent(this, LoginActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void openUrl(String url) {
        if (blank(url)) return;
        try {
            if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
            startActivity(new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url)));
        } catch (Exception e) {
            Snackbar.make(rootView, "Cannot open link", Snackbar.LENGTH_SHORT).show();
        }
    }

    private String shortenUrl(String url) {
        if (blank(url)) return "—";
        url = url.replaceFirst("https?://", "").replaceFirst("www\\.", "");
        return url.length() > 28 ? url.substring(0, 28) + "…" : url;
    }

    private boolean blank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
