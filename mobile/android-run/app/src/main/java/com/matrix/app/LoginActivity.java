package com.matrix.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.widget.EditText;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.google.android.material.button.MaterialButton;
import com.google.firebase.messaging.FirebaseMessaging;
import com.matrix.app.models.FcmTokenRequest;
import com.matrix.app.models.LoginRequest;
import com.matrix.app.models.LoginResponse;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LoginActivity extends AppCompatActivity {
    private MatrixApi api;
    private SecurityManager securityManager;

    // Launcher for the POST_NOTIFICATIONS runtime permission (Android 13+)
    private final ActivityResultLauncher<String> requestPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
                if (isGranted) {
                    android.util.Log.d("MatrixApp", "Notification permission granted");
                } else {
                    Toast.makeText(this, "Push notifications disabled. Enable in Settings to receive alerts.", Toast.LENGTH_LONG).show();
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        securityManager = new SecurityManager(this);

        if (securityManager.getToken() != null) {
            startActivity(new Intent(this, DashboardActivity.class));
            finish();
            return;
        }

        api = ApiClient.getClient(securityManager).create(MatrixApi.class);

        EditText etEmail = findViewById(R.id.et_email);
        EditText etPassword = findViewById(R.id.et_password);
        MaterialButton btnLogin = findViewById(R.id.btn_login);
        findViewById(R.id.tv_create_account).setOnClickListener(v -> startActivity(new Intent(this, RegisterActivity.class)));

        btnLogin.setEnabled(false);

        TextWatcher watcher = new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                btnLogin.setEnabled(
                        !etEmail.getText().toString().trim().isEmpty() &&
                        !etPassword.getText().toString().trim().isEmpty()
                );
            }
            @Override public void afterTextChanged(Editable s) {}
        };

        etEmail.addTextChangedListener(watcher);
        etPassword.addTextChangedListener(watcher);

        btnLogin.setOnClickListener(v -> {
            String email = etEmail.getText().toString().trim();
            String password = etPassword.getText().toString().trim();
            if (!email.isEmpty() && !password.isEmpty()) {
                btnLogin.setEnabled(false);
                btnLogin.setText("Signing In...");
                performLogin(email, password, btnLogin);
            } else {
                Toast.makeText(this, "Please fill out all fields", Toast.LENGTH_SHORT).show();
            }
        });

        // Request notification permission on Android 13+
        askNotificationPermission();
    }

    private void askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
    }

    private void performLogin(String email, String password, MaterialButton btnLogin) {
        LoginRequest request = new LoginRequest(email, password);

        api.login(request).enqueue(new Callback<LoginResponse>() {
            @Override
            public void onResponse(Call<LoginResponse> call, Response<LoginResponse> response) {
                btnLogin.setEnabled(true);
                btnLogin.setText("Sign In");

                if (response.isSuccessful() && response.body() != null) {
                    LoginResponse body = response.body();
                    if (body.getToken() != null) {
                        securityManager.saveToken(body.getToken());
                        // After saving the JWT, register the FCM token with the backend
                        registerFcmTokenAfterLogin();
                        Toast.makeText(LoginActivity.this, "Login Successful", Toast.LENGTH_SHORT).show();
                        startActivity(new Intent(LoginActivity.this, DashboardActivity.class));
                        finish();
                        return;
                    }
                }
                Toast.makeText(LoginActivity.this, "Invalid credentials", Toast.LENGTH_SHORT).show();
            }

            @Override
            public void onFailure(Call<LoginResponse> call, Throwable t) {
                btnLogin.setEnabled(true);
                btnLogin.setText("Sign In");
                Toast.makeText(LoginActivity.this, "Network Error: " + t.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
    }

    private void registerFcmTokenAfterLogin() {
        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) {
                        android.util.Log.w("MatrixApp", "Fetching FCM token failed", task.getException());
                        return;
                    }
                    String token = task.getResult();
                    android.util.Log.d("MatrixApp", "FCM Token: " + token);

                    MatrixApi matrixApi = ApiClient.getClient(securityManager).create(MatrixApi.class);
                    matrixApi.registerFcmToken(new FcmTokenRequest(token)).enqueue(new Callback<Void>() {
                        @Override
                        public void onResponse(Call<Void> call, Response<Void> response) {
                            android.util.Log.d("MatrixApp", "FCM token registered: " + response.code());
                        }
                        @Override
                        public void onFailure(Call<Void> call, Throwable t) {
                            android.util.Log.e("MatrixApp", "FCM token registration failed: " + t.getMessage());
                        }
                    });
                });
    }
}
