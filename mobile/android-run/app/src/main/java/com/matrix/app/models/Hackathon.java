package com.matrix.app.models;

public class Hackathon {
    private String id;
    private String title;
    private String description;
    private String cover_image;
    private boolean is_approved;

    public String getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getCoverImage() {
        return cover_image;
    }

    public boolean isApproved() {
        return is_approved;
    }
}
