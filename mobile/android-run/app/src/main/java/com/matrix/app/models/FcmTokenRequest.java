package com.matrix.app.models;

public class FcmTokenRequest {
    private String token;
    private String platform;

    public FcmTokenRequest(String token) {
        this.token = token;
        this.platform = "android";
    }

    public String getToken() { return token; }
    public String getPlatform() { return platform; }
}
