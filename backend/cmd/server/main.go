package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/raunakkumargupta/repo1/backend/internal/config"
	"github.com/raunakkumargupta/repo1/backend/internal/handler"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
	"github.com/raunakkumargupta/repo1/backend/internal/service"
	"github.com/raunakkumargupta/repo1/backend/internal/worker"
	"github.com/redis/go-redis/v9"
)

func runMigrations(dbURL string) error {
	sourceURL := "file://migrations"
	
	log.Printf("Running migrations from: %s", sourceURL)
	
	m, err := migrate.New(sourceURL, dbURL)
	if err != nil {
		return fmt.Errorf("could not create migrate instance: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("an error occurred while syncing the database: %w", err)
	}

	log.Println("Database migrations applied successfully")
	return nil
}

func main() {
	cfg := config.LoadConfig()

	ctx := context.Background()

	// Initialize PostgreSQL Pool Config
	dbConfig, err := pgxpool.ParseConfig(cfg.DBUrl)
	if err != nil {
		log.Fatalf("Unable to parse database URL: %v", err)
	}

	maxConns, _ := strconv.Atoi(cfg.DBMaxConns)
	minConns, _ := strconv.Atoi(cfg.DBMinConns)
	dbConfig.MaxConns = int32(maxConns)
	dbConfig.MinConns = int32(minConns)
	dbConfig.MaxConnIdleTime = 5 * time.Minute
	dbConfig.MaxConnLifetime = 1 * time.Hour

	// Initialize PostgreSQL Pool
	dbpool, err := pgxpool.NewWithConfig(ctx, dbConfig)
	if err != nil {
		log.Fatalf("Unable to create connection pool: %v\n", err)
	}
	defer dbpool.Close()
	
	// Test Postgres Connection
	if err := dbpool.Ping(ctx); err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	log.Println("Connected to PostgreSQL")

	// Run Migrations
	if err := runMigrations(cfg.DBUrl); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Initialize Redis Client
	opts, err := redis.ParseURL(cfg.RedisUrl)
	if err != nil {
		log.Fatalf("Invalid Redis URL: %v", err)
	}
	redisClient := redis.NewClient(opts)
	defer redisClient.Close()
	
	// Test Redis Connection
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("Unable to connect to Redis: %v", err)
	}
	log.Println("Connected to Redis")

	// Setup Repositories
	pgRepo := repository.NewPostgresRepo(dbpool)
	redisRepo := repository.NewRedisRepo(redisClient)

	// Initialize Worker Pool
	workerPoolSize, _ := strconv.Atoi(cfg.WorkerPoolSize)
	wp := worker.NewWorkerPool(workerPoolSize, 1000)
	wp.Start()
	defer wp.Stop()

	// Setup Services
	authService := service.NewAuthService(pgRepo, redisRepo, cfg.JWTSecret)
	ticketService := service.NewTicketService(pgRepo, redisRepo, wp)
	teamService := service.NewTeamService(pgRepo)
	userService := service.NewUserService(pgRepo)
	regService := service.NewRegistrationService(pgRepo)
	commService := service.NewCommunityService(pgRepo)
	hackathonService := service.NewHackathonService(pgRepo)
	judgeService := service.NewJudgeService(pgRepo)
	superAdminService := service.NewSuperAdminService(pgRepo)
	staffService := service.NewStaffService(pgRepo)
	announcementService := service.NewAnnouncementService(pgRepo, wp)
	profileService := service.NewProfileService(pgRepo)

	// Setup Handlers
	authHandler := handler.NewAuthHandler(authService)
	ticketHandler := handler.NewTicketHandler(ticketService)
	teamHandler := handler.NewTeamHandler(teamService)
	userHandler := handler.NewUserHandler(userService)
	regHandler := handler.NewRegistrationHandler(regService)
	commHandler := handler.NewCommunityHandler(commService)
	hackathonHandler := handler.NewHackathonHandler(hackathonService)
	judgeHandler := handler.NewJudgeHandler(judgeService)
	superAdminHandler := handler.NewSuperAdminHandler(superAdminService)
	staffHandler := handler.NewStaffHandler(staffService)
	announcementHandler := handler.NewAnnouncementHandler(announcementService)
	profileHandler := handler.NewProfileHandler(profileService)

	// Setup Router
	r := handler.NewRouter(
		authHandler, ticketHandler, teamHandler, userHandler, regHandler, commHandler,
		hackathonHandler, judgeHandler, superAdminHandler, staffHandler, announcementHandler,
		profileHandler,
		cfg.JWTSecret, cfg.AllowedOrigins, redisClient,
	)

	// Start Server
	log.Printf("Server starting on port %s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
