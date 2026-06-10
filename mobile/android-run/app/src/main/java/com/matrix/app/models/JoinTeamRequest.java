package com.matrix.app.models;

public class JoinTeamRequest {
    private String invite_code;

    public JoinTeamRequest(String inviteCode) {
        this.invite_code = inviteCode;
    }
}