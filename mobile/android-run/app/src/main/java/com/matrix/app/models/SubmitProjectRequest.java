package com.matrix.app.models;

public class SubmitProjectRequest {
    private String repository_url;

    public SubmitProjectRequest(String repository_url) {
        this.repository_url = repository_url;
    }

    public String getRepositoryUrl() { return repository_url; }
}
