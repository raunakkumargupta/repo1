package com.matrix.app;

import com.matrix.app.models.ApplyHackathonRequest;
import com.matrix.app.models.CreateTicketRequest;
import com.matrix.app.models.DeviceTokenRequest;
import com.matrix.app.models.HackerProfile;
import com.matrix.app.models.Hackathon;
import com.matrix.app.models.InviteUserRequest;
import com.matrix.app.models.LoginRequest;
import com.matrix.app.models.LoginResponse;
import com.matrix.app.models.ManageRequestBody;
import com.matrix.app.models.Registration;
import com.matrix.app.models.RegisterRequest;
import com.matrix.app.models.SubmitProjectRequest;
import com.matrix.app.models.Team;
import com.matrix.app.models.TeamDetails;
import com.matrix.app.models.TeamInvitation;
import com.matrix.app.models.TeamJoinRequest;
import com.matrix.app.models.JoinTeamRequest;
import com.matrix.app.models.CreateTeamRequest;
import com.matrix.app.models.ApiUser;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface MatrixApi {

    // ---- Auth ----
    @POST("auth/login")
    Call<LoginResponse> login(@Body LoginRequest body);

    @POST("auth/register")
    Call<Object> register(@Body RegisterRequest body);

    @GET("auth/me")
    Call<ApiUser> getMe();

    // ---- Hackathons ----
    @GET("hackathons")
    Call<List<Hackathon>> listHackathons();

    @GET("hackathons")
    Call<List<Hackathon>> searchHackathons(
            @Query("limit") Integer limit,
            @Query("offset") Integer offset,
            @Query("search") String search);

    // ---- Registration ----
    @GET("hackathons/{id}/my-registration")
    Call<Registration> getMyRegistration(@Path("id") String hackathonId);

    @POST("hackathons/{id}/apply")
    Call<Void> applyHackathon(@Path("id") String hackathonId, @Body ApplyHackathonRequest body);

    // ---- Hacker Profile ----
    @GET("profile/me")
    Call<HackerProfile> getMyProfile();

    @POST("profile/me")
    Call<HackerProfile> updateMyProfile(@Body HackerProfile body);

    // ---- Teams ----
    @GET("hackathons/{id}/teams/public")
    Call<List<Team>> getPublicTeams(
            @Path("id") String hackathonId,
            @Query("limit") Integer limit,
            @Query("offset") Integer offset,
            @Query("search") String search);

    @GET("hackathons/{id}/my-team")
    Call<TeamDetails> getMyTeam(@Path("id") String hackathonId);

    @POST("hackathons/{id}/teams/join")
    Call<Team> joinTeam(@Path("id") String hackathonId, @Body JoinTeamRequest body);

    @POST("hackathons/{id}/teams")
    Call<Team> createTeam(@Path("id") String hackathonId, @Body CreateTeamRequest body);

    @PUT("hackathons/{id}/teams/submit")
    Call<Map<String, String>> submitProject(@Path("id") String hackathonId, @Body SubmitProjectRequest body);

    @DELETE("hackathons/{id}/teams/{team_id}/members/{member_id}")
    Call<Map<String, String>> removeMember(
            @Path("id") String hackathonId,
            @Path("team_id") String teamId,
            @Path("member_id") String memberId);

    // ---- Join Requests ----
    @POST("hackathons/{id}/teams/{team_id}/request")
    Call<Map<String, String>> requestToJoin(
            @Path("id") String hackathonId,
            @Path("team_id") String teamId);

    @DELETE("hackathons/{id}/requests/{req_id}")
    Call<Map<String, String>> withdrawRequest(
            @Path("id") String hackathonId,
            @Path("req_id") String reqId);

    @PUT("hackathons/{id}/requests/{req_id}")
    Call<Map<String, String>> manageRequest(
            @Path("id") String hackathonId,
            @Path("req_id") String reqId,
            @Body ManageRequestBody body);

    @GET("hackathons/{id}/teams/{team_id}/requests")
    Call<List<TeamJoinRequest>> getTeamRequests(
            @Path("id") String hackathonId,
            @Path("team_id") String teamId);

    @GET("hackathons/{id}/my-requests")
    Call<List<TeamJoinRequest>> getMyRequests(@Path("id") String hackathonId);

    // ---- Invitations ----
    @POST("hackathons/{id}/teams/{team_id}/invite")
    Call<Map<String, String>> inviteUser(
            @Path("id") String hackathonId,
            @Path("team_id") String teamId,
            @Body InviteUserRequest body);

    @PUT("hackathons/{id}/invitations/{inv_id}")
    Call<Map<String, String>> manageInvitation(
            @Path("id") String hackathonId,
            @Path("inv_id") String invId,
            @Body ManageRequestBody body);

    @GET("hackathons/{id}/my-invitations")
    Call<List<TeamInvitation>> getMyInvitations(@Path("id") String hackathonId);

    // ---- Mentor Tickets ----
    @POST("hackathons/{id}/tickets")
    Call<Void> createTicket(@Path("id") String hackathonId, @Body CreateTicketRequest body);

    // ---- Device Token (for push notifications) ----
    @POST("users/fcm-token")
    Call<Void> registerDeviceToken(@Body DeviceTokenRequest body);

    // ---- Notifications (polling) ----
    @GET("hackathons/{id}/broadcasts")
    Call<List<Map<String, Object>>> getBroadcasts(@Path("id") String hackathonId);

    // ---- Chatbot ----
    @POST("chatbot/query")
    Call<Map<String, String>> queryChatbot(@Body Map<String, String> body);
}
