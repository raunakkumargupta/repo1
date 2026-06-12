package com.matrix.app.notifications;

import android.content.Context;
import android.util.Log;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

/**
 * Schedules periodic notification checks using WorkManager.
 * This ensures notifications work even when the app is completely closed.
 * 
 * WorkManager minimum interval is 15 minutes, but for active app sessions
 * the NotificationPollingService provides faster 60-second polling.
 */
public class NotificationScheduler {

    private static final String TAG = "NotifScheduler";
    private static final String WORK_NAME = "matrix_notification_check";

    /**
     * Schedule periodic background checks (survives app kill).
     */
    public static void schedule(Context context) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
                NotificationWorker.class,
                15, TimeUnit.MINUTES) // Minimum allowed by WorkManager
                .setConstraints(constraints)
                .build();

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
        );

        Log.d(TAG, "Periodic notification work scheduled");
    }

    /**
     * Cancel scheduled notifications (e.g., on logout).
     */
    public static void cancel(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME);
        Log.d(TAG, "Periodic notification work cancelled");
    }
}
