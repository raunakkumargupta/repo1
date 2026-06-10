package com.matrix.app;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

public abstract class BaseActivity extends AppCompatActivity {
    protected void navigateBack() {
        getOnBackPressedDispatcher().onBackPressed();
    }

    protected void setupToolbar(Toolbar toolbar, String title) {
        setSupportActionBar(toolbar);
        toolbar.setTitle(title);
        toolbar.setNavigationOnClickListener(v -> navigateBack());
    }

    protected String getScreenTitle() {
        return getClass().getSimpleName().replace("Activity", "");
    }
}