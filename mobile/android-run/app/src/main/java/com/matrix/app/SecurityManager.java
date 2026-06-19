package com.matrix.app;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import java.io.IOException;
import java.security.GeneralSecurityException;

public class SecurityManager {
    private static final String PREF_NAME   = "matrix_secure_prefs";
    private static final String KEY_JWT     = "jwt_token";
    private static final String KEY_EMAIL   = "user_email";
    private static final String KEY_USER_ID = "user_id";  // backend UUID = CometChat UID
    private SharedPreferences sharedPreferences;

    public SecurityManager(Context context) {
        try {
            MasterKey masterKey = new MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();

            sharedPreferences = EncryptedSharedPreferences.create(
                    context,
                    PREF_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (GeneralSecurityException | IOException e) {
            e.printStackTrace();
        }
    }

    public void saveToken(String token) {
        if (sharedPreferences != null) {
            sharedPreferences.edit().putString(KEY_JWT, token).apply();
        }
    }

    public String getToken() {
        if (sharedPreferences != null) {
            return sharedPreferences.getString(KEY_JWT, null);
        }
        return null;
    }

    public void clearToken() {
        if (sharedPreferences != null) {
            sharedPreferences.edit().remove(KEY_JWT).apply();
        }
    }

    public void saveEmail(String email) {
        if (sharedPreferences != null) {
            sharedPreferences.edit().putString(KEY_EMAIL, email).apply();
        }
    }

    public String getEmail() {
        if (sharedPreferences != null) {
            return sharedPreferences.getString(KEY_EMAIL, null);
        }
        return null;
    }

    public void saveUserId(String userId) {
        if (sharedPreferences != null) {
            sharedPreferences.edit().putString(KEY_USER_ID, userId).apply();
        }
    }

    public String getUserId() {
        if (sharedPreferences != null) {
            return sharedPreferences.getString(KEY_USER_ID, null);
        }
        return null;
    }

    public void clearAll() {
        if (sharedPreferences != null) {
            sharedPreferences.edit().clear().apply();
        }
    }
}
