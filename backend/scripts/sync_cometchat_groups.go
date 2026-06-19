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

	// 1. Fetch all teams
	rows, err := dbpool.Query(ctx, "SELECT id, team_name, leader_id, hackathon_id FROM teams")
	if err != nil {
		log.Fatalf("Failed to query teams: %v\n", err)
	}
	defer rows.Close()

	type TeamInfo struct {
		ID          string
		Name        string
		LeaderID    *string
		HackathonID string
	}

	var teams []TeamInfo
	for rows.Next() {
		var t TeamInfo
		if err := rows.Scan(&t.ID, &t.Name, &t.LeaderID, &t.HackathonID); err != nil {
			log.Fatalf("Failed to scan team: %v\n", err)
		}
		teams = append(teams, t)
	}

	fmt.Printf("Found %d teams to sync.\n", len(teams))

	for _, team := range teams {
		leaderUID := ""
		if team.LeaderID != nil {
			leaderUID = *team.LeaderID
		}

		fmt.Printf("Syncing team: %s (GUID: %s, Leader: %s)\n", team.Name, team.ID, leaderUID)

		// Create group
		tags := []string{"hackathon:" + team.HackathonID, "team"}
		err = ccService.CreateGroup(ctx, team.ID, team.Name, leaderUID, tags)
		if err != nil {
			fmt.Printf("  -> Group creation warning/error: %v\n", err)
		} else {
			fmt.Println("  -> Group created/verified successfully.")
		}

		// Fetch all members of this team
		memberRows, err := dbpool.Query(ctx, "SELECT user_id FROM team_members WHERE team_id = $1", team.ID)
		if err != nil {
			fmt.Printf("  -> Failed to query members for team %s: %v\n", team.ID, err)
			continue
		}

		var memberUIDs []string
		for memberRows.Next() {
			var uid string
			if err := memberRows.Scan(&uid); err != nil {
				log.Fatalf("Failed to scan member: %v\n", err)
			}
			memberUIDs = append(memberUIDs, uid)
		}
		memberRows.Close()

		fmt.Printf("  -> Found %d members. Syncing members...\n", len(memberUIDs))
		for _, uid := range memberUIDs {
			err = ccService.AddMemberToGroup(ctx, team.ID, uid)
			if err != nil {
				fmt.Printf("    -> Failed to add member %s to group: %v. Retrying after creating user...\n", uid, err)
				
				// Fetch user from DB
				var name, role string
				dbErr := dbpool.QueryRow(ctx, "SELECT name, role FROM users WHERE id = $1", uid).Scan(&name, &role)
				if dbErr != nil {
					fmt.Printf("      -> Failed to get user %s from DB: %v\n", uid, dbErr)
					continue
				}

				// Create user in CometChat
				if errCreate := ccService.CreateUser(ctx, uid, name, role); errCreate != nil {
					fmt.Printf("      -> Failed to create user %s in CometChat: %v\n", uid, errCreate)
					continue
				}

				// Retry adding member to group
				if errRetry := ccService.AddMemberToGroup(ctx, team.ID, uid); errRetry != nil {
					fmt.Printf("      -> Failed on retry to add member %s to group: %v\n", uid, errRetry)
				} else {
					fmt.Printf("      -> Member %s synced/added successfully on retry.\n", uid)
				}
			} else {
				fmt.Printf("    -> Member %s synced/added successfully.\n", uid)
			}
		}
	}

	fmt.Println("CometChat groups sync complete!")
}
