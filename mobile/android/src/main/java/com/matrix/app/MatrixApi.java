package com.matrix.app;

import com.google.gson.JsonObject;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

public interface MatrixApi {
    @POST("auth/login")
    Call<JsonObject> login(@Body JsonObject body);

    @POST("tickets")
    Call<JsonObject> requestMentor(@Body JsonObject body);
}
