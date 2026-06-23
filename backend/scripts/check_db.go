package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5"
)

func main() {
	// Try local ports 5435 (Docker host mapping), 5433, and 5432
	urls := []string{
		"postgres://postgres:postgres@localhost:5435/hackathon?sslmode=disable",
		"postgres://postgres:postgres@localhost:5433/hackathon?sslmode=disable",
		"postgres://postgres:postgres@localhost:5432/hackathon?sslmode=disable",
	}

	var conn *pgx.Conn
	var err error
	var connectedURL string

	for _, url := range urls {
		fmt.Printf("Trying to connect to %s...\n", url)
		conn, err = pgx.Connect(context.Background(), url)
		if err == nil {
			err = conn.Ping(context.Background())
			if err == nil {
				connectedURL = url
				break
			}
			conn.Close(context.Background())
		}
	}

	if err != nil {
		log.Fatalf("Could not connect to any postgres URL: %v", err)
	}
	defer conn.Close(context.Background())
	fmt.Printf("Connected successfully to %s\n", connectedURL)

	// 1. Query hackathons
	fmt.Println("\n--- HACKATHONS ---")
	rows, err := conn.Query(context.Background(), "SELECT id, title, start_date FROM hackathons")
	if err != nil {
		log.Fatalf("Query hackathons failed: %v", err)
	}
	defer rows.Close()

	var hackathonIDs []string
	for rows.Next() {
		var id, title string
		var startDate interface{}
		if err := rows.Scan(&id, &title, &startDate); err != nil {
			log.Fatal(err)
		}
		fmt.Printf("ID: %s | Title: %s\n", id, title)
		hackathonIDs = append(hackathonIDs, id)
	}
	fmt.Printf("Total hackathons: %d\n", len(hackathonIDs))

	// 2. Query target hackathon applications
	targetHackathon := "a7baf9cf-9338-41a4-9052-a3dcb7f597af"
	fmt.Printf("\n--- REGISTRATIONS FOR HACKATHON %s ---\n", targetHackathon)
	var regCount int
	err = conn.QueryRow(context.Background(), "SELECT count(*) FROM registrations WHERE hackathon_id = $1", targetHackathon).Scan(&regCount)
	if err != nil {
		log.Printf("Query registrations count failed: %v", err)
	} else {
		fmt.Printf("Total registrations: %d\n", regCount)
	}

	// 3. Query all registrations status & team preference for this hackathon
	if regCount > 0 {
		rowsReg, err := conn.Query(context.Background(), `
			SELECT r.id, r.user_id, r.team_preference, r.approval_status, u.name 
			FROM registrations r
			JOIN users u ON r.user_id = u.id
			WHERE r.hackathon_id = $1 
			LIMIT 10`, targetHackathon)
		if err != nil {
			log.Fatal(err)
		}
		defer rowsReg.Close()
		for rowsReg.Next() {
			var id, userID, teamPref, appStatus, userName string
			if err := rowsReg.Scan(&id, &userID, &teamPref, &appStatus, &userName); err != nil {
				log.Fatal(err)
			}
			fmt.Printf("User: %s (ID: %s) | Pref: %s | Status: %s\n", userName, userID, teamPref, appStatus)
		}
	} else {
		// Let's check general registrations in db
		var totalReg int
		conn.QueryRow(context.Background(), "SELECT count(*) FROM registrations").Scan(&totalReg)
		fmt.Printf("Total registrations in entire DB: %d\n", totalReg)

		if totalReg > 0 {
			fmt.Println("Example registrations in DB:")
			rowsAll, err := conn.Query(context.Background(), `
				SELECT r.hackathon_id, h.title, count(*) 
				FROM registrations r
				JOIN hackathons h ON r.hackathon_id = h.id
				GROUP BY r.hackathon_id, h.title`)
			if err != nil {
				log.Fatal(err)
			}
			defer rowsAll.Close()
			for rowsAll.Next() {
				var hid, htitle string
				var count int
				if err := rowsAll.Scan(&hid, &htitle, &count); err != nil {
					log.Fatal(err)
				}
				fmt.Printf("Hackathon %s (%s): %d registrations\n", hid, htitle, count)
			}
		}
	}

	// 4. Hit the local backend API
	fmt.Println("\n--- HTTP API RESPONSE ---")
	url := "http://localhost:8080/api/hackathons/a7baf9cf-9338-41a4-9052-a3dcb7f597af/applications?limit=10&offset=0&approval_status=Accepted&team_preference=Looking%20for%20Team"
	fmt.Printf("Fetching: %s\n", url)
	
	// Create an HTTP client
	client := &http.Client{}
	resp, err := client.Get(url)
	if err != nil {
		log.Fatalf("HTTP request failed: %v", err)
	}
	defer resp.Body.Close()
	
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Failed to read body: %v", err)
	}
	
	fmt.Printf("Status: %s\n", resp.Status)
	fmt.Printf("X-Total-Count Header: %s\n", resp.Header.Get("X-Total-Count"))
	fmt.Printf("Body length: %d bytes\n", len(bodyBytes))
	if len(bodyBytes) < 500 {
		fmt.Printf("Body: %s\n", string(bodyBytes))
	} else {
		fmt.Printf("Body (truncated): %s\n", string(bodyBytes[:500]))
	}
}
