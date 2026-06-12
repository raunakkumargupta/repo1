package com.matrix.app.utils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Strong password validation utility.
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character (@#$%^&+=!?_-)
 */
public class PasswordValidator {

    private static final int MIN_LENGTH = 8;
    private static final Pattern UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern DIGIT = Pattern.compile("[0-9]");
    private static final Pattern SPECIAL = Pattern.compile("[\\@\\#\\$\\%\\^\\&\\+\\=\\!\\?\\_\\-\\.\\*]");

    public static class ValidationResult {
        public final boolean isValid;
        public final List<String> errors;
        public final int strengthPercent; // 0-100

        public ValidationResult(boolean isValid, List<String> errors, int strengthPercent) {
            this.isValid = isValid;
            this.errors = errors;
            this.strengthPercent = strengthPercent;
        }
    }

    public static ValidationResult validate(String password) {
        List<String> errors = new ArrayList<>();
        int strength = 0;

        if (password == null || password.isEmpty()) {
            errors.add("Password is required");
            return new ValidationResult(false, errors, 0);
        }

        if (password.length() >= MIN_LENGTH) {
            strength += 20;
        } else {
            errors.add("At least 8 characters");
        }

        if (UPPERCASE.matcher(password).find()) {
            strength += 20;
        } else {
            errors.add("One uppercase letter (A-Z)");
        }

        if (LOWERCASE.matcher(password).find()) {
            strength += 20;
        } else {
            errors.add("One lowercase letter (a-z)");
        }

        if (DIGIT.matcher(password).find()) {
            strength += 20;
        } else {
            errors.add("One digit (0-9)");
        }

        if (SPECIAL.matcher(password).find()) {
            strength += 20;
        } else {
            errors.add("One special character (@#$%^&+=!?_-)");
        }

        return new ValidationResult(errors.isEmpty(), errors, strength);
    }

    /**
     * Returns a human-readable strength label.
     */
    public static String getStrengthLabel(int percent) {
        if (percent <= 20) return "Very Weak";
        if (percent <= 40) return "Weak";
        if (percent <= 60) return "Fair";
        if (percent <= 80) return "Strong";
        return "Very Strong";
    }

    /**
     * Returns a color resource hint for the strength bar.
     */
    public static int getStrengthColor(int percent) {
        if (percent <= 20) return 0xFFEF4444; // red
        if (percent <= 40) return 0xFFF97316; // orange
        if (percent <= 60) return 0xFFF59E0B; // amber
        if (percent <= 80) return 0xFF10B981; // green
        return 0xFF06D6A0; // bright green
    }
}
