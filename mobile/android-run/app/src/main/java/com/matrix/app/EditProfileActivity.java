package com.matrix.app;

import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.AutoCompleteTextView;
import android.widget.CheckBox;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.matrix.app.models.HackerProfile;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class EditProfileActivity extends AppCompatActivity {

    private MatrixApi api;

    private TextInputEditText etBio, etCity, etPhone, etEmergencyName, etEmergencyPhone;
    private TextInputEditText etInstitution, etFieldOfStudy, etGradYear, etAllergies;
    private TextInputEditText etGithub, etLinkedin, etResume, etSkills;
    
    private AutoCompleteTextView spinnerGender, spinnerTshirt;
    private AutoCompleteTextView spinnerDegree, spinnerGradMonth, spinnerDietary;
    
    private CheckBox cbNoEducation;
    private LinearLayout layoutEducationFields;
    
    private MaterialButton btnSave;
    private HackerProfile currentProfile;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_edit_profile);

        api = ApiClient.getClient(new SecurityManager(this)).create(MatrixApi.class);

        // Edit Texts
        etBio = findViewById(R.id.et_bio);
        etCity = findViewById(R.id.et_city);
        etPhone = findViewById(R.id.et_phone);
        etEmergencyName = findViewById(R.id.et_emergency_name);
        etEmergencyPhone = findViewById(R.id.et_emergency_phone);
        etInstitution = findViewById(R.id.et_institution);
        etFieldOfStudy = findViewById(R.id.et_field_of_study);
        etGradYear = findViewById(R.id.et_grad_year);
        etAllergies = findViewById(R.id.et_allergies);
        etGithub = findViewById(R.id.et_edit_github);
        etLinkedin = findViewById(R.id.et_edit_linkedin);
        etResume = findViewById(R.id.et_edit_resume);
        etSkills = findViewById(R.id.et_skills_edit);

        // AutoComplete Dropdowns (Spinners)
        spinnerGender = findViewById(R.id.spinner_gender);
        spinnerTshirt = findViewById(R.id.spinner_tshirt);
        spinnerDegree = findViewById(R.id.spinner_degree);
        spinnerGradMonth = findViewById(R.id.spinner_grad_month);
        spinnerDietary = findViewById(R.id.spinner_dietary);

        // Checkbox & Layout
        cbNoEducation = findViewById(R.id.cb_no_education);
        layoutEducationFields = findViewById(R.id.layout_education_fields);

        btnSave = findViewById(R.id.btn_save_profile);

        // Setup dropdowns
        setupDropdown(spinnerGender, new String[]{"Male", "Female", "Non-Binary", "Prefer not to say"});
        setupDropdown(spinnerTshirt, new String[]{"S", "M", "L", "XL", "XXL"});
        setupDropdown(spinnerDegree, new String[]{"High School", "Bachelors", "Masters", "PhD"});
        setupDropdown(spinnerGradMonth, new String[]{"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"});
        setupDropdown(spinnerDietary, new String[]{"No Restrictions", "Vegetarian", "Non-Vegetarian", "Vegan", "Jain", "Halal"});

        // Checkbox toggle logic
        cbNoEducation.setOnCheckedChangeListener((buttonView, isChecked) -> {
            layoutEducationFields.setVisibility(isChecked ? View.GONE : View.VISIBLE);
        });

        findViewById(R.id.btn_back_edit).setOnClickListener(v -> finish());

        btnSave.setOnClickListener(v -> saveProfile());

        loadProfile();
    }

    private void setupDropdown(AutoCompleteTextView view, String[] items) {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_dropdown_item_1line, items);
        view.setAdapter(adapter);
    }

    private void loadProfile() {
        btnSave.setEnabled(false);
        api.getMyProfile().enqueue(new Callback<HackerProfile>() {
            @Override
            public void onResponse(Call<HackerProfile> call, Response<HackerProfile> response) {
                btnSave.setEnabled(true);
                if (response.isSuccessful() && response.body() != null) {
                    currentProfile = response.body();
                    HackerProfile p = currentProfile;

                    etBio.setText(p.getBio() != null ? p.getBio() : "");
                    etCity.setText(p.getCity() != null ? p.getCity() : "");
                    
                    if (p.getGender() != null) spinnerGender.setText(p.getGender(), false);
                    if (p.getTshirtSize() != null) spinnerTshirt.setText(p.getTshirtSize(), false);
                    
                    etPhone.setText(p.getPhoneNumber() != null ? p.getPhoneNumber() : "");
                    etEmergencyName.setText(p.getEmergencyContactName() != null ? p.getEmergencyContactName() : "");
                    etEmergencyPhone.setText(p.getEmergencyContactNumber() != null ? p.getEmergencyContactNumber() : "");
                    
                    cbNoEducation.setChecked(!p.isHasFormalEducation());
                    layoutEducationFields.setVisibility(p.isHasFormalEducation() ? View.VISIBLE : View.GONE);
                    
                    etInstitution.setText(p.getInstitution() != null ? p.getInstitution() : "");
                    if (p.getDegreeType() != null) spinnerDegree.setText(p.getDegreeType(), false);
                    etFieldOfStudy.setText(p.getFieldOfStudy() != null ? p.getFieldOfStudy() : "");
                    etGradYear.setText(p.getGradYear() > 0 ? String.valueOf(p.getGradYear()) : "");
                    if (p.getGradMonth() != null) spinnerGradMonth.setText(p.getGradMonth(), false);
                    
                    if (p.getDietaryPreference() != null) spinnerDietary.setText(p.getDietaryPreference(), false);
                    etAllergies.setText(p.getAllergies() != null ? p.getAllergies() : "");
                    
                    etGithub.setText(p.getGithubUrl() != null ? p.getGithubUrl() : "");
                    etLinkedin.setText(p.getLinkedinUrl() != null ? p.getLinkedinUrl() : "");
                    etResume.setText(p.getResumeUrl() != null ? p.getResumeUrl() : "");
                    etSkills.setText(p.getSkills() != null ? p.getSkills() : "");
                }
            }

            @Override
            public void onFailure(Call<HackerProfile> call, Throwable t) {
                btnSave.setEnabled(true);
                Toast.makeText(EditProfileActivity.this, "Failed to load profile", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void saveProfile() {
        String bio = etBio.getText().toString().trim();
        String city = etCity.getText().toString().trim();
        String gender = spinnerGender.getText().toString().trim();
        String tshirt = spinnerTshirt.getText().toString().trim();
        String phone = etPhone.getText().toString().trim();
        String emergencyName = etEmergencyName.getText().toString().trim();
        String emergencyPhone = etEmergencyPhone.getText().toString().trim();
        
        boolean hasEducation = !cbNoEducation.isChecked();
        String institution = etInstitution.getText().toString().trim();
        String degree = spinnerDegree.getText().toString().trim();
        String fieldOfStudy = etFieldOfStudy.getText().toString().trim();
        String gradYearStr = etGradYear.getText().toString().trim();
        String gradMonth = spinnerGradMonth.getText().toString().trim();
        int gradYear = 0;
        if (hasEducation && !gradYearStr.isEmpty()) {
            try {
                gradYear = Integer.parseInt(gradYearStr);
            } catch (NumberFormatException ignored) {}
        }

        String dietary = spinnerDietary.getText().toString().trim();
        String allergies = etAllergies.getText().toString().trim();
        String github = etGithub.getText().toString().trim();
        String linkedin = etLinkedin.getText().toString().trim();
        String resume = etResume.getText().toString().trim();
        String skills = etSkills.getText().toString().trim();

        if (currentProfile == null) {
            currentProfile = new HackerProfile();
        }

        currentProfile.setBio(bio);
        currentProfile.setCity(city);
        currentProfile.setGender(gender);
        currentProfile.setTshirtSize(tshirt);
        currentProfile.setPhoneNumber(phone);
        currentProfile.setEmergencyContactName(emergencyName);
        currentProfile.setEmergencyContactNumber(emergencyPhone);
        
        currentProfile.setHasFormalEducation(hasEducation);
        if (hasEducation) {
            currentProfile.setInstitution(institution);
            currentProfile.setDegreeType(degree);
            currentProfile.setFieldOfStudy(fieldOfStudy);
            currentProfile.setGradYear(gradYear);
            currentProfile.setGradMonth(gradMonth);
        } else {
            currentProfile.setInstitution("");
            currentProfile.setDegreeType("");
            currentProfile.setFieldOfStudy("");
            currentProfile.setGradYear(0);
            currentProfile.setGradMonth("");
        }

        currentProfile.setDietaryPreference(dietary);
        currentProfile.setAllergies(allergies);
        currentProfile.setGithubUrl(github);
        currentProfile.setLinkedinUrl(linkedin);
        currentProfile.setResumeUrl(resume);
        currentProfile.setSkills(skills);

        btnSave.setEnabled(false);
        btnSave.setText("Saving...");

        api.updateMyProfile(currentProfile).enqueue(new Callback<HackerProfile>() {
            @Override
            public void onResponse(Call<HackerProfile> call, Response<HackerProfile> response) {
                btnSave.setEnabled(true);
                btnSave.setText("Save");
                if (response.isSuccessful()) {
                    Toast.makeText(EditProfileActivity.this, "Profile saved successfully", Toast.LENGTH_SHORT).show();
                    finish();
                } else {
                    Toast.makeText(EditProfileActivity.this, "Failed to save profile", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<HackerProfile> call, Throwable t) {
                btnSave.setEnabled(true);
                btnSave.setText("Save");
                Toast.makeText(EditProfileActivity.this, "Network error", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
