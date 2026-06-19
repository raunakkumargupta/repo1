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

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	rows, err := pool.Query(context.Background(), "SELECT id, email, role, fcm_token, apns_token FROM users WHERE email = 'R@gmail.co'")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id, email, role string
		var fcm, apns *string
		rows.Scan(&id, &email, &role, &fcm, &apns)
		fmt.Printf("ID: %s, Email: %s, Role: %s\n", id, email, role)
		if fcm != nil {
			fmt.Printf("  FCM: %s\n", *fcm)
		} else {
			fmt.Println("  FCM: nil")
		}
		if apns != nil {
			fmt.Printf("  APNs: %s\n", *apns)
		} else {
			fmt.Println("  APNs: nil")
		}
	}
	fmt.Println("Done.")
}
