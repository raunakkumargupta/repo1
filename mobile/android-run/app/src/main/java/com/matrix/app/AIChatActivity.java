package com.matrix.app;

import android.os.Bundle;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.button.MaterialButton;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

/**
 * AI Chatbot Activity powered by Groq API (llama-3.3-70b-versatile).
 * Opens from a floating button on the dashboard.
 */
public class AIChatActivity extends AppCompatActivity {

    private RecyclerView rvMessages;
    private EditText etMessage;
    private MaterialButton btnSend;
    private LinearLayout loadingIndicator;

    private List<ChatMsg> messages = new ArrayList<>();
    private ChatAdapter adapter;
    private MatrixApi api;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_ai_chat);

        rvMessages = findViewById(R.id.rv_messages);
        etMessage = findViewById(R.id.et_message);
        btnSend = findViewById(R.id.btn_send);
        loadingIndicator = findViewById(R.id.loading_indicator);

        api = ApiClient.getClient(new SecurityManager(this)).create(MatrixApi.class);

        adapter = new ChatAdapter(messages);
        rvMessages.setLayoutManager(new LinearLayoutManager(this));
        rvMessages.setAdapter(adapter);

        // Welcome message
        messages.add(new ChatMsg("assistant", "Hey! 👋 I'm Matrix AI Assistant. Ask me anything about the hackathon — schedules, coding help, team formation tips, or just chat!"));
        adapter.notifyItemInserted(0);

        findViewById(R.id.btn_back).setOnClickListener(v -> finish());

        btnSend.setOnClickListener(v -> sendMessage());

        etMessage.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                sendMessage();
                return true;
            }
            return false;
        });
    }

    private void sendMessage() {
        String text = etMessage.getText().toString().trim();
        if (text.isEmpty()) return;

        // Add user message
        messages.add(new ChatMsg("user", text));
        adapter.notifyItemInserted(messages.size() - 1);
        rvMessages.scrollToPosition(messages.size() - 1);
        etMessage.setText("");

        // Show loading
        loadingIndicator.setVisibility(View.VISIBLE);
        btnSend.setEnabled(false);

        callChatbotAPI(text);
    }

    private void callChatbotAPI(String userMessage) {
        java.util.Map<String, String> body = new java.util.HashMap<>();
        body.put("message", userMessage);

        api.queryChatbot(body).enqueue(new retrofit2.Callback<java.util.Map<String, String>>() {
            @Override
            public void onResponse(retrofit2.Call<java.util.Map<String, String>> call, retrofit2.Response<java.util.Map<String, String>> response) {
                loadingIndicator.setVisibility(View.GONE);
                btnSend.setEnabled(true);
                if (response.isSuccessful() && response.body() != null) {
                    String reply = response.body().get("response");
                    if (reply != null) {
                        addBotMessage(reply);
                        return;
                    }
                }
                addBotMessage("I'm having trouble processing that. Please try again.");
            }

            @Override
            public void onFailure(retrofit2.Call<java.util.Map<String, String>> call, Throwable t) {
                loadingIndicator.setVisibility(View.GONE);
                btnSend.setEnabled(true);
                addBotMessage("Network error. Check your connection and try again.");
            }
        });
    }

    private void addBotMessage(String text) {
        messages.add(new ChatMsg("assistant", text));
        adapter.notifyItemInserted(messages.size() - 1);
        rvMessages.scrollToPosition(messages.size() - 1);
    }

    // ─── Inner classes ────────────────────────────────────────

    static class ChatMsg {
        String role;
        String content;

        ChatMsg(String role, String content) {
            this.role = role;
            this.content = content;
        }
    }

    // ─── RecyclerView Adapter ─────────────────────────────────

    static class ChatAdapter extends RecyclerView.Adapter<ChatAdapter.VH> {
        private final List<ChatMsg> items;

        ChatAdapter(List<ChatMsg> items) {
            this.items = items;
        }

        @Override
        public int getItemCount() {
            return items.size();
        }

        @Override
        public VH onCreateViewHolder(android.view.ViewGroup parent, int viewType) {
            View v = android.view.LayoutInflater.from(parent.getContext())
                    .inflate(R.layout.item_chat_bubble, parent, false);
            return new VH(v);
        }

        @Override
        public void onBindViewHolder(VH holder, int position) {
            ChatMsg msg = items.get(position);
            holder.tvMessage.setText(msg.content);

            android.widget.FrameLayout.LayoutParams params =
                    (android.widget.FrameLayout.LayoutParams) holder.cardBubble.getLayoutParams();

            if ("user".equals(msg.role)) {
                params.gravity = android.view.Gravity.END;
                params.setMarginStart(dpToPx(60, holder.itemView));
                params.setMarginEnd(dpToPx(8, holder.itemView));
                holder.cardBubble.setCardBackgroundColor(
                        holder.itemView.getContext().getResources().getColor(R.color.primaryAccent, null));
                holder.tvMessage.setTextColor(
                        holder.itemView.getContext().getResources().getColor(R.color.onPrimary, null));
            } else {
                params.gravity = android.view.Gravity.START;
                params.setMarginStart(dpToPx(8, holder.itemView));
                params.setMarginEnd(dpToPx(60, holder.itemView));
                holder.cardBubble.setCardBackgroundColor(
                        holder.itemView.getContext().getResources().getColor(R.color.surface, null));
                holder.tvMessage.setTextColor(
                        holder.itemView.getContext().getResources().getColor(R.color.onPrimary, null));
            }
            holder.cardBubble.setLayoutParams(params);
        }

        private int dpToPx(int dp, View view) {
            return (int) (dp * view.getResources().getDisplayMetrics().density);
        }

        static class VH extends RecyclerView.ViewHolder {
            com.google.android.material.card.MaterialCardView cardBubble;
            android.widget.TextView tvMessage;

            VH(View v) {
                super(v);
                cardBubble = v.findViewById(R.id.card_bubble);
                tvMessage = v.findViewById(R.id.tv_message);
            }
        }
    }
}
