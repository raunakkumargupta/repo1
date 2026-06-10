package com.matrix.app.models;

public class RegisterRequest {
    private final String name;
    private final String email;
    private final String password;
    private final String role;

    public RegisterRequest(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = "Hacker";
    }
}
