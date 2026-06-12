package com.matrix.app.notifications;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.matrix.app.ApiClient;
import com.matrix.app.MatrixApi;
import com.matrix.app.SecurityManager;
import com.matrix.app.models.Hackathon;
import com.matrix.app.models.Registration;
import com.matrix.app.models.TeamDetails;
import com.matrix.app.models.TeamInvitation;

import java.util.List;
import java.util.Map;

import retrofit2.Response;

/**
 * WorkManager-based periodic worker for checking notifications.
 * Runs every ~15 minutes even when app is killed.
 * Checks: new hackathons, application status changes, team invitations, announcements.
 */
public class NotificationWorker extends Worker {

    private static final String TAG = "NotifWorker";
    private static final String PREFS_NAME = "matrix_notif_prefs";
    private static final String KEY_LAST_HACKATHON_COUNT = "last_hackathon_count";
    private static final String KEY_LAST_REG_STATUS_PREFIX = "reg_status_";
    private static final String KEY_LAST_INVITE_COUNT_PREFIX = "invite_count_";
    private static final String KEY_LAST_BROADCAST_COUNT_PREFIX = "broadcast_count_";
    private static final String KEY_LAST_TEAM_MEMBER_COUNT_PREFIX = "team_member_count_";

    private int notifId = 2000;

    public NotificationWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        SecurityManager securityManager = new SecurityManager(context);

        String token = securityManager.getToken();
        if (token == null) {
            Log.d(TAG, "No auth token, skipping");
            return Result.success();
        }

        try {
            MatrixApi api = ApiClient.getClient(securityManager).create(MatrixApi.class);

            // 1. Check hackathons
            Response<List<Hackathon>> hackResponse = api.listHackathons().execute();
            if (hackResponse.isSuccessful() && hackResponse.body() != null) {
                List<Hackathon> hackathons = hackResponse.body();
                checkNewHackathons(context, hackathons);

                // 2-4. For each hackathon, check registrations, invites, broadcasts
                for (Hackathon h : hackathons) {
                    checkRegistrationStatus(context, api, h);
                    checkInvitations(context, api, h);
                    checkBroadcasts(context, api, h);
                    checkTeamMembers(context, api, h);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Worker failed: " + e.getMessage());
            return Result.retry();
        }

        return Result.success();
    }

    private void checkNewHackathons(Context context, List<Hackathon> hackathons) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int lastCount = prefs.getInt(KEY_LAST_HACKATHON_COUNT, -1);
        int currentCount = hackathons.size();

        if (lastCount == -1) {
            prefs.edit().putInt(KEY_LAST_HACKATHON_COUNT, currentCount).apply();
            return;
        }

        if (currentCount > lastCount) {
            int newOnes = currentCount - lastCount;
            fireNotification(context,
                    "New Hackathon" + (newOnes > 1 ? "s" : "") + " Available! 🚀",
                    newOnes + " new hackathon" + (newOnes > 1 ? "s" : "") + " just dropped. Tap to explore!");
        }

        prefs.edit().putInt(KEY_LAST_HACKATHON_COUNT, currentCount).apply();
    }

    private void checkRegistrationStatus(Context context, MatrixApi api, Hackathon hackathon) {
        try {
            Response<Registration> response = api.getMyRegistration(hackathon.getId()).execute();
            if (response.isSuccessful() && response.body() != null) {
                Registration reg = response.body();
                if (reg.getId() == null || reg.getApprovalStatus() == null) return;

                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String key = KEY_LAST_REG_STATUS_PREFIX + reg.getId();
                String lastStatus = prefs.getString(key, null);
                String currentStatus = reg.getApprovalStatus().toLowerCase();

                if (lastStatus == null) {
                    prefs.edit().putString(key, currentStatus).apply();
                    return;
                }

                if (!lastStatus.equals(currentStatus)) {
                    String title, body;
                    switch (currentStatus) {
                        case "accepted":
                            title = "Application Accepted! 🎉";
                            body = "You've been accepted to \"" + hackathon.getTitle() + "\"!";
                            break;
                        case "rejected":
                            title = "Application Update";
                            body = "Your application to \"" + hackathon.getTitle() + "\" was not accepted.";
                            break;
                        case "waitlisted":
                            title = "You're Waitlisted 📋";
                            body = "You're on the waitlist for \"" + hackathon.getTitle() + "\".";
                            break;
                        default:
                            title = "Application Status Updated";
                            body = "Status for \"" + hackathon.getTitle() + "\": " + currentStatus;
                            break;
                    }
                    fireNotification(context, title, body);
                    prefs.edit().putString(key, currentStatus).apply();
                }
            }
        } catch (Exception ignored) {}
    }

