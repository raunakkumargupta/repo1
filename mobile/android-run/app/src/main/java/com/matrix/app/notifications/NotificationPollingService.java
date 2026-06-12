package com.matrix.app.notifications;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;

import com.matrix.app.ApiClient;
import com.matrix.app.MatrixApi;
import com.matrix.app.SecurityManager;
import com.matrix.app.models.Hackathon;
import com.matrix.app.models.Registration;
import com.matrix.app.models.TeamDetails;
import com.matrix.app.models.TeamInvitation;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Background polling service for in-app notifications.
 *
 * Strategy (efficient):
 * - Poll every 2 minutes (not 30s) to be respectful of network/battery
 * - Only check hackathons the user has actually registered for (typically 0-3),
 *   not all hackathons in the system
 * - Use a 2-step fetch: first get list, then check only first 3 for registrations
 *   to find what user is registered in, cache those IDs for subsequent polls
 */
public class NotificationPollingService extends Service {

    private static final String TAG = "NotifPolling";
    private static final long POLL_INTERVAL_MS = 120_000; // 2 minutes
    private static final String PREFS_NAME = "matrix_notif_prefs";
    private static final String KEY_LAST_HACKATHON_COUNT = "last_hackathon_count";
    private static final String KEY_LAST_REG_STATUS_PREFIX = "reg_status_";
    private static final String KEY_LAST_INVITE_COUNT_PREFIX = "invite_count_";
    private static final String KEY_LAST_BROADCAST_COUNT_PREFIX = "broadcast_count_";
    private static final String KEY_LAST_TEAM_MEMBER_COUNT_PREFIX = "team_member_count_";

    // Limit how many hackathons we check per poll
    private static final int MAX_HACKATHONS_TO_CHECK = 3;

    private Handler handler;
    private Runnable pollRunnable;
    private NotificationHelper notificationHelper;
    private SecurityManager securityManager;
    private int notifId = 1000;

    @Override
    public void onCreate() {
        super.onCreate();
        handler = new Handler(Looper.getMainLooper());
        notificationHelper = new NotificationHelper(this);
        securityManager = new SecurityManager(this);

        pollRunnable = new Runnable() {
            @Override
            public void run() {
                pollForUpdates();
                handler.postDelayed(this, POLL_INTERVAL_MS);
            }
        };
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (securityManager.getToken() == null) {
            stopSelf();
            return START_NOT_STICKY;
        }
        Log.d(TAG, "Starting polling (every " + (POLL_INTERVAL_MS / 1000) + "s)");
        handler.removeCallbacks(pollRunnable);
        handler.post(pollRunnable);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        handler.removeCallbacks(pollRunnable);
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }

    private void pollForUpdates() {
        if (securityManager.getToken() == null) {
            stopSelf();
            return;
        }

        MatrixApi api = ApiClient.getClient(securityManager).create(MatrixApi.class);

        api.listHackathons().enqueue(new Callback<List<Hackathon>>() {
            @Override
            public void onResponse(Call<List<Hackathon>> call, Response<List<Hackathon>> response) {
                if (!response.isSuccessful() || response.body() == null) return;

                List<Hackathon> all = response.body();
                checkForNewHackathons(all);

                // Only check first N hackathons to find registrations (avoid 45+ calls)
                int limit = Math.min(MAX_HACKATHONS_TO_CHECK, all.size());
                List<Hackathon> toCheck = all.subList(0, limit);

                for (Hackathon h : toCheck) {
                    checkRegistrationStatus(api, h);
                }

                // Find hackathons user is actually registered in (from cached statuses)
                // and only poll team/invitations for those
                List<Hackathon> registered = getCachedRegisteredHackathons(all);
                for (Hackathon h : registered) {
                    checkInvitations(api, h);
                    checkBroadcasts(api, h);
                    checkTeamMembers(api, h);
                }
            }

            @Override
            public void onFailure(Call<List<Hackathon>> call, Throwable t) {
                Log.w(TAG, "Poll failed: " + t.getMessage());
            }
        });
    }

