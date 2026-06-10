package com.matrix.app.models;

public class Team {
    private String id;
    private String hackathon_id;
    private String leader_id;
    private String team_name;
    private String invite_code;
    private String repository_url;
    private boolean is_submitted;
    private boolean is_winner;

    public String getId() { return id; }
    public String getHackathonId() { return hackathon_id; }
    public String getLeaderId() { return leader_id; }
    public String getTeamName() { return team_name; }
    public String getInviteCode() { return invite_code; }
    public String getRepositoryUrl() { return repository_url; }
    public boolean isSubmitted() { return is_submitted; }
    public boolean isWinner() { return is_winner; }
}