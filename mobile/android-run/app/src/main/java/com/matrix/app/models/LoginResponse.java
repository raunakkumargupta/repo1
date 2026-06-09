package com.matrix.app.models;

public class LoginResponse {
    private String token;
    private ApiUser user;

    public String getToken() {
        return token;
    }

    public ApiUser getUser() {
        return user;
    }
}
