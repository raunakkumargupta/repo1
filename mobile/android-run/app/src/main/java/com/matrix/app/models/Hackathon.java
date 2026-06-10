package com.matrix.app.models;

public class Hackathon {
    private String id;
    private String title;
    private String description;
    private String cover_image;
    private String registration_status;
    private String start_date;
    private String end_date;
    private boolean is_approved;

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getCoverImage() { return cover_image; }
    public String getRegistrationStatus() { return registration_status != null ? registration_status : "open"; }
    public String getStartDate() { return start_date; }
    public String getEndDate() { return end_date; }
    public boolean isApproved() { return is_approved; }
}
