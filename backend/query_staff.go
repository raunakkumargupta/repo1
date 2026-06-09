package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	pool, err := pgxpool.New(context.Background(), "postgres://postgres:postgres@localhost:5433/hackathon?sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	rows, err := pool.Query(context.Background(), "SELECT id, email, role FROM users WHERE email = 'raunak.gupta@somaiya.edu'")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var id, email, role string
		rows.Scan(&id, &email, &role)
		fmt.Printf("ID: %s, Email: %s, Role: %s\n", id, email, role)
	}
	fmt.Println("Done.")
}
