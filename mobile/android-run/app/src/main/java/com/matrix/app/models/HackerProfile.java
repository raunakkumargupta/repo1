package com.matrix.app.models;

public class HackerProfile {
    private String user_id;
    private String bio;
    private String readme_md;
    private String github_url;
    private String linkedin_url;
    private String resume_url;
    private String skills;
    private String city;
    private String phone_number;
    private String gender;
    private String tshirt_size;
    private String emergency_contact_name;
    private String emergency_contact_number;
    private boolean has_formal_education;
    private String degree_type;
    private String institution;
    private String field_of_study;
    private int grad_year;
    private String grad_month;
    private String dietary_preference;
    private String allergies;
    private String default_team_preference;
    private String industry;
    private int years_of_experience;
    private String mentor_expertise;

    // Getters
    public String getUserId() { return user_id; }
    public String getBio() { return bio; }
    public String getReadmeMd() { return readme_md; }
    public String getGithubUrl() { return github_url; }
    public String getLinkedinUrl() { return linkedin_url; }
    public String getResumeUrl() { return resume_url; }
    public String getSkills() { return skills; }
    public String getCity() { return city; }
    public String getPhoneNumber() { return phone_number; }
    public String getGender() { return gender; }
    public String getTshirtSize() { return tshirt_size; }
    public String getEmergencyContactName() { return emergency_contact_name; }
    public String getEmergencyContactNumber() { return emergency_contact_number; }
    public boolean isHasFormalEducation() { return has_formal_education; }
    public String getDegreeType() { return degree_type; }
    public String getInstitution() { return institution; }
    public String getFieldOfStudy() { return field_of_study; }
    public int getGradYear() { return grad_year; }
    public String getGradMonth() { return grad_month; }
    public String getDietaryPreference() { return dietary_preference; }
    public String getAllergies() { return allergies; }
    public String getDefaultTeamPreference() { return default_team_preference; }
    public String getIndustry() { return industry; }
    public int getYearsOfExperience() { return years_of_experience; }
    public String getMentorExpertise() { return mentor_expertise; }

    // Setters
    public void setBio(String bio) { this.bio = bio; }
    public void setGithubUrl(String github_url) { this.github_url = github_url; }
    public void setLinkedinUrl(String linkedin_url) { this.linkedin_url = linkedin_url; }
    public void setResumeUrl(String resume_url) { this.resume_url = resume_url; }
    public void setSkills(String skills) { this.skills = skills; }
    public void setCity(String city) { this.city = city; }
    public void setInstitution(String institution) { this.institution = institution; }
    public void setFieldOfStudy(String field_of_study) { this.field_of_study = field_of_study; }
    public void setGradYear(int grad_year) { this.grad_year = grad_year; }
    public void setHasFormalEducation(boolean has_formal_education) { this.has_formal_education = has_formal_education; }
    public void setUserId(String user_id) { this.user_id = user_id; }
    public void setReadmeMd(String readme_md) { this.readme_md = readme_md; }
    public void setPhoneNumber(String phone_number) { this.phone_number = phone_number; }
    public void setGender(String gender) { this.gender = gender; }
    public void setTshirtSize(String tshirt_size) { this.tshirt_size = tshirt_size; }
    public void setEmergencyContactName(String emergency_contact_name) { this.emergency_contact_name = emergency_contact_name; }
    public void setEmergencyContactNumber(String emergency_contact_number) { this.emergency_contact_number = emergency_contact_number; }
    public void setDegreeType(String degree_type) { this.degree_type = degree_type; }
    public void setGradMonth(String grad_month) { this.grad_month = grad_month; }
    public void setDietaryPreference(String dietary_preference) { this.dietary_preference = dietary_preference; }
    public void setAllergies(String allergies) { this.allergies = allergies; }
    public void setDefaultTeamPreference(String default_team_preference) { this.default_team_preference = default_team_preference; }
    public void setIndustry(String industry) { this.industry = industry; }
    public void setYearsOfExperience(int years_of_experience) { this.years_of_experience = years_of_experience; }
    public void setMentorExpertise(String mentor_expertise) { this.mentor_expertise = mentor_expertise; }

    public HackerProfile() {}
}
