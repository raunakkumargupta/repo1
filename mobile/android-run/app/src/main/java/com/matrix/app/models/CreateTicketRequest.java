package com.matrix.app.models;

public class CreateTicketRequest {
    private String team_id;
    private String description;

    public CreateTicketRequest(String teamId, String description) {
        this.team_id = teamId;
        this.description = description;
    }
}
