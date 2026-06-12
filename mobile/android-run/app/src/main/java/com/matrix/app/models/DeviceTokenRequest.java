package com.matrix.app.models;

/**
 * Request body for registering a device token with the backend.
 * Can be used with any push notification service (or left unused if polling only).
 */
public class DeviceTokenRequest {
    private String token;
    private String platform;

    public DeviceTokenRequest(String token) {
        this.token = token;
        this.platform = "android";
    }

    public String getToken() { return token; }
    public String getPlatform() { return platform; }
}