    private List<Hackathon> getCachedRegisteredHackathons(List<Hackathon> all) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        List<Hackathon> result = new ArrayList<>();
        for (Hackathon h : all) {
            // Look up cached status for any registration on this hackathon
            // (we use hackathon id as part of key indirectly via registration id,
            // so we use a simpler "registered" flag stored separately)
            String regKey = "registered_in_" + h.getId();
            if (prefs.getBoolean(regKey, false)) {
                result.add(h);
            }
        }
        return result;
    }

    // ─── 1. New Hackathons ──────────────────────────────────────────────────────

    private void checkForNewHackathons(List<Hackathon> hackathons) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int lastCount = prefs.getInt(KEY_LAST_HACKATHON_COUNT, -1);
        int currentCount = hackathons.size();

        if (lastCount == -1) {
            prefs.edit().putInt(KEY_LAST_HACKATHON_COUNT, currentCount).apply();
            return;
        }

        if (currentCount > lastCount) {
            int newOnes = currentCount - lastCount;
            fireNotification("New Hackathon" + (newOnes > 1 ? "s" : "") + " Available! 🚀",
                    newOnes + " new hackathon" + (newOnes > 1 ? "s" : "") + " just dropped!");
        }
        prefs.edit().putInt(KEY_LAST_HACKATHON_COUNT, currentCount).apply();
    }

    // ─── 2. Registration Status ─────────────────────────────────────────────────

    private void checkRegistrationStatus(MatrixApi api, Hackathon hackathon) {
        api.getMyRegistration(hackathon.getId()).enqueue(new Callback<Registration>() {
            @Override
            public void onResponse(Call<Registration> call, Response<Registration> response) {
                if (!response.isSuccessful() || response.body() == null) return;
                Registration reg = response.body();
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

                // Mark this hackathon as one user is registered in (for future polls)
                if (reg.getId() != null) {
                    prefs.edit().putBoolean("registered_in_" + hackathon.getId(), true).apply();
                } else {
                    return; // not registered, skip
                }

                if (reg.getApprovalStatus() == null) return;

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
                            title = "You're on the Waitlist 📋";
                            body = "You're waitlisted for \"" + hackathon.getTitle() + "\".";
                            break;
                        default:
                            title = "Application Status Updated";
                            body = "Status for \"" + hackathon.getTitle() + "\": " + currentStatus;
                            break;
                    }
                    fireNotification(title, body);
                    prefs.edit().putString(key, currentStatus).apply();
                }
            }

            @Override
            public void onFailure(Call<Registration> call, Throwable t) {}
        });
    }

    // ─── 3. Team Invitations ────────────────────────────────────────────────────

    private void checkInvitations(MatrixApi api, Hackathon hackathon) {
        api.getMyInvitations(hackathon.getId()).enqueue(new Callback<List<TeamInvitation>>() {
            @Override
            public void onResponse(Call<List<TeamInvitation>> call, Response<List<TeamInvitation>> response) {
                if (!response.isSuccessful() || response.body() == null) return;
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String key = KEY_LAST_INVITE_COUNT_PREFIX + hackathon.getId();
                int lastCount = prefs.getInt(key, -1);
                int currentCount = response.body().size();

                if (lastCount == -1) {
                    prefs.edit().putInt(key, currentCount).apply();
                    return;
                }
                if (currentCount > lastCount) {
                    int newOnes = currentCount - lastCount;
                    fireNotification("Team Invitation! 🤝",
                            newOnes + " new invite" + (newOnes > 1 ? "s" : "") + " for \"" + hackathon.getTitle() + "\"");
                }
                prefs.edit().putInt(key, currentCount).apply();
            }
            @Override
            public void onFailure(Call<List<TeamInvitation>> call, Throwable t) {}
        });
    }

    // ─── 4. Broadcasts ──────────────────────────────────────────────────────────

    private void checkBroadcasts(MatrixApi api, Hackathon hackathon) {
        api.getBroadcasts(hackathon.getId()).enqueue(new Callback<List<Map<String, Object>>>() {
            @Override
            public void onResponse(Call<List<Map<String, Object>>> call, Response<List<Map<String, Object>>> response) {
                if (!response.isSuccessful() || response.body() == null) return;
                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
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
                            ? String.valueOf(latest.get("message")) : "New announcement";
                    fireNotification("📢 " + hackathon.getTitle(), message);
                }
                prefs.edit().putInt(key, currentCount).apply();
            }
            @Override
            public void onFailure(Call<List<Map<String, Object>>> call, Throwable t) {}
        });
    }

    // ─── 5. Team Members ────────────────────────────────────────────────────────

    private void checkTeamMembers(MatrixApi api, Hackathon hackathon) {
        api.getMyTeam(hackathon.getId()).enqueue(new Callback<TeamDetails>() {
            @Override
            public void onResponse(Call<TeamDetails> call, Response<TeamDetails> response) {
                if (!response.isSuccessful() || response.body() == null) return;
                TeamDetails details = response.body();
                if (details.getTeam() == null || details.getMembers() == null) return;

                SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String key = KEY_LAST_TEAM_MEMBER_COUNT_PREFIX + hackathon.getId();
                int lastCount = prefs.getInt(key, -1);
                int currentCount = details.getMembers().size();

                if (lastCount == -1) {
                    prefs.edit().putInt(key, currentCount).apply();
                    return;
                }
                if (currentCount > lastCount) {
                    com.matrix.app.models.ApiUser newest =
                            details.getMembers().get(details.getMembers().size() - 1);
                    String name = newest.getName() != null ? newest.getName() : "Someone";
                    fireNotification("New Teammate! 🙌",
                            name + " joined your team \"" + details.getTeam().getTeamName()
                                    + "\" for " + hackathon.getTitle() + "!");
                }
                prefs.edit().putInt(key, currentCount).apply();
            }
            @Override
            public void onFailure(Call<TeamDetails> call, Throwable t) {}
        });
    }

    // ─── Helper ─────────────────────────────────────────────────────────────────

    private void fireNotification(String title, String body) {
        notificationHelper.showNotification(title, body, notifId++);
        NotificationStore store = new NotificationStore(this);
        store.addNotification(new NotificationItem(title, body, System.currentTimeMillis()));
        Log.d(TAG, "Notification: " + title);
    }

    public static void start(Context context) {
        context.startService(new Intent(context, NotificationPollingService.class));
    }

    public static void stop(Context context) {
        context.stopService(new Intent(context, NotificationPollingService.class));
    }
}
