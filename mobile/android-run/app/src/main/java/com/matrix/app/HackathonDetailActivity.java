package com.matrix.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.matrix.app.models.ApplyHackathonRequest;
import com.matrix.app.models.Hackathon;
import com.matrix.app.models.HackerProfile;
import com.matrix.app.models.Registration;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class HackathonDetailActivity extends AppCompatActivity {

    private MatrixApi api;
    private String hackathonId;
    private String hackathonTitle;
    private String hackathonDesc;

    private View layoutApplyForm;
    private View layoutApproved;
    private View layoutInputs;
    private TextView tvStatus, tvSummary, tvIncompleteWarning;
    private TextInputEditText etGithub, etLinkedin, etSkills, etResume;
    private AutoCompleteTextView spinnerTeamPreference;
    private MaterialButton btnApply;

    // New detail views
    private TextView tvStartDate, tvEndDate, tvFee, tvTeamSize, tvTracks;
    private TextView tvProblemStatement, tvPrizes, tvSchedule, tvSponsors;
    private View cardProblem, cardPrizes, cardSchedule, cardSponsors;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_hackathon_detail);

        hackathonId    = getIntent().getStringExtra("hackathon_id");
        hackathonTitle = getIntent().getStringExtra("hackathon_title");
        hackathonDesc  = getIntent().getStringExtra("hackathon_description");

        api = ApiClient.getClient(new SecurityManager(this)).create(MatrixApi.class);

        // Views
        TextView tvTitle = findViewById(R.id.tv_hackathon_title);
        TextView tvDesc  = findViewById(R.id.tv_hackathon_description);
        tvStatus         = findViewById(R.id.tv_registration_status);
        tvSummary        = findViewById(R.id.tv_action_summary);
        tvIncompleteWarning = findViewById(R.id.tv_incomplete_warning);
        layoutApplyForm  = findViewById(R.id.layout_apply_form);
        layoutApproved   = findViewById(R.id.layout_approved_actions);
        layoutInputs     = findViewById(R.id.layout_inputs);
        etGithub         = findViewById(R.id.et_github);
        etLinkedin       = findViewById(R.id.et_linkedin);
        etResume         = findViewById(R.id.et_resume);
        etSkills         = findViewById(R.id.et_skills);
        spinnerTeamPreference = findViewById(R.id.spinner_team_preference);
        btnApply         = findViewById(R.id.btn_apply_hackathon);

        setupDropdown(spinnerTeamPreference, new String[]{"Solo", "Looking for Team", "Has Team"});

        // New detail views
        tvStartDate = findViewById(R.id.tv_start_date);
        tvEndDate = findViewById(R.id.tv_end_date);
        tvFee = findViewById(R.id.tv_fee);
        tvTeamSize = findViewById(R.id.tv_team_size);
        tvTracks = findViewById(R.id.tv_tracks);
        tvProblemStatement = findViewById(R.id.tv_problem_statement);
        tvPrizes = findViewById(R.id.tv_prizes);
        tvSchedule = findViewById(R.id.tv_schedule);
        tvSponsors = findViewById(R.id.tv_sponsors);
        cardProblem = findViewById(R.id.card_problem);
        cardPrizes = findViewById(R.id.card_prizes);
        cardSchedule = findViewById(R.id.card_schedule);
        cardSponsors = findViewById(R.id.card_sponsors);

        // Back button
        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        tvTitle.setText(hackathonTitle != null ? hackathonTitle : "Hackathon");
        tvDesc.setText(hackathonDesc != null && !hackathonDesc.isEmpty()
                ? hackathonDesc
                : "Explore challenges, build projects, connect with teammates.");

        // Team Hub
        MaterialButton btnTeamHub = findViewById(R.id.btn_open_team_hub);
        btnTeamHub.setOnClickListener(v -> {
            Intent intent = new Intent(this, FindTeamActivity.class);
            intent.putExtra("hackathon_id", hackathonId);
            intent.putExtra("hackathon_title", hackathonTitle);
            startActivity(intent);
        });

        // Mentor support
        MaterialButton btnMentor = findViewById(R.id.btn_mentor_support);
        btnMentor.setOnClickListener(v -> {
            Intent intent = new Intent(this, MentorSupportActivity.class);
            intent.putExtra("hackathon_id", hackathonId);
            startActivity(intent);
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadHackathonDetails();
        loadRegistration();
    }

    private void loadHackathonDetails() {
        // Fetch full hackathon data from API
        api.listHackathons().enqueue(new Callback<java.util.List<Hackathon>>() {
            @Override
            public void onResponse(Call<java.util.List<Hackathon>> call, Response<java.util.List<Hackathon>> response) {
                if (!response.isSuccessful() || response.body() == null) return;
                for (Hackathon h : response.body()) {
                    if (h.getId().equals(hackathonId)) {
                        populateHackathonDetails(h);
                        break;
                    }
                }
            }
            @Override
            public void onFailure(Call<java.util.List<Hackathon>> call, Throwable t) {}
        });
    }

    private void populateHackathonDetails(Hackathon h) {
        // Dates
        tvStartDate.setText(formatDate(h.getStartDate()));
        tvEndDate.setText(formatDate(h.getEndDate()));

        // Fee
        tvFee.setText(isBlank(h.getRegistrationFee()) ? "Free" : h.getRegistrationFee());

        // Team size
        if (h.getMinTeamSize() > 0 && h.getMaxTeamSize() > 0) {
            tvTeamSize.setText(h.getMinTeamSize() + " - " + h.getMaxTeamSize() + " members");
        } else {
            tvTeamSize.setText("Flexible");
        }

        // Tracks
        String tracks = h.getTracks();
        if (!isBlank(tracks)) {
            tracks = tracks.replace("[", "").replace("]", "").replace("\"", "");
            tvTracks.setText(tracks);
        } else {
            tvTracks.setText("—");
        }

        // Problem Statement
        if (!isBlank(h.getProblemStatement())) {
            cardProblem.setVisibility(View.VISIBLE);
            tvProblemStatement.setText(h.getProblemStatement());
        }

        // Prizes
        if (!isBlank(h.getPrizes())) {
            cardPrizes.setVisibility(View.VISIBLE);
            tvPrizes.setText(h.getPrizes());
        }

        // Schedule
        if (!isBlank(h.getSchedule())) {
            cardSchedule.setVisibility(View.VISIBLE);
            tvSchedule.setText(h.getSchedule());
        }

        // Sponsors
        if (!isBlank(h.getSponsors())) {
            cardSponsors.setVisibility(View.VISIBLE);
            tvSponsors.setText(h.getSponsors());
        }
    }

    private String formatDate(String isoDate) {
        if (isBlank(isoDate)) return "—";
        try {
            // Parse ISO 8601 and format to readable
            String[] parts = isoDate.split("T")[0].split("-");
            String[] months = {"Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
            int monthIdx = Integer.parseInt(parts[1]) - 1;
            return months[monthIdx] + " " + Integer.parseInt(parts[2]) + ", " + parts[0];
        } catch (Exception e) {
            return isoDate.split("T")[0];
        }
    }

    private void loadRegistration() {
        api.getMyRegistration(hackathonId).enqueue(new Callback<Registration>() {
            @Override
            public void onResponse(Call<Registration> call, Response<Registration> response) {
                Registration reg = response.body();
                if (reg != null && reg.getId() != null) {
                    if (reg.getGithubUrl() != null)   etGithub.setText(reg.getGithubUrl());
                    if (reg.getLinkedinUrl() != null)  etLinkedin.setText(reg.getLinkedinUrl());
                    if (reg.getResumeUrl() != null)    etResume.setText(reg.getResumeUrl());
                    if (reg.getSkills() != null)       etSkills.setText(parseSkillsJson(reg.getSkills()));
                    if (reg.getTeamPreference() != null) spinnerTeamPreference.setText(reg.getTeamPreference(), false);

                    String status = reg.getApprovalStatus();
                    switch (status.toLowerCase()) {
                        case "accepted":
                            tvStatus.setText("✅ Accepted");
                            tvStatus.setTextColor(0xFF10B981);
                            tvSummary.setText("You're in! Access team features and mentor support below.");
                            layoutApplyForm.setVisibility(View.GONE);
                            layoutApproved.setVisibility(View.VISIBLE);
                            break;
                        case "pending":
                            tvStatus.setText("⏳ Pending Review");
                            tvStatus.setTextColor(0xFFF59E0B);
                            tvSummary.setText("Your application is under review. You can update it below.");
                            layoutApplyForm.setVisibility(View.VISIBLE);
                            layoutApproved.setVisibility(View.GONE);
                            btnApply.setText("Update Application");
                            break;
                        case "rejected":
                            tvStatus.setText("❌ Rejected");
                            tvStatus.setTextColor(0xFFEF4444);
                            tvSummary.setText("Your application was not accepted. You may resubmit.");
                            layoutApplyForm.setVisibility(View.VISIBLE);
                            layoutApproved.setVisibility(View.GONE);
                            btnApply.setText("Resubmit");
                            break;
                        default:
                            showNotApplied();
                    }
                } else {
                    showNotApplied();
                }
            }

            @Override
            public void onFailure(Call<Registration> call, Throwable t) {
                showNotApplied();
            }
        });
    }

    private void showNotApplied() {
        tvStatus.setText("Not Applied");
        tvStatus.setTextColor(0xFFA5B8D5);
        tvSummary.setText("Checking profile completeness...");
        layoutApplyForm.setVisibility(View.VISIBLE);
        layoutInputs.setVisibility(View.GONE);
        tvIncompleteWarning.setVisibility(View.GONE);
        btnApply.setText("Loading...");
        btnApply.setEnabled(false);
        layoutApproved.setVisibility(View.GONE);

        api.getMyProfile().enqueue(new Callback<HackerProfile>() {
            @Override
            public void onResponse(Call<HackerProfile> call, Response<HackerProfile> response) {
                if (response.isSuccessful() && response.body() != null) {
                    HackerProfile p = response.body();
                    boolean isComplete = !isBlank(p.getBio()) && !isBlank(p.getGithubUrl()) && !isBlank(p.getResumeUrl()) && !isBlank(p.getSkills());
                    if (isComplete) {
                        tvSummary.setText("Profile complete. Review details below to apply.");
                        layoutInputs.setVisibility(View.VISIBLE);
                        tvIncompleteWarning.setVisibility(View.GONE);
                        etGithub.setText(p.getGithubUrl());
                        if (p.getLinkedinUrl() != null) etLinkedin.setText(p.getLinkedinUrl());
                        if (p.getResumeUrl() != null) etResume.setText(p.getResumeUrl());
                        etSkills.setText(p.getSkills());
                        if (p.getDefaultTeamPreference() != null) {
                            spinnerTeamPreference.setText(p.getDefaultTeamPreference(), false);
                        } else {
                            spinnerTeamPreference.setText("Solo", false);
                        }
                        btnApply.setText("Apply Now");
                        btnApply.setEnabled(true);
                        btnApply.setOnClickListener(v -> submitApplication());
                    } else {
                        tvSummary.setText("Your profile is incomplete.");
                        layoutInputs.setVisibility(View.GONE);
                        tvIncompleteWarning.setVisibility(View.VISIBLE);
                        btnApply.setText("Complete Profile");
                        btnApply.setEnabled(true);
                        btnApply.setOnClickListener(v -> startActivity(new Intent(HackathonDetailActivity.this, EditProfileActivity.class)));
                    }
                } else {
                    tvSummary.setText("Profile not found.");
                    layoutInputs.setVisibility(View.GONE);
                    tvIncompleteWarning.setVisibility(View.VISIBLE);
                    tvIncompleteWarning.setText("Please create your profile first.");
                    btnApply.setText("Create Profile");
                    btnApply.setEnabled(true);
                    btnApply.setOnClickListener(v -> startActivity(new Intent(HackathonDetailActivity.this, EditProfileActivity.class)));
                }
            }

            @Override
            public void onFailure(Call<HackerProfile> call, Throwable t) {
                tvSummary.setText("Failed to load profile.");
            }
        });
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private void submitApplication() {
        String github   = etGithub.getText().toString().trim();
        String linkedin = etLinkedin.getText().toString().trim();
        String resume   = etResume.getText().toString().trim();
        String skillsRaw = etSkills.getText().toString().trim();
        String teamPref = spinnerTeamPreference.getText().toString().trim();

        if (github.isEmpty() || linkedin.isEmpty() || resume.isEmpty() || skillsRaw.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
            return;
        }

        if (teamPref.isEmpty()) {
            teamPref = "Solo";
        }

        List<String> skills = Arrays.stream(skillsRaw.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());

        btnApply.setText("Submitting…");
        btnApply.setEnabled(false);

        api.applyHackathon(hackathonId,
                new ApplyHackathonRequest(github, linkedin, skills, teamPref, resume)
        ).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                btnApply.setEnabled(true);
                if (response.isSuccessful()) {
                    Toast.makeText(HackathonDetailActivity.this, "Application submitted!", Toast.LENGTH_SHORT).show();
                    recreate();
                } else {
                    btnApply.setText("Apply Now");
                    String errMsg = "Submission failed";
                    try {
                        if (response.errorBody() != null) {
                            errMsg += ": " + response.errorBody().string();
                        }
                    } catch (Exception ignored) {}
                    Toast.makeText(HackathonDetailActivity.this, errMsg, Toast.LENGTH_LONG).show();
                    loadRegistration();
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                btnApply.setEnabled(true);
                btnApply.setText("Apply Now");
                Toast.makeText(HackathonDetailActivity.this,
                        "Network error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setupDropdown(AutoCompleteTextView view, String[] items) {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_dropdown_item_1line, items);
        view.setAdapter(adapter);
    }

    private String parseSkillsJson(String json) {
        if (json == null || json.isEmpty()) return "";
        if (json.startsWith("[") && json.endsWith("]")) {
            try {
                String[] array = new com.google.gson.Gson().fromJson(json, String[].class);
                return String.join(", ", array);
            } catch (Exception e) {
                return json.replace("[", "").replace("]", "").replace("\"", "").trim();
            }
        }
        return json;
    }
}
