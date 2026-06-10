package com.matrix.app.models;

public class ManageRequestBody {
    private String status;

    public ManageRequestBody(String status) {
        this.status = status;
    }

    public String getStatus() { return status; }
}
