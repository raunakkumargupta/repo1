package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

// dbURL should match your .env configuration
var dbURL = "postgres://postgres:postgres@localhost:5433/hackathon?sslmode=disable"

func hashPassword(password string) string {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		log.Fatal(err)
	}
	return string(bytes)
}

func main() {
	_ = godotenv.Load()
	if envURL := os.Getenv("DB_URL"); envURL != "" {
		dbURL = envURL
	}

	ctx := context.Background()
	dbpool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbpool.Close()

	passwordHash := hashPassword("password123")

	// Create a SuperAdmin
	var superAdminID string
	err = dbpool.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ('Admin', 'admin@matrix.com', $1, 'SuperAdmin')
		ON CONFLICT (email) DO UPDATE SET role = 'SuperAdmin'
		RETURNING id`, passwordHash).Scan(&superAdminID)
	if err != nil {
		log.Fatalf("Error creating SuperAdmin: %v", err)
	}

	// Create an Organizer
	var organizerID string
	err = dbpool.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ('Alice Organizer', 'organizer@matrix.com', $1, 'Organizer')
		ON CONFLICT (email) DO UPDATE SET role = 'Organizer'
		RETURNING id`, passwordHash).Scan(&organizerID)
	if err != nil {
		log.Fatalf("Error creating Organizer: %v", err)
	}

	// Generate 22 diverse hackathons
	tracksList := [][]string{
		{"AI", "Web3"},
		{"Web3", "Mobile"},
		{"QC", "AI"},
		{"Design", "Mobile"},
		{"AI", "Design"},
		{"Web3", "QC"},
		{"QC", "Mobile"},
	}

	titles := []string{
		"Global AI Hackathon 2026",
		"Obsidian Web3 Build-athon",
		"Quantum Computing Sprint",
		"Mobile Design Challenge",
		"Generative AI Hackathon",
		"Decentralized Finance Summit",
		"Quantum Cryptography Lab",
		"Next-Gen iOS/Android Sprint",
		"UX/UI Crafting Championship",
		"Metaverse Builders Guild",
		"Cyber Security Shield 2026",
		"Cloud Native Hackathon",
		"Robotics Control Sprint",
		"Bio-Computing Matrix",
		"Green Tech Innovations",
		"SaaS Founders Build-out",
		"GameDev VR/AR Marathon",
		"Distributed Storage Lab",
		"Edge Computing Sprint",
		"AI Agent Workspace Hack",
		"Data Science Analytics Cup",
		"Smart City Solutions IoT",
	}

	descriptions := []string{
		"Build cutting-edge intelligence systems and decentralized agents using latest Large Language Models.",
		"Develop high-performance decentralised applications and smart contracts for scalable blockchain ecosystems.",
		"Tackle real-world mathematical optimization and cryptography challenges on simulation hardware.",
		"Redesign the future of user interfaces for mobile operating systems and visual apps.",
		"Build custom agents, RAG pipelines, and generative interfaces using advanced AI tools.",
		"Hack new financial primitives, lending markets, and yield aggregation contracts.",
		"Explore quantum key distribution and post-quantum cryptographic protocols.",
		"Create gorgeous, high-performance mobile apps with modern frameworks and smooth visuals.",
		"Optimize digital experiences through extreme user-testing and visual craftsmanship.",
		"Build spatial applications and virtual worlds for the next generation of online socialization.",
		"Identify vulnerabilities and design automated cyber response mechanisms.",
		"Optimize scalable deployments and microservice choreographies on cloud clusters.",
		"Program autonomous systems and simulated drone navigations in spatial worlds.",
		"Translate biological DNA sequences and protein foldings using deep learning architectures.",
		"Solve environmental challenges with smart monitoring, IoT nodes, and green metrics.",
		"Launch micro-SaaS applications in 48 hours focusing on high consumer utility.",
		"Build high-fidelity spatial games using advanced engines and physics.",
		"Architect peer-to-peer storage models and fast file sharing protocols.",
		"Develop latency-critical scripts for distributed processing on edge nodes.",
		"Build agentic frameworks, multi-agent communication networks, and tool schemas.",
		"Solve predictive models and data visualization matrices using deep networks.",
		"Solve traffic flow and smart grid anomalies using networked hardware boards.",
	}

	problemStatements := []string{
		"Build an LLM-based autonomous agent system that can coordinate to solve multi-step coding bugs.",
		"Create a cross-chain decentralized application that allows seamless lending of fractionalized real-world assets.",
		"Develop a quantum-approximate optimization algorithm to optimize airline hub routing schemas.",
		"Design and construct a fluid mobile user interface that adapts dynamically to cognitive loads.",
		"Build an application that generates dynamic multi-format UI components based on pure natural language descriptions.",
		"Design a decentralized lending protocol that automatically mitigates liquidation cascades.",
		"Build a post-quantum public-key distribution network using simulated quantum channels.",
		"Create a cross-platform mobile app that runs lightweight local neural networks for offline audio processing.",
		"Redesign and implement onboarding flows optimized for senior citizens with modern micro-interactions.",
		"Construct a high-performance spatial networking library that syncs virtual physics at 90fps.",
		"Build an intrusion detection engine that uses machine learning to flag synthetic network packet streams.",
		"Develop a Kubernetes controller that auto-provisions clusters based on predictive compute models.",
		"Write an agent algorithm that steers a drone through a changing simulated 3D obstacle field.",
		"Create a pipeline to predict secondary protein structures from raw sequence chains in under 10 seconds.",
		"Construct a smart grid dashboard that monitors localized home carbon footprints using simulated smart sensors.",
		"Create an AI-powered customer call transcriber that automatically generates micro-SaaS subscriptions.",
		"Build an immersive VR experience that renders real-time physics simulation using raymarching shaders.",
		"Design a zero-knowledge distributed storage scheme where nodes verify storage without knowing contents.",
		"Program an edge pipeline that runs real-time object segmentation on 1080p video streams with low power consumption.",
		"Create a multi-agent framework where agents hire other agents to solve sub-problems via micro-transactions.",
		"Develop a neural model that predicts stock market price discrepancies from social sentiment vectors.",
		"Build a smart traffic grid optimizer that manages intersection lights using real-time car density sensors.",
	}

	prizes := []string{
		"🥇 1st Place: $15,000 | 🥈 2nd Place: $8,000 | 🥉 3rd Place: $4,000",
		"🥇 1st Place: $10,000 | 🥈 2nd Place: $5,000 | 🥉 3rd Place: $2,500",
		"🥇 1st Place: $20,000 | 🥈 2nd Place: $10,000 | 🥉 3rd Place: $5,000",
		"🥇 1st Place: $5,000 | 🥈 2nd Place: $2,500 | 🥉 3rd Place: $1,000",
		"🥇 1st Place: $12,000 | 🥈 2nd Place: $6,000 | 🥉 3rd Place: $3,000",
		"🥇 1st Place: $10,000 | 🥈 2nd Place: $5,000 | 🥉 3rd Place: $2,500",
		"🥇 1st Place: $15,000 | 🥈 2nd Place: $7,500 | 🥉 3rd Place: $3,500",
		"🥇 1st Place: $8,000 | 🥈 2nd Place: $4,000 | 🥉 3rd Place: $2,000",
		"🥇 1st Place: $5,000 | 🥈 2nd Place: $2,500 | 🥉 3rd Place: $1,000",
		"🥇 1st Place: $10,000 | 🥈 2nd Place: $5,000 | 🥉 3rd Place: $2,500",
		"🥇 1st Place: $15,000 | 🥈 2nd Place: $7,500 | 🥉 3rd Place: $3,500",
		"🥇 1st Place: $12,000 | 🥈 2nd Place: $6,000 | 🥉 3rd Place: $3,000",
		"🥇 1st Place: $10,000 | 🥈 2nd Place: $5,000 | 🥉 3rd Place: $2,500",
		"🥇 1st Place: $20,000 | 🥈 2nd Place: $10,000 | 🥉 3rd Place: $5,000",
		"🥇 1st Place: $10,000 | 🥈 2nd Place: $5,000 | 🥉 3rd Place: $2,500",
		"🥇 1st Place: $8,000 | 🥈 2nd Place: $4,000 | 🥉 3rd Place: $2,000",
		"🥇 1st Place: $12,000 | 🥈 2nd Place: $6,000 | 🥉 3rd Place: $3,000",
		"🥇 1st Place: $15,000 | 🥈 2nd Place: $7,500 | 🥉 3rd Place: $3,500",
		"🥇 1st Place: $10,000 | 🥈 2nd Place: $5,000 | 🥉 3rd Place: $2,500",
		"🥇 1st Place: $15,000 | 🥈 2nd Place: $8,000 | 🥉 3rd Place: $4,000",
		"🥇 1st Place: $12,000 | 🥈 2nd Place: $6,000 | 🥉 3rd Place: $3,000",
		"🥇 1st Place: $10,000 | 🥈 2nd Place: $5,000 | 🥉 3rd Place: $2,500",
	}

	sponsors := []string{
		"Google Cloud, OpenAI, CometChat, Anthropic",
		"Solana Foundation, Chainlink, QuickNode",
		"IBM Quantum, Rigetti Computing, D-Wave",
		"Apple Inc., Figma, Tailwind Labs",
		"Hugging Face, Replicate, Pinecone",
		"Uniswap Labs, Aave, Curve Finance",
		"SandboxAQ, ID Quantique, QuintessenceLabs",
		"Google Android, JetBrains, Expo",
		"Adobe, Sketch, InVision",
		"Unity Technologies, Epic Games, Meta Open Source",
		"CrowdStrike, Cloudflare, Snyk",
		"AWS, CNCF, HashiCorp",
		"DJI Robotics, Boston Dynamics, NVIDIA",
		"AlphaFold Team, DeepMind, Illumina",
		"Tesla Energy, Schneider Electric, Enphase Energy",
		"Stripe, Y Combinator, Supabase",
		"Oculus, HTC Vive, Unreal Engine",
		"IPFS, Filecoin, Protocol Labs",
		"NVIDIA Jetson, AWS IoT, Raspberry Pi Foundation",
		"Microsoft Research, AutoGPT Labs, LangChain",
		"Snowflake, Databricks, Kaggle",
		"Siemens, Bosch IoT, Cisco Systems",
	}

	scheduleStr := `📅 Day 1:
- 09:00 AM : Opening Ceremony & Keynote
- 10:00 AM : Team Formation & Brainstorming
- 12:00 PM : Hacking Starts!
- 04:00 PM : Mentor Check-in #1

📅 Day 2:
- 09:00 AM : Mentor Check-in #2
- 02:00 PM : Tech Q&A and Review
- 08:00 PM : Midpoint Project Reviews

📅 Day 3:
- 09:00 AM : Submission Portal Closes
- 11:00 AM : Virtual Pitching & Judging
- 04:00 PM : Closing Ceremony & Winners Announced`

	feesList := []string{
		"Free (Sponsored)", "Free", "$10 USD", "Free", "Free (Sponsored)",
		"Free", "$15 USD", "Free", "Free", "Free (Sponsored)",
		"Free", "Free", "Free (Sponsored)", "Free", "Free",
		"Free", "Free (Sponsored)", "Free", "Free", "Free (Sponsored)",
		"Free", "Free",
	}

	// Insert all 22 hackathons
	var firstHackathonID string
	for i := 0; i < len(titles); i++ {
		trJson, _ := json.Marshal(tracksList[i%len(tracksList)])
		startDate := time.Now().AddDate(0, 0, (i*2)-10)
		endDate := startDate.AddDate(0, 0, 3)

		var currentHackID string
		err = dbpool.QueryRow(ctx, `
			INSERT INTO hackathons (
				organizer_id, title, description, tracks, start_date, end_date, is_approved,
				problem_statement, prizes, schedule, sponsors, min_team_size, max_team_size, registration_fee
			)
			VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11, $12, $13)
			RETURNING id`,
			organizerID, titles[i], descriptions[i], string(trJson), startDate, endDate,
			problemStatements[i], prizes[i], scheduleStr, sponsors[i], 1, 4, feesList[i],
		).Scan(&currentHackID)
		if err != nil {
			log.Fatalf("Error creating hackathon index %d: %v", i, err)
		}

		if i == 0 {
			firstHackathonID = currentHackID
		}
	}

	// Create some Hackers
	var hackerEmails []string
	for i := 1; i <= 12; i++ {
		hackerEmails = append(hackerEmails, fmt.Sprintf("hacker%d@matrix.com", i))
	}
	for i, email := range hackerEmails {
		var hackerID string
		err = dbpool.QueryRow(ctx, `
			INSERT INTO users (name, email, password_hash, role)
			VALUES ($1, $2, $3, 'Hacker')
			ON CONFLICT (email) DO UPDATE SET role = 'Hacker'
			RETURNING id`, fmt.Sprintf("Hacker %d", i+1), email, passwordHash).Scan(&hackerID)
		if err != nil {
			log.Fatalf("Error creating hacker %s: %v", email, err)
		}

		// Register them to all hackathons
		_, err = dbpool.Exec(ctx, `
			INSERT INTO registrations (user_id, hackathon_id, github_url, skills, team_preference, approval_status)
			SELECT $1, id, 'https://github.com/hacker', '["React", "Go"]', 'Looking for Team', 'Accepted'
			FROM hackathons
			ON CONFLICT (user_id, hackathon_id) DO NOTHING`, hackerID)
		if err != nil {
			log.Fatalf("Error registering hacker %s: %v", email, err)
		}
	}

	// Create Mentor and Judge
	var mentorID string
	err = dbpool.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ('Tech Mentor', 'mentor@matrix.com', $1, 'Mentor')
		ON CONFLICT (email) DO UPDATE SET role = 'Mentor'
		RETURNING id`, passwordHash).Scan(&mentorID)

	_, err = dbpool.Exec(ctx, `
		INSERT INTO hackathon_staff (hackathon_id, user_id, role)
		VALUES ($1, $2, 'Mentor') ON CONFLICT DO NOTHING`, firstHackathonID, mentorID)

	var judgeID string
	err = dbpool.QueryRow(ctx, `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ('Expert Judge', 'judge@matrix.com', $1, 'Judge')
		ON CONFLICT (email) DO UPDATE SET role = 'Judge'
		RETURNING id`, passwordHash).Scan(&judgeID)

	_, err = dbpool.Exec(ctx, `
		INSERT INTO hackathon_staff (hackathon_id, user_id, role)
		VALUES ($1, $2, 'Judge') ON CONFLICT DO NOTHING`, firstHackathonID, judgeID)

	fmt.Println("Successfully seeded the database with 22 hackathons! You can login with:")
	fmt.Println("Admin: admin@matrix.com | password123")
	fmt.Println("Organizer: organizer@matrix.com | password123")
	fmt.Println("Hacker: hacker1@matrix.com | password123")
	fmt.Println("Mentor: mentor@matrix.com | password123")
	fmt.Println("Judge: judge@matrix.com | password123")
}
