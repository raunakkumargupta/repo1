package com.matrix.app.models;

public class TeamJoinRequest {
    private String id;
    private String team_id;
    private String user_id;
    private String status;
    private String user_name;
    private String user_email;
    private String team_name;

    public String getId() { return id; }
    public String getTeamId() { return team_id; }
    public String getUserId() { return user_id; }
    public String getStatus() { return status; }
    public String getUserName() { return user_name; }
    public String getUserEmail() { return user_email; }
    public String getTeamName() { return team_name; }
}
