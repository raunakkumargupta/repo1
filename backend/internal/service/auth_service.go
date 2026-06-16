package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	pgRepo    *repository.PostgresRepo
	redisRepo *repository.RedisRepo
	jwtSecret string
}

func NewAuthService(pgRepo *repository.PostgresRepo, redisRepo *repository.RedisRepo, jwtSecret string) *AuthService {
	return &AuthService{
		pgRepo:    pgRepo,
		redisRepo: redisRepo,
		jwtSecret: jwtSecret,
	}
}

func (s *AuthService) RegisterUser(ctx context.Context, req models.RegisterRequest) (*models.User, error) {
	// Check if user already exists
	existingUser, err := s.pgRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("error checking existing user: %w", err)
	}
	if existingUser != nil {
		return nil, errors.New("user with this email already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("error hashing password: %w", err)
	}

	user := &models.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
	}

	if err := s.pgRepo.CreateUser(ctx, user); err != nil {
		return nil, fmt.Errorf("error creating user: %w", err)
	}

	// Sync user to CometChat (async — non-blocking)
	go func() {
		ccService := NewCometChatService()
		if err := ccService.CreateUser(context.Background(), user.ID, user.Name, user.Role); err != nil {
			fmt.Printf("[CometChat Sync] Failed to create user %s: %v\n", user.ID, err)
		}
	}()

	return user, nil
}

func (s *AuthService) LoginUser(ctx context.Context, req models.LoginRequest) (*models.LoginResponse, error) {
	user, err := s.pgRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("error fetching user: %w", err)
	}
	if user == nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate JWT
	claims := models.Claims{
		UserID: user.ID,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, fmt.Errorf("error generating token: %w", err)
	}

	return &models.LoginResponse{
		Token: tokenString,
		User:  *user,
	}, nil
}

func (s *AuthService) ForgetPassword(ctx context.Context, email string) error {
	user, err := s.pgRepo.GetUserByEmail(ctx, email)
	if err != nil {
		return fmt.Errorf("error checking user: %w", err)
	}
	if user == nil {
		// To prevent email enumeration, we just return nil
		return nil
	}

	// Generate secure random token
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return fmt.Errorf("error generating token: %w", err)
	}
	token := hex.EncodeToString(b)

	// Store in Redis with 15 mins TTL
	if err := s.redisRepo.StoreResetToken(ctx, token, user.Email, 15*time.Minute); err != nil {
		return fmt.Errorf("error storing reset token: %w", err)
	}

	// Simulate sending email
	fmt.Printf("SIMULATED EMAIL: Password reset requested for %s. Reset Token: %s\n", user.Email, token)

	return nil
}

func (s *AuthService) ResetPassword(ctx context.Context, req models.ResetPasswordRequest) error {
	email, err := s.redisRepo.GetEmailByResetToken(ctx, req.Token)
	if err != nil {
		return errors.New("invalid or expired reset token")
	}

	user, err := s.pgRepo.GetUserByEmail(ctx, email)
	if err != nil || user == nil {
		return errors.New("user not found")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("error hashing password: %w", err)
	}

	if err := s.pgRepo.UpdateUserPassword(ctx, user.ID, string(hashedPassword)); err != nil {
		return fmt.Errorf("error updating password: %w", err)
	}

	// Invalidate the token
	_ = s.redisRepo.DeleteResetToken(ctx, req.Token)

	return nil
}
