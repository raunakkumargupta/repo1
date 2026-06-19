package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
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

	// Hash password "Raunak@123"
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("Raunak@123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to hash password: %v\n", err)
	}

	// Insert test user
	var userID string
	err = dbpool.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ('Raunak', 'R@gmail.co', $1, 'Hacker')
		ON CONFLICT (email) DO UPDATE SET name = 'Raunak', password_hash = $1, role = 'Hacker'
		RETURNING id`, string(hashedPassword)).Scan(&userID)
	if err != nil {
		log.Fatalf("Failed to insert test user: %v\n", err)
	}

	// Register them to all hackathons
	_, err = dbpool.Exec(ctx, `
		INSERT INTO registrations (user_id, hackathon_id, github_url, skills, team_preference, approval_status)
		SELECT $1, id, 'https://github.com/raunak', '["Swift", "Go", "FCM"]', 'Looking for Team', 'Accepted'
		FROM hackathons
		ON CONFLICT (user_id, hackathon_id) DO NOTHING`, userID)
	if err != nil {
		log.Fatalf("Failed to register test user to hackathons: %v\n", err)
	}

	fmt.Printf("Successfully seeded test user R@gmail.co (ID: %s) with password Raunak@123\n", userID)
}
