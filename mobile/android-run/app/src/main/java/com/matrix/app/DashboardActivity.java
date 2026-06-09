package com.matrix.app;

import android.app.AlertDialog;
import android.os.Bundle;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.matrix.app.models.CreateTicketRequest;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DashboardActivity extends AppCompatActivity {
    private MatrixApi api;
    private SecurityManager securityManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        securityManager = new SecurityManager(this);
        api = ApiClient.getClient(securityManager).create(MatrixApi.class);

        MaterialToolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);

        MaterialButton refreshButton = findViewById(R.id.btn_refresh);
        refreshButton.setOnClickListener(v -> Toast.makeText(this, "Status refreshed", Toast.LENGTH_SHORT).show());

        FloatingActionButton fab = findViewById(R.id.fab_request_mentor);
        fab.setOnClickListener(v -> showMentorRequestDialog());
    }

    private void showMentorRequestDialog() {
        final EditText input = new EditText(this);
        input.setHint("e.g. My Redis container keeps failing");

        new AlertDialog.Builder(this)
                .setTitle("Request Technical Mentor")
                .setMessage("Describe your technical issue:")
                .setView(input)
                .setPositiveButton("Submit Ticket", (dialog, which) -> {
                    String description = input.getText().toString().trim();
                    if (!description.isEmpty()) {
                        submitTicket(description);
                    } else {
                        Toast.makeText(this, "Description cannot be empty", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void submitTicket(String description) {
        CreateTicketRequest payload = new CreateTicketRequest("", description);

        api.requestMentor(payload).enqueue(new Callback<Void>() {
            @Override
            public void onResponse(Call<Void> call, Response<Void> response) {
                if (response.isSuccessful()) {
                    Toast.makeText(DashboardActivity.this, "Ticket submitted successfully!", Toast.LENGTH_LONG).show();
                } else {
                    Toast.makeText(DashboardActivity.this, "Failed to submit ticket", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<Void> call, Throwable t) {
                Toast.makeText(DashboardActivity.this, "Network Error: " + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
