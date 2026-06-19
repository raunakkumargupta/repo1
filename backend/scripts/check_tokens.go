package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5433/hackathon?sslmode=disable"
	}

	ctx := context.Background()
	dbpool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()

	rows, err := dbpool.Query(ctx, "SELECT id, name, email, role, fcm_token, apns_token FROM users WHERE fcm_token IS NOT NULL OR apns_token IS NOT NULL")
	if err != nil {
		log.Fatalf("Query failed: %v\n", err)
	}
	defer rows.Close()

	fmt.Println("--- Users with Registered Push Tokens ---")
	count := 0
	for rows.Next() {
		var id, name, email, role string
		var fcm, apns *string
		if err := rows.Scan(&id, &name, &email, &role, &fcm, &apns); err != nil {
			log.Fatalf("Scan failed: %v\n", err)
		}
		count++
		fmt.Printf("User: %s (%s, Role: %s)\n", name, email, role)
		if fcm != nil {
			fmt.Printf("  -> FCM Token (Android): %s\n", *fcm)
		}
		if apns != nil {
			fmt.Printf("  -> APNs Token (iOS): %s\n", *apns)
		}
	}

	if count == 0 {
		fmt.Println("No tokens found in the database. Please log in or register a token from your device/simulator first!")
	}
}
