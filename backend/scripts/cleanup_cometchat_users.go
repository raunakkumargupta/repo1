package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
)

type CometChatUser struct {
	UID  string `json:"uid"`
	Name string `json:"name"`
}

type CometChatUsersResponse struct {
	Data []CometChatUser `json:"data"`
}

func main() {
	_ = godotenv.Load()
	appID := os.Getenv("COMETCHAT_APP_ID")
	region := os.Getenv("COMETCHAT_REGION")
	apiKey := os.Getenv("COMETCHAT_API_KEY")

	if appID == "" || region == "" || apiKey == "" {
		log.Fatalf("CometChat credentials not found in env")
	}

	baseURL := fmt.Sprintf("https://%s.api-%s.cometchat.io/v3", appID, region)
	ctx := context.Background()

	// 1. Fetch users from CometChat
	req, err := http.NewRequestWithContext(ctx, "GET", baseURL+"/users?limit=100", nil)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("apikey", apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalf("HTTP request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		log.Fatalf("Failed to fetch users (status %d): %s", resp.StatusCode, string(body))
	}

	var usersResp CometChatUsersResponse
	if err := json.NewDecoder(resp.Body).Decode(&usersResp); err != nil {
		log.Fatalf("Failed to decode response: %v", err)
	}

	fmt.Printf("Found %d users registered in CometChat. Deleting them to reset quota...\n", len(usersResp.Data))

	deletedCount := 0
	for _, u := range usersResp.Data {
		delReq, err := http.NewRequestWithContext(ctx, "DELETE", baseURL+"/users/"+u.UID, nil)
		if err != nil {
			fmt.Printf("  -> Failed to build delete request for %s: %v\n", u.UID, err)
			continue
		}
		delReq.Header.Set("apikey", apiKey)
		delReq.Header.Set("Accept", "application/json")

		delResp, err := http.DefaultClient.Do(delReq)
		if err != nil {
			fmt.Printf("  -> Failed to delete user %s: %v\n", u.UID, err)
			continue
		}
		delResp.Body.Close()

		if delResp.StatusCode == http.StatusOK {
			fmt.Printf("  -> Deleted: %s (%s)\n", u.Name, u.UID)
			deletedCount++
		} else {
			body, _ := io.ReadAll(delResp.Body)
			fmt.Printf("  -> Failed to delete %s (status %d): %s\n", u.UID, delResp.StatusCode, string(body))
		}
	}

	fmt.Printf("Successfully deleted %d users from CometChat!\n", deletedCount)
}
