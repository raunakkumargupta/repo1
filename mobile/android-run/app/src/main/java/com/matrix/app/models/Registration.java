package com.matrix.app.models;

public class Registration {
    private String id;
    private String user_id;
    private String hackathon_id;
    private String github_url;
    private String linkedin_url;
    private String skills;
    private String team_preference;
    private String approval_status;

    public String getId() {
        return id;
    }

    public String getUserId() {
        return user_id;
    }

    public String getHackathonId() {
        return hackathon_id;
    }

    public String getGithubUrl() {
        return github_url;
    }

    public String getLinkedinUrl() {
        return linkedin_url;
    }

    public String getSkills() {
        return skills;
    }

    public String getTeamPreference() {
        return team_preference;
    }

    public String getApprovalStatus() {
        return approval_status;
    }
}
