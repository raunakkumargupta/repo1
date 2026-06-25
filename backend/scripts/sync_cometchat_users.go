package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/raunakkumargupta/repo1/backend/internal/service"
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

	ccService := service.NewCometChatService()

	// 1. Fetch essential test users to stay under CometChat's 100-user plan quota limit
	rows, err := dbpool.Query(ctx, "SELECT id, name, email, role FROM users WHERE email IN ('admin@matrix.com', 'organizer@matrix.com', 'mentor@matrix.com', 'judge@matrix.com', 'R@gmail.co', 'hacker1@matrix.com', 'hacker2@matrix.com', 'hacker3@matrix.com', 'hacker4@matrix.com', 'hacker5@matrix.com', 'warlord9004@gmail.com')")
	if err != nil {
		log.Fatalf("Failed to query users: %v\n", err)
	}
	defer rows.Close()

	type UserInfo struct {
		ID    string
		Name  string
		Email string
		Role  string
	}

	var users []UserInfo
	for rows.Next() {
		var u UserInfo
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role); err != nil {
			log.Fatalf("Failed to scan user: %v\n", err)
		}
		users = append(users, u)
	}

	fmt.Printf("Found %d users to sync to CometChat.\n", len(users))

	synced := 0
	failed := 0

	for _, u := range users {
		err := ccService.CreateUser(ctx, u.ID, u.Name, u.Role)
		if err != nil {
			fmt.Printf("  -> Failed to sync user %s (%s): %v\n", u.ID, u.Email, err)
			failed++
		} else {
			synced++
		}
	}

	fmt.Printf("Sync results: %d synced (or already exists), %d failed\n", synced, failed)
}
