package com.matrix.app.models;

public class TeamInvitation {
    private String id;
    private String team_id;
    private String invitee_id;
    private String status;
    private String team_name;

    public String getId() { return id; }
    public String getTeamId() { return team_id; }
    public String getInviteeId() { return invitee_id; }
    public String getStatus() { return status; }
    public String getTeamName() { return team_name; }
}
