package com.matrix.app.models;

import java.util.List;

public class TeamDetails {
    private Team team;
    private List<ApiUser> members;

    public Team getTeam() { return team; }
    public List<ApiUser> getMembers() { return members; }
}
