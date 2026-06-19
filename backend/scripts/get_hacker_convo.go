package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

type UserInfo struct {
	ID    string
	Name  string
	Email string
}

type Message struct {
	ID       int64  `json:"id"`
	Sender   string `json:"sender"`
	Receiver string `json:"receiver"`
	Type     string `json:"type"`
	Category string `json:"category"`
	Data     struct {
		Text string `json:"text"`
	} `json:"data"`
	SentAt int64 `json:"sentAt"`
}

type MessagesResponse struct {
	Data []Message `json:"data"`
}

func main() {
	_ = godotenv.Load()
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5435/hackathon?sslmode=disable"
	}

	appID := os.Getenv("COMETCHAT_APP_ID")
	region := os.Getenv("COMETCHAT_REGION")
	apiKey := os.Getenv("COMETCHAT_API_KEY")

	if appID == "" || region == "" || apiKey == "" {
		log.Fatalf("CometChat credentials not found in env")
	}

	ctx := context.Background()
	dbpool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()

	// Query IDs for hacker3 and hacker1
	rows, err := dbpool.Query(ctx, "SELECT id, name, email FROM users WHERE email IN ('hacker3@matrix.com', 'hacker1@matrix.com')")
	if err != nil {
		log.Fatalf("Failed to query database users: %v", err)
	}
	defer rows.Close()

	var users []UserInfo
	for rows.Next() {
		var u UserInfo
		if err := rows.Scan(&u.ID, &u.Name, &u.Email); err != nil {
			log.Fatalf("Failed to scan user: %v", err)
		}
		users = append(users, u)
	}

	if len(users) < 2 {
		log.Fatalf("Could not find both hacker3 and hacker1 in the database. Found %d users.", len(users))
	}

	var hacker3, hacker1 UserInfo
	for _, u := range users {
		if u.Email == "hacker3@matrix.com" {
			hacker3 = u
		} else if u.Email == "hacker1@matrix.com" {
			hacker1 = u
		}
	}

	fmt.Printf("Resolved IDs:\n")
	fmt.Printf("Hacker 3 (%s): %s\n", hacker3.Email, hacker3.ID)
	fmt.Printf("Hacker 1 (%s): %s\n\n", hacker1.Email, hacker1.ID)

	// Fetch messages from CometChat
	baseURL := fmt.Sprintf("https://%s.api-%s.cometchat.io/v3", appID, region)
	url := fmt.Sprintf("%s/users/%s/messages?sender=%s&limit=100", baseURL, hacker3.ID, hacker1.ID)

	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		log.Fatalf("Failed to create HTTP request: %v", err)
	}
	req.Header.Set("apikey", apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalf("HTTP request failed: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read response body: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Failed to fetch messages (status %d): %s", resp.StatusCode, string(body))
	}

	// Print raw response for debugging
	fmt.Printf("Raw CometChat Response:\n%s\n\n", string(body))

	var msgResp map[string]interface{}
	if err := json.Unmarshal(body, &msgResp); err != nil {
		log.Fatalf("Failed to parse JSON response: %v", err)
	}

	dataVal, exists := msgResp["data"]
	if !exists {
		fmt.Println("No 'data' field in response.")
		return
	}

	dataList, ok := dataVal.([]interface{})
	if !ok || len(dataList) == 0 {
		fmt.Println("No messages found between Hacker 3 and Hacker 1.")
		return
	}

	fmt.Printf("=== CONVERSATION LOGS (Hacker 3 <-> Hacker 1) ===\n")
	for i := len(dataList) - 1; i >= 0; i-- {
		m, ok := dataList[i].(map[string]interface{})
		if !ok {
			continue
		}

		sender, _ := m["sender"].(string)
		receiver, _ := m["receiver"].(string)
		receiverType, _ := m["receiverType"].(string)
		sentAtVal, _ := m["sentAt"].(float64)
		category, _ := m["category"].(string)
		msgType, _ := m["type"].(string)
		
		var text string
		if dataMap, ok := m["data"].(map[string]interface{}); ok {
			text, _ = dataMap["text"].(string)
			if text == "" {
				// Try custom data or action if not text
				if customData, ok := dataMap["customData"].(map[string]interface{}); ok {
					customBytes, _ := json.Marshal(customData)
					text = fmt.Sprintf("[CustomData: %s]", string(customBytes))
				} else {
					// print whatever is inside dataMap
					dataBytes, _ := json.Marshal(dataMap)
					text = fmt.Sprintf("[DataMap: %s]", string(dataBytes))
				}
			}
		}

		t := time.Unix(int64(sentAtVal), 0)
		senderName := "Unknown"
		if sender == hacker1.ID {
			senderName = "Hacker 1"
		} else if sender == hacker3.ID {
			senderName = "Hacker 3"
		}

		receiverName := receiver
		if receiver == hacker1.ID {
			receiverName = "Hacker 1"
		} else if receiver == hacker3.ID {
			receiverName = "Hacker 3"
		}

		fmt.Printf("[%s] %s -> %s (%s, %s/%s): %s\n", t.Format("2006-01-02 15:04:05"), senderName, receiverName, receiverType, category, msgType, text)
	}
}
