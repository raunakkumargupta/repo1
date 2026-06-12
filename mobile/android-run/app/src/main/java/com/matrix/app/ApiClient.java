package com.matrix.app;

import android.content.Context;

import okhttp3.Dispatcher;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

public class ApiClient {
    // Deployed backend (HTTP) via Next.js proxy
    private static final String BASE_URL = "http://matrix.cometchat-staging.com/api/";
    private static Retrofit retrofit = null;
    private static SecurityManager appSecurityManager = null;

    /**
     * Get or create the Retrofit client.
     * The SecurityManager is stored statically so the interceptor always reads
     * the latest token regardless of which Activity created it.
     */
    public static Retrofit getClient(SecurityManager securityManager) {
        // Always update the static reference so token reads are fresh
        appSecurityManager = securityManager;

        if (retrofit == null) {
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(HttpLoggingInterceptor.Level.BASIC);

            // Allow more parallel requests per host to speed up dashboard loads
            Dispatcher dispatcher = new Dispatcher();
            dispatcher.setMaxRequests(20);
            dispatcher.setMaxRequestsPerHost(20);

            OkHttpClient client = new OkHttpClient.Builder()
                    .dispatcher(dispatcher)
                    .connectTimeout(15, TimeUnit.SECONDS)
                    .readTimeout(15, TimeUnit.SECONDS)
                    .writeTimeout(15, TimeUnit.SECONDS)
                    .addInterceptor(logging)
                    .addInterceptor(new Interceptor() {
                        @Override
                        public Response intercept(Chain chain) throws IOException {
                            Request original = chain.request();
                            // Always read from the static reference for fresh token
                            String token = appSecurityManager != null
                                    ? appSecurityManager.getToken() : null;

                            Request.Builder builder = original.newBuilder()
                                    .header("Content-Type", "application/json");

                            if (token != null) {
                                // Bearer header (for direct backend)
                                builder.header("Authorization", "Bearer " + token);
                                // Cookie (for Next.js proxy on deployed)
                                builder.header("Cookie", "jwt=" + token);
                            }

                            return chain.proceed(builder.build());
                        }
                    })
                    .build();

            retrofit = new Retrofit.Builder()
                    .baseUrl(BASE_URL)
                    .client(client)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build();
        }
        return retrofit;
    }

    /**
     * Reset everything on logout.
     */
    public static void reset() {
        retrofit = null;
        appSecurityManager = null;
    }
}
