package config

import (
	"os"
)

type Config struct {
	DBUrl          string
	RedisUrl       string
	JWTSecret      string
	Port           string
	AllowedOrigins string
	WorkerPoolSize string
	DBMaxConns     string
	DBMinConns     string
}

func LoadConfig() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	workerPoolSize := os.Getenv("WORKER_POOL_SIZE")
	if workerPoolSize == "" {
		workerPoolSize = "50"
	}

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" {
		allowedOrigins = "http://localhost:3000"
	}

	dbMaxConns := os.Getenv("DB_MAX_CONNS")
	if dbMaxConns == "" {
		dbMaxConns = "100"
	}

	dbMinConns := os.Getenv("DB_MIN_CONNS")
	if dbMinConns == "" {
		dbMinConns = "10"
	}

	return &Config{
		DBUrl:          os.Getenv("DB_URL"),      // e.g., postgres://user:pass@localhost:5432/hackathon?sslmode=disable
		RedisUrl:       os.Getenv("REDIS_URL"),   // e.g., redis://localhost:6379/0
		JWTSecret:      os.Getenv("JWT_SECRET"),
		Port:           port,
		AllowedOrigins: allowedOrigins,
		WorkerPoolSize: workerPoolSize,
		DBMaxConns:     dbMaxConns,
		DBMinConns:     dbMinConns,
	}
}
