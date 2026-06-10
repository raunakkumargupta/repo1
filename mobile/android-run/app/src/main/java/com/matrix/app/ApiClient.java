package com.matrix.app;

import okhttp3.Interceptor;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

import java.io.IOException;

public class ApiClient {
    // 192.168.29.115 is the host machine's LAN IP reachable by the physical device
    private static final String BASE_URL = "http://192.168.29.115:8080/api/";
    private static Retrofit retrofit = null;

    public static Retrofit getClient(SecurityManager securityManager) {
        if (retrofit == null) {
            HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
            logging.setLevel(HttpLoggingInterceptor.Level.BODY);

            OkHttpClient client = new OkHttpClient.Builder()
                    .addInterceptor(logging)
                    .addInterceptor(new Interceptor() {
                        @Override
                        public Response intercept(Chain chain) throws IOException {
                            Request original = chain.request();
                            String token = securityManager.getToken();
                            
                            Request.Builder builder = original.newBuilder()
                                    .header("Content-Type", "application/json");
                            
                            if (token != null) {
                                builder.header("Authorization", "Bearer " + token);
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
}
