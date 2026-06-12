package com.matrix.app.models;

public class Hackathon {
    private String id;
    private String organizer_id;
    private String title;
    private String description;
    private String cover_image;
    private String tracks;
    private String registration_status;
    private String start_date;
    private String end_date;
    private boolean is_approved;
    private String problem_statement;
    private String prizes;
    private String schedule;
    private String sponsors;
    private int min_team_size;
    private int max_team_size;
    private String registration_fee;
    private String rounds;

    public String getId() { return id; }
    public String getOrganizerId() { return organizer_id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCoverImage() { return cover_image; }
    public String getTracks() { return tracks; }
    public String getRegistrationStatus() { return registration_status != null ? registration_status : "open"; }
    public String getStartDate() { return start_date; }
    public String getEndDate() { return end_date; }
    public boolean isApproved() { return is_approved; }
    public String getProblemStatement() { return problem_statement; }
    public String getPrizes() { return prizes; }
    public String getSchedule() { return schedule; }
    public String getSponsors() { return sponsors; }
    public int getMinTeamSize() { return min_team_size; }
    public int getMaxTeamSize() { return max_team_size; }
    public String getRegistrationFee() { return registration_fee; }
    public String getRounds() { return rounds; }
}
