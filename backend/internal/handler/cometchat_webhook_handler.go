package handler

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

// CometChatWebhookHandler handles incoming webhook events from CometChat.
// Used for moderation logging, activity tracking, etc.
type CometChatWebhookHandler struct {
	pgRepo        *repository.PostgresRepo
	webhookSecret string
}

func NewCometChatWebhookHandler(pgRepo *repository.PostgresRepo) *CometChatWebhookHandler {
	return &CometChatWebhookHandler{
		pgRepo:        pgRepo,
		webhookSecret: os.Getenv("COMETCHAT_WEBHOOK_SECRET"),
	}
}

// ─── Webhook Event Structures ─────────────────────────────────────────────────

type CometChatWebhookEvent struct {
	Trigger   string          `json:"trigger"`
	Data      json.RawMessage `json:"data"`
	AppID     string          `json:"appId"`
	CreatedAt int64           `json:"createdAt"`
}

type CometChatMessageData struct {
	ID                string              `json:"id"`
	ConversationID    string              `json:"conversationId"`
	Sender            CometChatSenderData `json:"sender"`
	ReceiverType      string              `json:"receiverType"`
	Receiver          string              `json:"receiver"`
	Category          string              `json:"category"`
	Type              string              `json:"type"`
	Data              json.RawMessage     `json:"data"`
	SentAt            int64               `json:"sentAt"`
	Text              string              `json:"text"`
	ModerationResults *ModerationResult   `json:"moderationResults,omitempty"`
}

type CometChatSenderData struct {
	UID  string `json:"uid"`
	Name string `json:"name"`
}

type ModerationResult struct {
	IsFlagged bool   `json:"isFlagged"`
	Category  string `json:"category"`
	Reason    string `json:"reason"`
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// HandleWebhook is the main endpoint for all CometChat webhook events.
// POST /api/webhooks/cometchat
func (h *CometChatWebhookHandler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[CometChat Webhook] Failed to read body: %v", err)
		http.Error(w, "failed to read body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Verify HMAC-SHA256 signature if webhook secret is configured
	if h.webhookSecret != "" {
		signature := r.Header.Get("X-CometChat-Signature")
		if signature == "" {
			log.Printf("[CometChat Webhook] Missing X-CometChat-Signature header")
			http.Error(w, "missing signature", http.StatusUnauthorized)
			return
		}
		mac := hmac.New(sha256.New, []byte(h.webhookSecret))
		mac.Write(body)
		expectedSig := hex.EncodeToString(mac.Sum(nil))
		if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
			log.Printf("[CometChat Webhook] Invalid signature")
			http.Error(w, "invalid signature", http.StatusUnauthorized)
			return
		}
	}

	var event CometChatWebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		log.Printf("[CometChat Webhook] Failed to parse event: %v", err)
		http.Error(w, "invalid event payload", http.StatusBadRequest)
		return
	}

	log.Printf("[CometChat Webhook] Received trigger: %s at %d", event.Trigger, event.CreatedAt)

	switch event.Trigger {
	case "after_message_sent":
		h.handleMessageSent(event)
	case "message_edited":
		h.handleMessageEdited(event)
	case "after_message_moderated", "message_moderated":
		h.handleModeration(event)
	default:
		log.Printf("[CometChat Webhook] Unhandled trigger: %s", event.Trigger)
	}

	// Always respond 200 to CometChat
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "received"})
}

// handleMessageSent logs a message activity event to the database.
func (h *CometChatWebhookHandler) handleMessageSent(event CometChatWebhookEvent) {
	var msg CometChatMessageData
	if err := json.Unmarshal(event.Data, &msg); err != nil {
		log.Printf("[CometChat Webhook] Failed to parse message data: %v", err)
		return
	}

	log.Printf("[CometChat Webhook] Message sent by %s (%s) → %s [%s]",
		msg.Sender.Name, msg.Sender.UID, msg.Receiver, msg.ReceiverType)

	ctx := context.Background()
	_ = h.pgRepo.InsertModerationLog(ctx, repository.ModerationLogEntry{
		EventType:   "message_sent",
		SenderUID:   msg.Sender.UID,
		SenderName:  msg.Sender.Name,
		ReceiverID:  msg.Receiver,
		MessageType: msg.Type,
		MessageText: truncate(msg.Text, 200),
		IsFlagged:   false,
		CreatedAt:   time.Now(),
	})
}

// handleMessageEdited logs edit events to the database.
func (h *CometChatWebhookHandler) handleMessageEdited(event CometChatWebhookEvent) {
	var msg CometChatMessageData
	if err := json.Unmarshal(event.Data, &msg); err != nil {
		log.Printf("[CometChat Webhook] Failed to parse edited message data: %v", err)
		return
	}

	log.Printf("[CometChat Webhook] Message edited by %s (%s)", msg.Sender.Name, msg.Sender.UID)

	ctx := context.Background()
	_ = h.pgRepo.InsertModerationLog(ctx, repository.ModerationLogEntry{
		EventType:   "message_edited",
		SenderUID:   msg.Sender.UID,
		SenderName:  msg.Sender.Name,
		ReceiverID:  msg.Receiver,
		MessageType: msg.Type,
		MessageText: truncate(msg.Text, 200),
		IsFlagged:   false,
		CreatedAt:   time.Now(),
	})
}

// handleModeration logs moderation-flagged messages to the moderation_logs table.
// This is visible to SuperAdmin in the admin dashboard.
func (h *CometChatWebhookHandler) handleModeration(event CometChatWebhookEvent) {
	var msg CometChatMessageData
	if err := json.Unmarshal(event.Data, &msg); err != nil {
		log.Printf("[CometChat Webhook] Failed to parse moderation data: %v", err)
		return
	}

	flagReason := "content_moderation"
	flagCategory := "toxicity"
	if msg.ModerationResults != nil {
		flagReason = msg.ModerationResults.Reason
		flagCategory = msg.ModerationResults.Category
	}

	log.Printf("[CometChat Webhook] ⚠️ MODERATION FLAG: User %s (%s) — Category: %s, Reason: %s",
		msg.Sender.Name, msg.Sender.UID, flagCategory, flagReason)

	ctx := context.Background()
	_ = h.pgRepo.InsertModerationLog(ctx, repository.ModerationLogEntry{
		EventType:    "moderation_flag",
		SenderUID:    msg.Sender.UID,
		SenderName:   msg.Sender.Name,
		ReceiverID:   msg.Receiver,
		MessageType:  msg.Type,
		MessageText:  truncate(msg.Text, 200),
		IsFlagged:    true,
		FlagCategory: flagCategory,
		FlagReason:   flagReason,
		CreatedAt:    time.Now(),
	})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
