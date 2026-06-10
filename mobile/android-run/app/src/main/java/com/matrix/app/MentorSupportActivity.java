package com.matrix.app;

import android.os.Bundle;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.matrix.app.models.CreateTicketRequest;
import com.matrix.app.models.TeamDetails;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MentorSupportActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_mentor_support);

        // Allow passing hackathon_id from intent (e.g. from HackathonDetailActivity)
        String passedHackathonId = getIntent().getStringExtra("hackathon_id");

        TextInputEditText etHackathonId = findViewById(R.id.et_team_id);   // Reusing this field for hackathon ID
        TextInputEditText description    = findViewById(R.id.et_description);
        MaterialButton submit            = findViewById(R.id.btn_submit_ticket);

        if (passedHackathonId != null && !passedHackathonId.isEmpty()) {
            etHackathonId.setText(passedHackathonId);
        }

        submit.setOnClickListener(v -> {
            String hackathonId = String.valueOf(etHackathonId.getText()).trim();
            String desc        = String.valueOf(description.getText()).trim();

            if (hackathonId.isEmpty() || desc.isEmpty()) {
                Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
                return;
            }

            submit.setEnabled(false);
            submit.setText("Submitting...");

            SecurityManager securityManager = new SecurityManager(this);
            MatrixApi api = ApiClient.getClient(securityManager).create(MatrixApi.class);

            // Fetch the user's team for this hackathon first
            api.getMyTeam(hackathonId).enqueue(new Callback<TeamDetails>() {
                @Override
                public void onResponse(Call<TeamDetails> call, Response<TeamDetails> response) {
                    if (response.isSuccessful() && response.body() != null && response.body().getTeam() != null) {
                        String teamId = response.body().getTeam().getId();

                        // Submit the ticket using the derived team ID
                        api.createTicket(hackathonId, new CreateTicketRequest(teamId, desc)).enqueue(new Callback<Void>() {
                            @Override
                            public void onResponse(Call<Void> call, Response<Void> res) {
                                submit.setEnabled(true);
                                submit.setText("Submit Ticket");
                                if (res.isSuccessful()) {
                                    Toast.makeText(MentorSupportActivity.this, "Ticket submitted! A mentor will respond shortly.", Toast.LENGTH_SHORT).show();
                                    description.setText("");
                                } else {
                                    Toast.makeText(MentorSupportActivity.this, "Submission failed (check registration status)", Toast.LENGTH_SHORT).show();
                                }
                            }

                            @Override
                            public void onFailure(Call<Void> call, Throwable t) {
                                submit.setEnabled(true);
                                submit.setText("Submit Ticket");
                                Toast.makeText(MentorSupportActivity.this, "Network error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                            }
                        });
                    } else {
                        submit.setEnabled(true);
                        submit.setText("Submit Ticket");
                        Toast.makeText(MentorSupportActivity.this, "You must create or join a team first to request mentor support.", Toast.LENGTH_LONG).show();
                    }
                }

                @Override
                public void onFailure(Call<TeamDetails> call, Throwable t) {
                    submit.setEnabled(true);
                    submit.setText("Submit Ticket");
                    Toast.makeText(MentorSupportActivity.this, "Failed to verify team details: " + t.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        });
    }
}