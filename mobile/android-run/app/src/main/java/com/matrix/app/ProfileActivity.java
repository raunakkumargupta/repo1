package com.matrix.app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.matrix.app.models.ApiUser;
import com.matrix.app.models.HackerProfile;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ProfileActivity extends AppCompatActivity {

    private MatrixApi api;
    private TextView tvAvatarBig, tvName, tvEmail, tvRole, tvBio, tvGithub, tvLinkedin, tvResume, tvSkills, tvCity, tvEdu;
    private TextView tvGender, tvTshirt, tvPhone, tvEmergencyName, tvEmergencyNumber;
    private TextView tvDietaryPreference, tvAllergies;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_profile);

        tvAvatarBig = findViewById(R.id.tv_avatar_big);
        tvName      = findViewById(R.id.tv_profile_name);
        tvEmail     = findViewById(R.id.tv_profile_email);
        tvRole      = findViewById(R.id.tv_profile_role);
        tvBio       = findViewById(R.id.tv_profile_bio);
        tvGithub    = findViewById(R.id.tv_profile_github);
        tvLinkedin  = findViewById(R.id.tv_profile_linkedin);
        tvResume    = findViewById(R.id.tv_profile_resume);
        tvSkills    = findViewById(R.id.tv_profile_skills);
        tvCity      = findViewById(R.id.tv_profile_city);
        tvEdu       = findViewById(R.id.tv_profile_education);

        tvGender = findViewById(R.id.tv_profile_gender);
        tvTshirt = findViewById(R.id.tv_profile_tshirt);
        tvPhone = findViewById(R.id.tv_profile_phone);
        tvEmergencyName = findViewById(R.id.tv_profile_emergency_name);
        tvEmergencyNumber = findViewById(R.id.tv_profile_emergency_number);
        tvDietaryPreference = findViewById(R.id.tv_profile_dietary_preference);
        tvAllergies = findViewById(R.id.tv_profile_allergies);

        api = ApiClient.getClient(new SecurityManager(this)).create(MatrixApi.class);

        findViewById(R.id.btn_edit_profile).setOnClickListener(v -> {
            startActivity(new Intent(this, EditProfileActivity.class));
        });

        // Bottom nav
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
        loadProfileData();
    }

    private void loadProfileData() {
        // Load user identity
        api.getMe().enqueue(new Callback<ApiUser>() {
            @Override
            public void onResponse(Call<ApiUser> call, Response<ApiUser> response) {
                if (response.isSuccessful() && response.body() != null) {
                    ApiUser user = response.body();
                    tvName.setText(user.getName());
                    tvEmail.setText(user.getEmail());
                    tvRole.setText(user.getRole());
                    // Avatar initials
                    String initial = user.getName().length() > 0
                            ? String.valueOf(user.getName().charAt(0)).toUpperCase() : "?";
                    tvAvatarBig.setText(initial);
                }
            }
            @Override
            public void onFailure(Call<ApiUser> call, Throwable t) {}
        });

        // Load hacker profile
        api.getMyProfile().enqueue(new Callback<HackerProfile>() {
            @Override
            public void onResponse(Call<HackerProfile> call, Response<HackerProfile> response) {
                if (response.isSuccessful() && response.body() != null) {
                    HackerProfile p = response.body();

                    tvBio.setText(isBlank(p.getBio()) ? "No bio added yet." : p.getBio());

                    if (!isBlank(p.getGithubUrl())) {
                        tvGithub.setText("🔗 GitHub: " + p.getGithubUrl());
                        tvGithub.setTextColor(getResources().getColor(R.color.primaryAccent));
                        tvGithub.setOnClickListener(v -> openWebLink(p.getGithubUrl()));
                    } else {
                        tvGithub.setText("GitHub: —");
                        tvGithub.setTextColor(getResources().getColor(R.color.textSecondary));
                        tvGithub.setOnClickListener(null);
                    }

                    if (!isBlank(p.getLinkedinUrl())) {
                        tvLinkedin.setText("🔗 LinkedIn: " + p.getLinkedinUrl());
                        tvLinkedin.setTextColor(getResources().getColor(R.color.primaryAccent));
                        tvLinkedin.setOnClickListener(v -> openWebLink(p.getLinkedinUrl()));
                    } else {
                        tvLinkedin.setText("LinkedIn: —");
                        tvLinkedin.setTextColor(getResources().getColor(R.color.textSecondary));
                        tvLinkedin.setOnClickListener(null);
                    }

                    if (!isBlank(p.getResumeUrl())) {
                        tvResume.setText("📄 Resume: " + p.getResumeUrl());
                        tvResume.setTextColor(getResources().getColor(R.color.primaryAccent));
                        tvResume.setOnClickListener(v -> openWebLink(p.getResumeUrl()));
                    } else {
                        tvResume.setText("Resume: —");
                        tvResume.setTextColor(getResources().getColor(R.color.textSecondary));
                        tvResume.setOnClickListener(null);
                    }
                    tvSkills.setText(isBlank(p.getSkills())
                            ? "Skills: —" : p.getSkills());

                    tvCity.setText(isBlank(p.getCity()) ? "" : "📍 " + p.getCity());

                    tvGender.setText(isBlank(p.getGender()) ? "Gender: —" : "Gender: " + p.getGender());
                    tvTshirt.setText(isBlank(p.getTshirtSize()) ? "T-Shirt Size: —" : "T-Shirt Size: " + p.getTshirtSize());
                    tvPhone.setText(isBlank(p.getPhoneNumber()) ? "Phone Number: —" : "Phone Number: " + p.getPhoneNumber());
                    tvEmergencyName.setText(isBlank(p.getEmergencyContactName()) ? "Emergency Contact: —" : "Emergency Contact: " + p.getEmergencyContactName());
                    tvEmergencyNumber.setText(isBlank(p.getEmergencyContactNumber()) ? "Emergency Phone: —" : "Emergency Phone: " + p.getEmergencyContactNumber());
                    tvDietaryPreference.setText(isBlank(p.getDietaryPreference()) ? "Dietary Preference: —" : "Dietary Preference: " + p.getDietaryPreference());
                    tvAllergies.setText(isBlank(p.getAllergies()) ? "Allergies: —" : "Allergies: " + p.getAllergies());

                    StringBuilder edu = new StringBuilder();
                    if (!p.isHasFormalEducation()) {
                        edu.append("No formal education");
                    } else if (!isBlank(p.getInstitution())) {
                        edu.append(p.getInstitution());
                        if (!isBlank(p.getFieldOfStudy())) edu.append("\n").append(p.getFieldOfStudy());
                        if (!isBlank(p.getDegreeType())) edu.append(" · ").append(p.getDegreeType());
                        if (!isBlank(p.getGradMonth()) || p.getGradYear() > 0) {
                            edu.append("\nGraduation: ");
                            if (!isBlank(p.getGradMonth())) edu.append(p.getGradMonth()).append(" ");
                            if (p.getGradYear() > 0) edu.append(p.getGradYear());
                        }
                    } else {
                        edu.append("No education info added yet.");
                    }
                    tvEdu.setText(edu.toString());
                } else {
                    tvBio.setText("Profile not set up yet.\nVisit the web dashboard to complete your hacker profile.");
                }
            }
            @Override
            public void onFailure(Call<HackerProfile> call, Throwable t) {
                tvBio.setText("Unable to load profile.");
            }
        });
    }

    private void openWebLink(String url) {
        if (isBlank(url)) return;
        try {
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "https://" + url;
            }
            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url));
            startActivity(intent);
        } catch (Exception e) {
            android.widget.Toast.makeText(this, "Cannot open link: " + url, android.widget.Toast.LENGTH_SHORT).show();
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}