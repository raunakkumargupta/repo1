package com.matrix.app.utils;

import android.util.Patterns;

/**
 * Email validation utility with proper format checking.
 */
public class EmailValidator {

    public static boolean isValid(String email) {
        if (email == null || email.trim().isEmpty()) {
            return false;
        }
        String trimmed = email.trim();
        // Use Android's built-in email pattern + additional length check
        if (!Patterns.EMAIL_ADDRESS.matcher(trimmed).matches()) {
            return false;
        }
        // Ensure reasonable length
        if (trimmed.length() > 254) {
            return false;
        }
        // Ensure domain has at least one dot
        String domain = trimmed.substring(trimmed.indexOf('@') + 1);
        return domain.contains(".");
    }

    public static String getError(String email) {
        if (email == null || email.trim().isEmpty()) {
            return "Email is required";
        }
        if (!Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches()) {
            return "Enter a valid email address";
        }
        if (email.trim().length() > 254) {
            return "Email is too long";
        }
        String domain = email.trim().substring(email.trim().indexOf('@') + 1);
        if (!domain.contains(".")) {
            return "Email domain is invalid";
        }
        return null; // no error
    }
}
