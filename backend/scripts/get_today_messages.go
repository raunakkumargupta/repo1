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

	// Cutoff for June 19, 2026 00:00:00 Local time (represented by unix timestamp around 1781893800 or dynamically using Go time)
	localLocation, _ := time.LoadLocation("Asia/Kolkata") // User local time is UTC+5:30
	now := time.Now().In(localLocation)
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, localLocation)
	cutoffTimestamp := todayStart.Unix()

	fmt.Printf("Cutoff timestamp for today (%s): %d\n", todayStart.Format("2006-01-02 15:04:05"), cutoffTimestamp)

	fmt.Printf("=== COMETCHAT MESSAGES SENT TODAY ===\n")
	count := 0
	for i := len(dataList) - 1; i >= 0; i-- {
		m, ok := dataList[i].(map[string]interface{})
		if !ok {
			continue
		}

		sentAtVal, _ := m["sentAt"].(float64)
		sentAtInt := int64(sentAtVal)
		
		if sentAtInt < cutoffTimestamp {
			continue
		}
		count++

		sender, _ := m["sender"].(string)
		receiver, _ := m["receiver"].(string)
		receiverType, _ := m["receiverType"].(string)
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

		t := time.Unix(sentAtInt, 0).In(localLocation)
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

	if count == 0 {
		fmt.Println("No messages sent today.")
	}
}
