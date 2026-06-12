package com.matrix.app;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.snackbar.Snackbar;
import com.google.android.material.textfield.TextInputEditText;
import com.google.android.material.textfield.TextInputLayout;
import com.matrix.app.models.RegisterRequest;
import com.matrix.app.utils.EmailValidator;
import com.matrix.app.utils.PasswordValidator;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class RegisterActivity extends AppCompatActivity {

    private TextInputLayout tilName, tilEmail, tilPassword, tilConfirmPassword;
    private TextInputEditText etName, etEmail, etPassword, etConfirmPassword;
    private MaterialButton btnRegister;
    private ProgressBar progressRegister, progressPasswordStrength;
    private LinearLayout passwordStrengthContainer;
    private TextView tvPasswordStrength;
    private View rootView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        rootView = findViewById(android.R.id.content);

        // Bind views
        tilName = findViewById(R.id.til_name);
        tilEmail = findViewById(R.id.til_email);
        tilPassword = findViewById(R.id.til_password);
        tilConfirmPassword = findViewById(R.id.til_confirm_password);

        etName = findViewById(R.id.et_name);
        etEmail = findViewById(R.id.et_email);
        etPassword = findViewById(R.id.et_password);
        etConfirmPassword = findViewById(R.id.et_confirm_password);

        btnRegister = findViewById(R.id.btn_register);
        progressRegister = findViewById(R.id.progress_register);
        progressPasswordStrength = findViewById(R.id.progress_password_strength);
        passwordStrengthContainer = findViewById(R.id.password_strength_container);
        tvPasswordStrength = findViewById(R.id.tv_password_strength);

        btnRegister.setEnabled(false);

        // Back to login
        findViewById(R.id.tv_back_to_login).setOnClickListener(v -> finish());

        // Real-time validation watchers
        etName.addTextChangedListener(createFieldWatcher());
        etEmail.addTextChangedListener(createFieldWatcher());
        etConfirmPassword.addTextChangedListener(createFieldWatcher());

        // Password field has special handling for strength indicator
        etPassword.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                updatePasswordStrength(s.toString());
                updateButtonState();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        });

        btnRegister.setOnClickListener(v -> attemptRegistration());
    }

    private TextWatcher createFieldWatcher() {
        return new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                clearErrors();
                updateButtonState();
            }

            @Override
            public void afterTextChanged(Editable s) {}
        };
    }

    private void updatePasswordStrength(String password) {
        if (password.isEmpty()) {
            passwordStrengthContainer.setVisibility(View.GONE);
            return;
        }

        passwordStrengthContainer.setVisibility(View.VISIBLE);
        PasswordValidator.ValidationResult result = PasswordValidator.validate(password);
        progressPasswordStrength.setProgress(result.strengthPercent);
        tvPasswordStrength.setText(PasswordValidator.getStrengthLabel(result.strengthPercent));
        tvPasswordStrength.setTextColor(PasswordValidator.getStrengthColor(result.strengthPercent));

        // Update helper text with remaining requirements
        if (!result.isValid && !result.errors.isEmpty()) {
            StringBuilder helper = new StringBuilder("Missing: ");
            for (int i = 0; i < result.errors.size(); i++) {
                if (i > 0) helper.append(", ");
                helper.append(result.errors.get(i));
            }
            tilPassword.setHelperText(helper.toString());
        } else {
            tilPassword.setHelperText("✓ Strong password");
        }
    }

    private void updateButtonState() {
        String name = getText(etName);
        String email = getText(etEmail);
        String password = getText(etPassword);
        String confirm = getText(etConfirmPassword);

        boolean nameOk = name.length() >= 2;
        boolean emailOk = EmailValidator.isValid(email);
        PasswordValidator.ValidationResult passResult = PasswordValidator.validate(password);
        boolean passwordOk = passResult.isValid;
        boolean confirmOk = !confirm.isEmpty() && confirm.equals(password);

        btnRegister.setEnabled(nameOk && emailOk && passwordOk && confirmOk);
    }

    private void clearErrors() {
        tilName.setError(null);
        tilEmail.setError(null);
        tilPassword.setError(null);
        tilConfirmPassword.setError(null);
    }

    private void attemptRegistration() {
        String name = getText(etName);
        String email = getText(etEmail);
        String password = getText(etPassword);
        String confirm = getText(etConfirmPassword);

        boolean hasError = false;

        // Name validation
        if (name.isEmpty()) {
            tilName.setError("Full name is required");
            hasError = true;
        } else if (name.length() < 2) {
            tilName.setError("Name must be at least 2 characters");
            hasError = true;
        } else if (name.length() > 100) {
            tilName.setError("Name is too long");
            hasError = true;
        }

        // Email validation
        String emailError = EmailValidator.getError(email);
        if (emailError != null) {
            tilEmail.setError(emailError);
            hasError = true;
        }

        // Password validation
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

        // Confirm password
        if (confirm.isEmpty()) {
            tilConfirmPassword.setError("Please confirm your password");
            hasError = true;
        } else if (!confirm.equals(password)) {
            tilConfirmPassword.setError("Passwords do not match");
            hasError = true;
        }

        if (hasError) return;

        setLoading(true);
        performRegistration(name, email, password);
    }

    private void performRegistration(String name, String email, String password) {
        MatrixApi api = ApiClient.getClient(new SecurityManager(this)).create(MatrixApi.class);

        api.register(new RegisterRequest(name, email, password)).enqueue(new Callback<Object>() {
            @Override
            public void onResponse(Call<Object> call, Response<Object> response) {
                setLoading(false);

                if (response.isSuccessful()) {
                    Snackbar.make(rootView, "Account created successfully! 🎉", Snackbar.LENGTH_SHORT).show();
                    // Go back to login after a short delay
                    rootView.postDelayed(() -> finish(), 1200);
                } else if (response.code() == 409) {
                    tilEmail.setError("This email is already registered");
                    Snackbar.make(rootView, "Email already exists. Try signing in instead.", Snackbar.LENGTH_LONG).show();
                } else if (response.code() == 400) {
                    Snackbar.make(rootView, "Invalid data. Please check all fields.", Snackbar.LENGTH_LONG).show();
                } else {
                    Snackbar.make(rootView, "Registration failed. Please try again.", Snackbar.LENGTH_LONG).show();
                }
            }

            @Override
            public void onFailure(Call<Object> call, Throwable t) {
                setLoading(false);
                Snackbar.make(rootView,
                        "Network error. Check your connection.",
                        Snackbar.LENGTH_LONG)
                        .setAction("Retry", v -> attemptRegistration())
                        .show();
            }
        });
    }

    private void setLoading(boolean loading) {
        btnRegister.setEnabled(!loading);
        btnRegister.setText(loading ? "Creating Account..." : "Create Account");
        progressRegister.setVisibility(loading ? View.VISIBLE : View.GONE);
        etName.setEnabled(!loading);
        etEmail.setEnabled(!loading);
        etPassword.setEnabled(!loading);
        etConfirmPassword.setEnabled(!loading);
    }

    private String getText(TextInputEditText field) {
        return field.getText() != null ? field.getText().toString().trim() : "";
    }
}
