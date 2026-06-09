package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5"
)

func main() {
	conn, err := pgx.Connect(context.Background(), "postgres://postgres:postgres@localhost:5433/hackathon?sslmode=disable")
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer conn.Close(context.Background())

	// Force migration state back to 8
	_, err = conn.Exec(context.Background(), "UPDATE schema_migrations SET version = 8, dirty = false")
	if err != nil {
		log.Fatalf("Failed to update schema_migrations: %v\n", err)
	}
	fmt.Println("Migration forced to version 8.")

	// Drop tables/columns that might have been partially created
	_, err = conn.Exec(context.Background(), "DROP TABLE IF EXISTS team_invitations CASCADE;")
	_, err = conn.Exec(context.Background(), "DROP TABLE IF EXISTS team_join_requests CASCADE;")
	_, err = conn.Exec(context.Background(), "ALTER TABLE teams DROP COLUMN IF EXISTS leader_id;")
	if err != nil {
		log.Fatalf("Failed to drop partially created schema: %v\n", err)
	}
	fmt.Println("Dropped partially created schema.")
}
