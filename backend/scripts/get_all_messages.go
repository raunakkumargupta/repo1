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

	// Fetch all users to map IDs to emails
	rows, err := dbpool.Query(ctx, "SELECT id, name, email FROM users")
	if err != nil {
		log.Fatalf("Failed to query database users: %v", err)
	}
	defer rows.Close()

	userMap := make(map[string]UserInfo)
	for rows.Next() {
		var u UserInfo
		if err := rows.Scan(&u.ID, &u.Name, &u.Email); err != nil {
			log.Fatalf("Failed to scan user: %v", err)
		}
		userMap[u.ID] = u
	}

	// Fetch messages from CometChat
	baseURL := fmt.Sprintf("https://%s.api-%s.cometchat.io/v3", appID, region)
	url := fmt.Sprintf("%s/messages?limit=100", baseURL)

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
		fmt.Println("No messages found in CometChat.")
		return
	}

	fmt.Printf("Total messages in CometChat response: %d\n", len(dataList))
	if len(dataList) > 0 {
		firstMsg := dataList[0].(map[string]interface{})
		lastMsg := dataList[len(dataList)-1].(map[string]interface{})
		firstTime := time.Unix(int64(firstMsg["sentAt"].(float64)), 0)
		lastTime := time.Unix(int64(lastMsg["sentAt"].(float64)), 0)
		fmt.Printf("Message list boundaries (API index 0 to len-1):\nIndex 0 Time: %s\nLast Index Time: %s\n\n", firstTime.Format("2006-01-02 15:04:05"), lastTime.Format("2006-01-02 15:04:05"))
	}

	fmt.Printf("=== ALL COMETCHAT MESSAGES (%d messages) ===\n", len(dataList))
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
				if customData, ok := dataMap["customData"].(map[string]interface{}); ok {
					customBytes, _ := json.Marshal(customData)
					text = fmt.Sprintf("[CustomData: %s]", string(customBytes))
				} else {
					dataBytes, _ := json.Marshal(dataMap)
					text = fmt.Sprintf("[DataMap: %s]", string(dataBytes))
				}
			}
		}

		t := time.Unix(int64(sentAtVal), 0)
		senderName := sender
		if u, exists := userMap[sender]; exists {
			senderName = fmt.Sprintf("%s (%s)", u.Name, u.Email)
		}

		receiverName := receiver
		if receiverType == "user" {
			if u, exists := userMap[receiver]; exists {
				receiverName = fmt.Sprintf("%s (%s)", u.Name, u.Email)
			}
		}

		fmt.Printf("[%s] %s -> %s (%s, %s/%s): %s\n", t.Format("2006-01-02 15:04:05"), senderName, receiverName, receiverType, category, msgType, text)
	}
}
