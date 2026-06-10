package com.matrix.app;

import android.os.Bundle;
import android.util.Patterns;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.matrix.app.models.RegisterRequest;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class RegisterActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_register);

        EditText name = findViewById(R.id.et_name);
        EditText email = findViewById(R.id.et_email);
        EditText password = findViewById(R.id.et_password);
        EditText confirmPassword = findViewById(R.id.et_confirm_password);
        Button register = findViewById(R.id.btn_register);

        register.setOnClickListener(v -> {
            String nameValue = name.getText().toString().trim();
            String emailValue = email.getText().toString().trim();
            String passwordValue = password.getText().toString();
            String confirmValue = confirmPassword.getText().toString();

            if (nameValue.isEmpty()) {
                name.setError("Name is required");
                return;
            }
            if (!Patterns.EMAIL_ADDRESS.matcher(emailValue).matches()) {
                email.setError("Enter a valid email");
                return;
            }
            if (passwordValue.length() < 8) {
                password.setError("Password must be at least 8 characters");
                return;
            }
            if (!passwordValue.equals(confirmValue)) {
                confirmPassword.setError("Passwords do not match");
                return;
            }

            register.setEnabled(false);
            register.setText("Creating Account...");

            MatrixApi api = ApiClient.getClient(new SecurityManager(this)).create(MatrixApi.class);
            api.register(new RegisterRequest(
                    nameValue,
                    emailValue,
                    passwordValue
            )).enqueue(new Callback<Object>() {
                @Override
                public void onResponse(Call<Object> call, Response<Object> response) {
                    register.setEnabled(true);
                    register.setText("Create Account");
                    Toast.makeText(RegisterActivity.this, response.isSuccessful() ? "Account created" : "Registration failed. Email may already exist.", Toast.LENGTH_LONG).show();
                    if(response.isSuccessful()) finish();
                }

                @Override
                public void onFailure(Call<Object> call, Throwable t) {
                    register.setEnabled(true);
                    register.setText("Create Account");
                    Toast.makeText(RegisterActivity.this, "Cannot connect to server: " + t.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        });
    }
}
