package com.matrix.app;

import com.matrix.app.models.ApplyHackathonRequest;
import com.matrix.app.models.CreateTicketRequest;
import com.matrix.app.models.Hackathon;
import com.matrix.app.models.LoginRequest;
import com.matrix.app.models.LoginResponse;
import com.matrix.app.models.Registration;
import com.matrix.app.models.ApiUser;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Path;

public interface MatrixApi {
    @POST("auth/login")
    Call<LoginResponse> login(@Body LoginRequest body);

    @GET("auth/me")
    Call<ApiUser> getMe();

    @GET("hackathons")
    Call<List<Hackathon>> listHackathons();

    @GET("hackathons/{id}/my-registration")
    Call<Registration> getMyRegistration(@Path("id") String hackathonId);

    @POST("hackathons/{id}/apply")
    Call<Void> applyHackathon(@Path("id") String hackathonId, @Body ApplyHackathonRequest body);

    @POST("tickets")
    Call<Void> requestMentor(@Body CreateTicketRequest body);
}
