package com.matrix.app.models;

import java.util.List;

public class ApplyHackathonRequest {
    private String github_url;
    private String linkedin_url;
    private List<String> skills;
    private String team_preference;
    private String resume_url;

    public ApplyHackathonRequest(String githubUrl, String linkedinUrl, List<String> skills, String teamPreference, String resumeUrl) {
        this.github_url = githubUrl;
        this.linkedin_url = linkedinUrl;
        this.skills = skills;
        this.team_preference = teamPreference;
        this.resume_url = resumeUrl;
    }
}
