package com.matrix.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.snackbar.Snackbar;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;
import com.matrix.app.models.LoginRequest;
import com.matrix.app.models.LoginResponse;

import com.matrix.app.utils.EmailValidator;
import com.matrix.app.utils.PasswordValidator;

import java.util.List;

import okhttp3.Headers;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class LoginActivity extends AppCompatActivity {
    private MatrixApi api;
    private SecurityManager securityManager;

    private TextInputLayout tilEmail, tilPassword;
    private TextInputEditText etEmail, etPassword;
    private MaterialButton btnLogin;
    private ProgressBar progressLogin;
    private View rootView;

    // Launcher for POST_NOTIFICATIONS permission (Android 13+)
    private final ActivityResultLauncher<String> requestPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
                if (!isGranted) {
                    Snackbar.make(rootView,
                            "Notifications disabled. You can enable them in Settings.",
                            Snackbar.LENGTH_LONG).show();
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        rootView = findViewById(android.R.id.content);
        securityManager = new SecurityManager(this);

        // Auto-redirect if already logged in
        if (securityManager.getToken() != null) {
            navigateToDashboard();
            return;
        }

        api = ApiClient.getClient(securityManager).create(MatrixApi.class);

        // Bind views
        tilEmail = findViewById(R.id.til_email);
        tilPassword = findViewById(R.id.til_password);
        etEmail = findViewById(R.id.et_email);
        etPassword = findViewById(R.id.et_password);
        btnLogin = findViewById(R.id.btn_login);
        progressLogin = findViewById(R.id.progress_login);

        // Initially disabled
        btnLogin.setEnabled(false);

        // Setup create account button
        findViewById(R.id.tv_create_account).setOnClickListener(v ->
                startActivity(new Intent(this, RegisterActivity.class)));

        // Real-time validation
        TextWatcher validationWatcher = new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                clearErrors();
                validateForm();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        };

        etEmail.addTextChangedListener(validationWatcher);
        etPassword.addTextChangedListener(validationWatcher);

        // Login click
        btnLogin.setOnClickListener(v -> attemptLogin());

        // Request notification permission
        askNotificationPermission();
    }

    private void clearErrors() {
        tilEmail.setError(null);
        tilPassword.setError(null);
    }

    private void validateForm() {
        String email = etEmail.getText() != null ? etEmail.getText().toString().trim() : "";
        String password = etPassword.getText() != null ? etPassword.getText().toString() : "";

        boolean emailValid = EmailValidator.isValid(email);
        PasswordValidator.ValidationResult passResult = PasswordValidator.validate(password);
        boolean passwordValid = passResult.isValid;

        btnLogin.setEnabled(emailValid && passwordValid);
    }

    private void attemptLogin() {
        String email = etEmail.getText() != null ? etEmail.getText().toString().trim() : "";
        String password = etPassword.getText() != null ? etPassword.getText().toString() : "";

        // Final validation before submission
        boolean hasError = false;

        String emailError = EmailValidator.getError(email);
        if (emailError != null) {
            tilEmail.setError(emailError);
            hasError = true;
        }

        if (password.isEmpty()) {
            tilPassword.setError("Password is required");
            hasError = true;
        } else {
            PasswordValidator.ValidationResult passResult = PasswordValidator.validate(password);
            if (!passResult.isValid) {
                StringBuilder errMsg = new StringBuilder("Password needs: ");
                for (int i = 0; i < Math.min(passResult.errors.size(), 2); i++) {
                    if (i > 0) errMsg.append(", ");
                    errMsg.append(passResult.errors.get(i));
                }
                if (passResult.errors.size() > 2) {
                    errMsg.append(" +").append(passResult.errors.size() - 2).append(" more");
                }
                tilPassword.setError(errMsg.toString());
                hasError = true;
            }
        }

        if (hasError) return;

        setLoading(true);
        performLogin(email, password);
    }

    private void performLogin(String email, String password) {
        LoginRequest request = new LoginRequest(email, password);

        api.login(request).enqueue(new Callback<LoginResponse>() {
            @Override
            public void onResponse(Call<LoginResponse> call, Response<LoginResponse> response) {
                setLoading(false);

                if (response.isSuccessful() && response.body() != null) {
                    LoginResponse body = response.body();
                    String jwt = null;

                    // Try getting token from response body first
                    if (body.getToken() != null && !body.getToken().isEmpty()) {
                        jwt = body.getToken();
                    }

                    // Fallback: extract JWT from Set-Cookie header
                    if (jwt == null) {
                        Headers headers = response.headers();
                        List<String> cookies = headers.values("Set-Cookie");
                        for (String cookie : cookies) {
                            if (cookie.startsWith("jwt=")) {
                                jwt = cookie.split(";")[0].substring(4);
                                break;
                            }
                        }
                    }

                    if (jwt != null && !jwt.isEmpty()) {
                        securityManager.saveToken(jwt);
                        
                        // Register FCM token
                        com.google.firebase.messaging.FirebaseMessaging.getInstance().getToken()
                                .addOnCompleteListener(task -> {
                                    if (task.isSuccessful() && task.getResult() != null) {
                                        String token = task.getResult();
                                        api.registerDeviceToken(new com.matrix.app.models.DeviceTokenRequest(token))
                                                .enqueue(new Callback<Void>() {
                                                    @Override
                                                    public void onResponse(Call<Void> call, Response<Void> response) {
                                                        android.util.Log.d("LoginActivity", "FCM token registered");
                                                    }
                                                    @Override
                                                    public void onFailure(Call<Void> call, Throwable t) {
                                                        android.util.Log.e("LoginActivity", "FCM token registration failed", t);
                                                    }
                                                });
                                    }
                                });

                        Toast.makeText(LoginActivity.this, "Welcome back! 👋", Toast.LENGTH_SHORT).show();
                        navigateToDashboard();
                        return;
                    }
                }

                // Show specific error
                if (response.code() == 401) {
                    tilPassword.setError("Invalid email or password");
                    Snackbar.make(rootView, "Invalid credentials. Please check your email and password.", Snackbar.LENGTH_LONG).show();
                } else if (response.code() == 429) {
                    Snackbar.make(rootView, "Too many login attempts. Please wait a moment.", Snackbar.LENGTH_LONG).show();
                } else {
                    Snackbar.make(rootView, "Login failed. Please try again.", Snackbar.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<LoginResponse> call, Throwable t) {
                setLoading(false);
                Snackbar.make(rootView,
                        "Network error. Check your connection and try again.",
                        Snackbar.LENGTH_LONG)
                        .setAction("Retry", v -> attemptLogin())
                        .show();
            }
        });
    }

    private void setLoading(boolean loading) {
        btnLogin.setEnabled(!loading);
        btnLogin.setText(loading ? "Signing in..." : "Sign In");
        progressLogin.setVisibility(loading ? View.VISIBLE : View.GONE);
        etEmail.setEnabled(!loading);
        etPassword.setEnabled(!loading);
    }

    private void navigateToDashboard() {
        startActivity(new Intent(this, DashboardActivity.class));
        finish();
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out);
    }

    private void askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
    }
}