    private void checkInvitations(Context context, MatrixApi api, Hackathon hackathon) {
        try {
            Response<List<TeamInvitation>> response = api.getMyInvitations(hackathon.getId()).execute();
            if (response.isSuccessful() && response.body() != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String key = KEY_LAST_INVITE_COUNT_PREFIX + hackathon.getId();
                int lastCount = prefs.getInt(key, -1);
                int currentCount = response.body().size();

                if (lastCount == -1) {
                    prefs.edit().putInt(key, currentCount).apply();
                    return;
                }

                if (currentCount > lastCount) {
                    int newOnes = currentCount - lastCount;
                    fireNotification(context,
                            "Team Invitation! 🤝",
                            newOnes + " new invite" + (newOnes > 1 ? "s" : "") + " for \"" + hackathon.getTitle() + "\"");
                }
                prefs.edit().putInt(key, currentCount).apply();
            }
        } catch (Exception ignored) {}
    }

    private void checkBroadcasts(Context context, MatrixApi api, Hackathon hackathon) {
        try {
            Response<List<Map<String, Object>>> response = api.getBroadcasts(hackathon.getId()).execute();
            if (response.isSuccessful() && response.body() != null) {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String key = KEY_LAST_BROADCAST_COUNT_PREFIX + hackathon.getId();
                int lastCount = prefs.getInt(key, -1);
                int currentCount = response.body().size();

                if (lastCount == -1) {
                    prefs.edit().putInt(key, currentCount).apply();
                    return;
                }

                if (currentCount > lastCount) {
                    Map<String, Object> latest = response.body().get(0);
                    String message = latest.containsKey("message")
                            ? String.valueOf(latest.get("message"))
                            : "New announcement";
                    fireNotification(context, "📢 " + hackathon.getTitle(), message);
                }
                prefs.edit().putInt(key, currentCount).apply();
            }
        } catch (Exception ignored) {}
    }

    private void checkTeamMembers(Context context, MatrixApi api, Hackathon hackathon) {
        try {
            Response<TeamDetails> response = api.getMyTeam(hackathon.getId()).execute();
            if (!response.isSuccessful() || response.body() == null) return;

            TeamDetails details = response.body();
            if (details.getTeam() == null || details.getMembers() == null) return;

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String key = KEY_LAST_TEAM_MEMBER_COUNT_PREFIX + hackathon.getId();
            int lastCount = prefs.getInt(key, -1);
            int currentCount = details.getMembers().size();

            if (lastCount == -1) {
                prefs.edit().putInt(key, currentCount).apply();
                return;
            }

            if (currentCount > lastCount) {
                // Get the newest member's name
                com.matrix.app.models.ApiUser newest =
                        details.getMembers().get(details.getMembers().size() - 1);
                String newMemberName = newest.getName() != null ? newest.getName() : "Someone";

                fireNotification(context,
                        "New Teammate! 🙌",
                        newMemberName + " joined your team \""
                                + details.getTeam().getTeamName()
                                + "\" for " + hackathon.getTitle() + "!");
            }

            prefs.edit().putInt(key, currentCount).apply();
        } catch (Exception ignored) {}
    }

    private void fireNotification(Context context, String title, String body) {
        NotificationHelper helper = new NotificationHelper(context);
        helper.showNotification(title, body, notifId++);
        NotificationStore store = new NotificationStore(context);
        store.addNotification(new NotificationItem(title, body, System.currentTimeMillis()));
        Log.d(TAG, "Worker notification: " + title);
    }
}
