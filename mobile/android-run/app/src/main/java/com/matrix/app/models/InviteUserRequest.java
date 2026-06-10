package com.matrix.app.models;

public class InviteUserRequest {
    private String email;

    public InviteUserRequest(String email) {
        this.email = email;
    }

    public String getEmail() { return email; }
}
