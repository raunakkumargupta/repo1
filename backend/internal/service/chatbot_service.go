package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

// ChatbotService handles AI-powered chatbot responses using Groq API
type ChatbotService struct {
	groqAPIKey string
	botUID     string
	ccService  *CometChatService
}

func NewChatbotService() *ChatbotService {
	return &ChatbotService{
		groqAPIKey: os.Getenv("GROQ_API_KEY"),
		botUID:     os.Getenv("CHATBOT_UID"),
		ccService:  NewCometChatService(),
	}
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqRequest struct {
	Model    string        `json:"model"`
	Messages []groqMessage `json:"messages"`
}

type groqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// GetBotUID returns the chatbot's CometChat UID
func (s *ChatbotService) GetBotUID() string {
	if s.botUID == "" {
		return "matrix-ai-assistant"
	}
	return s.botUID
}

// GenerateResponse calls Groq API with the user's message and returns AI response
func (s *ChatbotService) GenerateResponse(ctx context.Context, userMessage string) (string, error) {
	if s.groqAPIKey == "" {
		return "I'm currently offline. Please try again later.", nil
	}

	reqBody := groqRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []groqMessage{
			{
				Role: "system",
				Content: `You are Matrix AI Assistant, a helpful chatbot for the Matrix Hackathon Platform. 
You help hackers with:
- Hackathon questions (schedules, rules, submissions)
- Technical support (coding help, debugging tips)
- Team formation advice
- General platform navigation

Keep responses concise (2-3 sentences max). Be friendly and encouraging.
If asked about something outside the hackathon context, politely redirect.`,
			},
			{
				Role:    "user",
				Content: userMessage,
			},
		},
	}

	body, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create groq request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.groqAPIKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("groq API call failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		log.Printf("[Chatbot] Groq API error (%d): %s", resp.StatusCode, string(respBody))
		return "I'm having trouble thinking right now. Please try again in a moment.", nil
	}

	var groqResp groqResponse
	if err := json.Unmarshal(respBody, &groqResp); err != nil {
		return "", fmt.Errorf("failed to parse groq response: %w", err)
	}

	if len(groqResp.Choices) == 0 {
		return "I couldn't generate a response. Please try rephrasing.", nil
	}

	return groqResp.Choices[0].Message.Content, nil
}

// SendBotMessage sends a message from the bot user via CometChat REST API
func (s *ChatbotService) SendBotMessage(ctx context.Context, receiverUID, message string) error {
	ccService := NewCometChatService()

	payload := map[string]interface{}{
		"receiver":     receiverUID,
		"receiverType": "user",
		"category":     "message",
		"type":         "text",
		"data": map[string]interface{}{
			"text": message,
		},
	}

	body, _ := json.Marshal(payload)

	// Send message on behalf of the bot user
	apiKey := os.Getenv("COMETCHAT_API_KEY")
	baseURL := fmt.Sprintf("https://%s.api-%s.cometchat.io/v3", os.Getenv("COMETCHAT_APP_ID"), os.Getenv("COMETCHAT_REGION"))

	req, err := http.NewRequestWithContext(ctx, "POST", baseURL+"/messages", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("chatbot: failed to build send-message request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", apiKey)
	req.Header.Set("onBehalfOf", s.GetBotUID())
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("chatbot: send-message HTTP error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("chatbot: send-message failed (%d): %s", resp.StatusCode, string(respBody))
	}

	log.Printf("[Chatbot] Sent reply to %s: %s", receiverUID, message[:min(len(message), 50)])
	_ = ccService // suppress unused
	return nil
}

// EnsureBotUserExists creates the bot user in CometChat if it doesn't exist
func (s *ChatbotService) EnsureBotUserExists(ctx context.Context) error {
	ccService := NewCometChatService()
	return ccService.CreateUser(ctx, s.GetBotUID(), "Matrix AI Assistant", "bot")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
