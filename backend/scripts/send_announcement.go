package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"google.golang.org/api/option"
)

func main() {
	_ = godotenv.Load()
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5435/hackathon?sslmode=disable"
	}

	ctx := context.Background()
	dbpool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()

	// 1. Get first hackathon ID
	var hackathonID string
	err = dbpool.QueryRow(ctx, "SELECT id FROM hackathons LIMIT 1").Scan(&hackathonID)
	if err != nil {
		log.Fatalf("No hackathons found in database: %v\n", err)
	}
	fmt.Printf("Target Hackathon ID: %s\n", hackathonID)

	// 2. Fetch all users who have fcm_token or apns_token
	rows, err := dbpool.Query(ctx, "SELECT id, name, fcm_token, apns_token FROM users WHERE fcm_token IS NOT NULL OR apns_token IS NOT NULL")
	if err != nil {
		log.Fatalf("Failed to query users: %v\n", err)
	}
	defer rows.Close()

	var tokens []string
	var userIDs []string
	for rows.Next() {
		var id, name string
		var fcm, apns *string
		if err := rows.Scan(&id, &name, &fcm, &apns); err != nil {
			log.Fatalf("Scan failed: %v\n", err)
		}
		userIDs = append(userIDs, id)
		if fcm != nil && *fcm != "" {
			tokens = append(tokens, *fcm)
		}
		if apns != nil && *apns != "" {
			tokens = append(tokens, *apns)
		}
	}

	if len(tokens) == 0 {
		log.Fatalf("No registered push tokens found in database. Run the app on your device/simulator and login to register a token.")
	}

	fmt.Printf("Found %d tokens to notify.\n", len(tokens))

	// 3. Register these users to the hackathon (if not already registered) so they are linked
	for _, userID := range userIDs {
		_, err = dbpool.Exec(ctx, `
			INSERT INTO registrations (user_id, hackathon_id, approval_status)
			VALUES ($1, $2, 'Accepted')
			ON CONFLICT (user_id, hackathon_id) DO NOTHING`, userID, hackathonID)
		if err != nil {
			log.Printf("Warning: failed to register user %s to hackathon %s: %v\n", userID, hackathonID, err)
		}
	}

	// 4. Create the announcement record in the database
	messageText := fmt.Sprintf("Global Announcement Test at %s!", time.Now().Format("15:04:05"))
	var annID string
	err = dbpool.QueryRow(ctx, "INSERT INTO announcements (hackathon_id, message) VALUES ($1, $2) RETURNING id", hackathonID, messageText).Scan(&annID)
	if err != nil {
		log.Fatalf("Failed to create announcement record: %v\n", err)
	}
	fmt.Printf("Announcement created in DB with ID: %s\n", annID)

	// 5. Initialize Firebase App using the service account JSON file
	saPath := os.Getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
	if saPath == "" {
		saPath = "../firebase-service-account.json"
	}
	fmt.Printf("Using Firebase service account file: %s\n", saPath)
	opt := option.WithCredentialsFile(saPath)
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		log.Fatalf("Error initializing Firebase App: %v\n", err)
	}

	client, err := app.Messaging(ctx)
	if err != nil {
		log.Fatalf("Error getting Messaging client: %v\n", err)
	}

	// 6. Send the multicast message
	msg := &messaging.MulticastMessage{
		Tokens: tokens,
		Notification: &messaging.Notification{
			Title: "New Announcement!",
			Body:  messageText,
		},
		Data: map[string]string{
			"title": "New Announcement!",
			"body":  messageText,
		},
		APNS: &messaging.APNSConfig{
			Headers: map[string]string{
				"apns-priority": "10",
			},
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Alert: &messaging.ApsAlert{
						Title: "New Announcement!",
						Body:  messageText,
					},
					Sound: "default",
					Badge: intPtr(1),
				},
			},
		},
	}

	br, err := client.SendEachForMulticast(ctx, msg)
	if err != nil {
		log.Fatalf("Error sending multicast message: %v\n", err)
	}

	fmt.Printf("Broadcast result: success count = %d, failure count = %d\n", br.SuccessCount, br.FailureCount)
	for idx, resp := range br.Responses {
		if !resp.Success {
			fmt.Printf("  -> Token[%d] failed: %v\n", idx, resp.Error)
		} else {
			fmt.Printf("  -> Token[%d] success: Message ID = %s\n", idx, resp.MessageID)
		}
	}
}

func intPtr(i int) *int {
	return &i
}
