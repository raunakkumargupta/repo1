package com.matrix.app;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.matrix.app.models.ApiUser;
import com.matrix.app.models.InviteUserRequest;
import com.matrix.app.models.JoinTeamRequest;
import com.matrix.app.models.CreateTeamRequest;
import com.matrix.app.models.ManageRequestBody;
import com.matrix.app.models.SubmitProjectRequest;
import com.matrix.app.models.Team;
import com.matrix.app.models.TeamDetails;
import com.matrix.app.models.TeamInvitation;
import com.matrix.app.models.TeamJoinRequest;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class FindTeamActivity extends BaseActivity {

    private MatrixApi api;
    private String hackathonId;
    private String myTeamId;
    private String myLeaderId;
    private String myUserId;

    // -------- Section containers --------
    private LinearLayout sectionMyTeam;
    private LinearLayout sectionCreate;
    private LinearLayout sectionJoin;
    private LinearLayout sectionBrowse;
    private LinearLayout sectionRequests;
    private LinearLayout sectionInvitations;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_find_team);

        hackathonId = getIntent().getStringExtra("hackathon_id");
        if (hackathonId == null) hackathonId = "";
        String hackathonTitle = getIntent().getStringExtra("hackathon_title");

        api = ApiClient.getClient(new SecurityManager(this)).create(MatrixApi.class);

        // Header
        TextView tvTitle = findViewById(R.id.tv_team_hub_title);
        if (hackathonTitle != null) tvTitle.setText("Team Hub · " + hackathonTitle);

        // Section references
        sectionMyTeam      = findViewById(R.id.section_my_team);
        sectionCreate      = findViewById(R.id.section_create);
        sectionJoin        = findViewById(R.id.section_join);
        sectionBrowse      = findViewById(R.id.section_browse);
        sectionRequests    = findViewById(R.id.section_requests);
        sectionInvitations = findViewById(R.id.section_invitations);

        // Load user identity first, then load all data
        api.getMe().enqueue(new Callback<ApiUser>() {
            @Override
            public void onResponse(Call<ApiUser> call, Response<ApiUser> response) {
                if (response.isSuccessful() && response.body() != null) {
                    myUserId = response.body().getId();
                }
                loadMyTeam();
            }
            @Override
            public void onFailure(Call<ApiUser> call, Throwable t) {
                loadMyTeam();
            }
        });

        setupCreateTeamSection();
        setupJoinTeamSection();
        setupBrowseSection();
    }

    // ==========================================
    // Load My Team
    // ==========================================
    private void loadMyTeam() {
        api.getMyTeam(hackathonId).enqueue(new Callback<TeamDetails>() {
            @Override
            public void onResponse(Call<TeamDetails> call, Response<TeamDetails> response) {
                if (response.isSuccessful() && response.body() != null && response.body().getTeam() != null) {
                    Team team = response.body().getTeam();
                    List<ApiUser> members = response.body().getMembers();
                    myTeamId = team.getId();
                    myLeaderId = team.getLeaderId();
                    renderMyTeam(team, members);
                    loadRequests();
                } else {
                    // No team yet – show create/join/browse sections
                    sectionMyTeam.setVisibility(View.GONE);
                    sectionCreate.setVisibility(View.VISIBLE);
                    sectionJoin.setVisibility(View.VISIBLE);
                    sectionBrowse.setVisibility(View.VISIBLE);
                    loadMyInvitations();
                }
            }

            @Override
            public void onFailure(Call<TeamDetails> call, Throwable t) {
                sectionMyTeam.setVisibility(View.GONE);
                sectionCreate.setVisibility(View.VISIBLE);
                sectionJoin.setVisibility(View.VISIBLE);
                sectionBrowse.setVisibility(View.VISIBLE);
                loadMyInvitations();
            }
        });
    }

    private void renderMyTeam(Team team, List<ApiUser> members) {
        sectionMyTeam.setVisibility(View.VISIBLE);
        sectionCreate.setVisibility(View.GONE);
        sectionJoin.setVisibility(View.GONE);
        sectionBrowse.setVisibility(View.GONE);

        boolean isLeader = myUserId != null && myUserId.equals(myLeaderId);

        TextView tvTeamName = findViewById(R.id.tv_my_team_name);
        TextView tvInviteCode = findViewById(R.id.tv_my_invite_code);
        TextView tvRepoUrl = findViewById(R.id.tv_my_repo_url);
        LinearLayout memberContainer = findViewById(R.id.member_container);

        tvTeamName.setText(team.getTeamName());
        tvInviteCode.setText("Invite Code: " + team.getInviteCode());
        String repo = team.getRepositoryUrl();
        tvRepoUrl.setText(repo != null && !repo.isEmpty() ? "Repo: " + repo : "No repository submitted yet");

        // Members
        memberContainer.removeAllViews();
        if (members != null) {
            for (ApiUser member : members) {
                TextView tv = new TextView(this);
                String label = member.getName() + " (" + member.getEmail() + ")";
                if (member.getId() != null && member.getId().equals(myLeaderId)) label += " ★ Leader";
                tv.setText(label);
                tv.setPadding(0, 8, 0, 8);
                memberContainer.addView(tv);

                // Leader can remove members (but not themselves)
                if (isLeader && !member.getId().equals(myUserId)) {
                    MaterialButton btnRemove = new MaterialButton(this);
                    btnRemove.setText("Remove");
                    btnRemove.setTag(member.getId());
                    btnRemove.setOnClickListener(v -> removeMember(team.getId(), member.getId()));
                    memberContainer.addView(btnRemove);
                }
            }
        }

        // Submit project (any member can submit)
        TextInputEditText etRepo = findViewById(R.id.et_repo_url);
        if (repo != null && !repo.isEmpty()) etRepo.setText(repo);

        MaterialButton btnSubmit = findViewById(R.id.btn_submit_project);
        btnSubmit.setOnClickListener(v -> {
            String url = etRepo.getText() != null ? etRepo.getText().toString().trim() : "";
            if (url.isEmpty()) {
                Toast.makeText(this, "Please enter a repository URL", Toast.LENGTH_SHORT).show();
                return;
            }
            api.submitProject(hackathonId, new SubmitProjectRequest(url)).enqueue(new Callback<Map<String, String>>() {
                @Override
                public void onResponse(Call<Map<String, String>> call, Response<Map<String, String>> response) {
                    Toast.makeText(FindTeamActivity.this, "Project submitted successfully!", Toast.LENGTH_SHORT).show();
                    tvRepoUrl.setText("Repo: " + url);
                }
                @Override
                public void onFailure(Call<Map<String, String>> call, Throwable t) {
                    Toast.makeText(FindTeamActivity.this, "Submit failed: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });

        // Invite section visible only for leader
        View inviteSection = findViewById(R.id.layout_invite);
        inviteSection.setVisibility(isLeader ? View.VISIBLE : View.GONE);
        if (isLeader) {
            setupInviteSection(team.getId());
            setupLeaderRequestsSection(team.getId());
        }
    }

    private void removeMember(String teamId, String memberId) {
        api.removeMember(hackathonId, teamId, memberId).enqueue(new Callback<Map<String, String>>() {
            @Override
            public void onResponse(Call<Map<String, String>> call, Response<Map<String, String>> response) {
                Toast.makeText(FindTeamActivity.this, "Member removed", Toast.LENGTH_SHORT).show();
                loadMyTeam(); // Refresh
            }
            @Override
            public void onFailure(Call<Map<String, String>> call, Throwable t) {
                Toast.makeText(FindTeamActivity.this, "Failed to remove member", Toast.LENGTH_SHORT).show();
            }
        });
    }

    // ==========================================
    // Create Team
    // ==========================================
    private void setupCreateTeamSection() {
        TextInputEditText etTeamName = findViewById(R.id.et_team_name);
        MaterialButton btnCreate = findViewById(R.id.btn_create_team);
        btnCreate.setOnClickListener(v -> {
            String name = etTeamName.getText() != null ? etTeamName.getText().toString().trim() : "";
            if (name.isEmpty()) {
                Toast.makeText(this, "Please enter a team name", Toast.LENGTH_SHORT).show();
                return;
            }
            api.createTeam(hackathonId, new CreateTeamRequest(name)).enqueue(new Callback<Team>() {
                @Override
                public void onResponse(Call<Team> call, Response<Team> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        Toast.makeText(FindTeamActivity.this, "Team created! Invite code: " + response.body().getInviteCode(), Toast.LENGTH_LONG).show();
                        loadMyTeam();
                    } else {
                        Toast.makeText(FindTeamActivity.this, "Failed to create team", Toast.LENGTH_SHORT).show();
                    }
                }
                @Override
                public void onFailure(Call<Team> call, Throwable t) {
                    Toast.makeText(FindTeamActivity.this, "Error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });
    }

    // ==========================================
    // Join Team via Invite Code
    // ==========================================
    private void setupJoinTeamSection() {
        TextInputEditText etInviteCode = findViewById(R.id.et_invite_code);
        MaterialButton btnJoin = findViewById(R.id.btn_join_team);
        btnJoin.setOnClickListener(v -> {
            String code = etInviteCode.getText() != null ? etInviteCode.getText().toString().trim() : "";
            if (code.isEmpty()) {
                Toast.makeText(this, "Please enter an invite code", Toast.LENGTH_SHORT).show();
                return;
            }
            api.joinTeam(hackathonId, new JoinTeamRequest(code)).enqueue(new Callback<Team>() {
                @Override
                public void onResponse(Call<Team> call, Response<Team> response) {
                    if (response.isSuccessful() && response.body() != null) {
                        Toast.makeText(FindTeamActivity.this, "Joined team: " + response.body().getTeamName(), Toast.LENGTH_SHORT).show();
                        loadMyTeam();
                    } else {
                        Toast.makeText(FindTeamActivity.this, "Invalid invite code or team is full", Toast.LENGTH_SHORT).show();
                    }
                }
                @Override
                public void onFailure(Call<Team> call, Throwable t) {
                    Toast.makeText(FindTeamActivity.this, "Error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });
    }

    // ==========================================
    // Browse Public Teams
    // ==========================================
    private void setupBrowseSection() {
        LinearLayout container = findViewById(R.id.team_container);
        TextInputEditText etSearch = findViewById(R.id.et_team_search);
        TextView tvSummary = findViewById(R.id.tv_team_summary);

        api.getPublicTeams(hackathonId).enqueue(new Callback<List<Team>>() {
            @Override
            public void onResponse(Call<List<Team>> call, Response<List<Team>> response) {
                container.removeAllViews();
                List<Team> teams = response.body();
                if (teams == null || teams.isEmpty()) {
                    tvSummary.setText("No public teams yet. Create the first one!");
                    return;
                }
                tvSummary.setText("Open teams: " + teams.size());

                for (Team team : teams) {
                    View card = getLayoutInflater().inflate(R.layout.item_team_card, container, false);
                    TextView titleView = card.findViewById(R.id.team_title);
                    TextView codeView = card.findViewById(R.id.team_code);
                    MaterialButton btnRequest = card.findViewById(R.id.btn_request_join);

                    titleView.setText(team.getTeamName());
                    codeView.setText("Invite Code: " + team.getInviteCode());
                    if (btnRequest != null) {
                        btnRequest.setOnClickListener(v -> {
                            api.requestToJoin(hackathonId, team.getId()).enqueue(new Callback<Map<String, String>>() {
                                @Override
                                public void onResponse(Call<Map<String, String>> call2, Response<Map<String, String>> r) {
                                    Toast.makeText(FindTeamActivity.this, "Join request sent to " + team.getTeamName(), Toast.LENGTH_SHORT).show();
                                    btnRequest.setEnabled(false);
                                    btnRequest.setText("Requested");
                                }
                                @Override
                                public void onFailure(Call<Map<String, String>> call2, Throwable t) {
                                    Toast.makeText(FindTeamActivity.this, "Failed to send request", Toast.LENGTH_SHORT).show();
                                }
                            });
                        });
                    }
                    container.addView(card);

                    // Search filter
                    etSearch.addTextChangedListener(new TextWatcher() {
                        @Override public void beforeTextChanged(CharSequence s, int i, int i1, int i2) {}
                        @Override public void onTextChanged(CharSequence s, int i, int i1, int i2) {
                            String q = s.toString().toLowerCase();
                            card.setVisibility(team.getTeamName().toLowerCase().contains(q) ? View.VISIBLE : View.GONE);
                        }
                        @Override public void afterTextChanged(Editable s) {}
                    });
                }
            }

            @Override
            public void onFailure(Call<List<Team>> call, Throwable t) {
                tvSummary.setText("Unable to load public teams.");
            }
        });
    }

    // ==========================================
    // Invite User (leader only)
    // ==========================================
    private void setupInviteSection(String teamId) {
        TextInputEditText etEmail = findViewById(R.id.et_invite_email);
        MaterialButton btnInvite = findViewById(R.id.btn_invite_user);
        btnInvite.setOnClickListener(v -> {
            String email = etEmail.getText() != null ? etEmail.getText().toString().trim() : "";
            if (email.isEmpty()) {
                Toast.makeText(this, "Enter email to invite", Toast.LENGTH_SHORT).show();
                return;
            }
            api.inviteUser(hackathonId, teamId, new InviteUserRequest(email)).enqueue(new Callback<Map<String, String>>() {
                @Override
                public void onResponse(Call<Map<String, String>> call, Response<Map<String, String>> response) {
                    Toast.makeText(FindTeamActivity.this, "Invitation sent!", Toast.LENGTH_SHORT).show();
                    etEmail.setText("");
                }
                @Override
                public void onFailure(Call<Map<String, String>> call, Throwable t) {
                    Toast.makeText(FindTeamActivity.this, "Invite failed: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });
    }

    // ==========================================
    // Incoming Requests (leader only)
    // ==========================================
    private void setupLeaderRequestsSection(String teamId) {
        sectionRequests.setVisibility(View.VISIBLE);
        LinearLayout reqContainer = findViewById(R.id.requests_container);
        reqContainer.removeAllViews();

        api.getTeamRequests(hackathonId, teamId).enqueue(new Callback<List<TeamJoinRequest>>() {
            @Override
            public void onResponse(Call<List<TeamJoinRequest>> call, Response<List<TeamJoinRequest>> response) {
                List<TeamJoinRequest> reqs = response.body();
                if (reqs == null || reqs.isEmpty()) {
                    TextView tv = new TextView(FindTeamActivity.this);
                    tv.setText("No pending join requests");
                    reqContainer.addView(tv);
                    return;
                }
                for (TeamJoinRequest req : reqs) {
                    if (!"pending".equalsIgnoreCase(req.getStatus())) continue;
                    View row = getLayoutInflater().inflate(R.layout.item_request_row, reqContainer, false);
                    TextView tvName = row.findViewById(R.id.tv_request_name);
                    MaterialButton btnAccept = row.findViewById(R.id.btn_accept_request);
                    MaterialButton btnReject = row.findViewById(R.id.btn_reject_request);
                    tvName.setText(req.getUserName() + " (" + req.getUserEmail() + ")");
                    btnAccept.setOnClickListener(v -> respondToRequest(req.getId(), "Accepted", row, reqContainer));
                    btnReject.setOnClickListener(v -> respondToRequest(req.getId(), "Rejected", row, reqContainer));
                    reqContainer.addView(row);
                }
            }

            @Override
            public void onFailure(Call<List<TeamJoinRequest>> call, Throwable t) {}
        });
    }

    private void respondToRequest(String reqId, String status, View row, LinearLayout container) {
        api.manageRequest(hackathonId, reqId, new ManageRequestBody(status)).enqueue(new Callback<Map<String, String>>() {
            @Override
            public void onResponse(Call<Map<String, String>> call, Response<Map<String, String>> response) {
                Toast.makeText(FindTeamActivity.this, "Request " + status.toLowerCase(), Toast.LENGTH_SHORT).show();
                container.removeView(row);
                if (status.equals("Accepted")) loadMyTeam(); // Refresh to show new member
            }
            @Override
            public void onFailure(Call<Map<String, String>> call, Throwable t) {
                Toast.makeText(FindTeamActivity.this, "Action failed", Toast.LENGTH_SHORT).show();
            }
        });
    }

    // ==========================================
    // My Requests (non-leader: show outgoing join requests)
    // ==========================================
    private void loadRequests() {
        // Only show for non-leaders
        boolean isLeader = myUserId != null && myUserId.equals(myLeaderId);
        if (isLeader) return;

        sectionRequests.setVisibility(View.VISIBLE);
        LinearLayout reqContainer = findViewById(R.id.requests_container);
        reqContainer.removeAllViews();

        api.getMyRequests(hackathonId).enqueue(new Callback<List<TeamJoinRequest>>() {
            @Override
            public void onResponse(Call<List<TeamJoinRequest>> call, Response<List<TeamJoinRequest>> response) {
                List<TeamJoinRequest> reqs = response.body();
                if (reqs == null || reqs.isEmpty()) return;
                for (TeamJoinRequest req : reqs) {
                    TextView tv = new TextView(FindTeamActivity.this);
                    tv.setText("Request to " + req.getTeamName() + ": " + req.getStatus());
                    tv.setPadding(0, 8, 0, 8);
                    reqContainer.addView(tv);
                }
            }
            @Override
            public void onFailure(Call<List<TeamJoinRequest>> call, Throwable t) {}
        });
    }

    // ==========================================
    // My Invitations (when user has no team)
    // ==========================================
    private void loadMyInvitations() {
        sectionInvitations.setVisibility(View.VISIBLE);
        LinearLayout container = findViewById(R.id.invitations_container);
        container.removeAllViews();

        api.getMyInvitations(hackathonId).enqueue(new Callback<List<TeamInvitation>>() {
            @Override
            public void onResponse(Call<List<TeamInvitation>> call, Response<List<TeamInvitation>> response) {
                List<TeamInvitation> invs = response.body();
                if (invs == null || invs.isEmpty()) {
                    sectionInvitations.setVisibility(View.GONE);
                    return;
                }
                for (TeamInvitation inv : invs) {
                    if (!"pending".equalsIgnoreCase(inv.getStatus())) continue;
                    View row = getLayoutInflater().inflate(R.layout.item_request_row, container, false);
                    TextView tvName = row.findViewById(R.id.tv_request_name);
                    MaterialButton btnAccept = row.findViewById(R.id.btn_accept_request);
                    MaterialButton btnReject = row.findViewById(R.id.btn_reject_request);
                    tvName.setText("Invite from: " + inv.getTeamName());
                    btnAccept.setText("Accept");
                    btnReject.setText("Decline");
                    btnAccept.setOnClickListener(v -> respondToInvitation(inv.getId(), "Accepted", row, container));
                    btnReject.setOnClickListener(v -> respondToInvitation(inv.getId(), "Declined", row, container));
                    container.addView(row);
                }
            }
            @Override
            public void onFailure(Call<List<TeamInvitation>> call, Throwable t) {
                sectionInvitations.setVisibility(View.GONE);
            }
        });
    }

    private void respondToInvitation(String invId, String status, View row, LinearLayout container) {
        api.manageInvitation(hackathonId, invId, new ManageRequestBody(status)).enqueue(new Callback<Map<String, String>>() {
            @Override
            public void onResponse(Call<Map<String, String>> call, Response<Map<String, String>> response) {
                Toast.makeText(FindTeamActivity.this, "Invitation " + status.toLowerCase(), Toast.LENGTH_SHORT).show();
                container.removeView(row);
                if (status.equals("Accepted")) loadMyTeam();
            }
            @Override
            public void onFailure(Call<Map<String, String>> call, Throwable t) {
                Toast.makeText(FindTeamActivity.this, "Action failed", Toast.LENGTH_SHORT).show();
            }
        });
    }
}