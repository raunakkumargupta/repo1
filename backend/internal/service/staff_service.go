package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type StaffService struct {
	pgRepo *repository.PostgresRepo
}

func NewStaffService(pgRepo *repository.PostgresRepo) *StaffService {
	return &StaffService{pgRepo: pgRepo}
}

func (s *StaffService) AssignStaff(ctx context.Context, hackathonID string, req models.StaffAssignmentRequest) error {
	if req.Email == "" || req.Role == "" {
		return errors.New("email and role are required")
	}
	if req.Role != "Judge" && req.Role != "Mentor" {
		return errors.New("invalid role; must be Judge or Mentor")
	}

	// 1. Check if user exists
	user, err := s.pgRepo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return err
	}

	var userID string
	if user == nil {
		// 2. Create placeholder user with temporary credentials
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("temp_password_123"), bcrypt.DefaultCost)
		if err != nil {
			return fmt.Errorf("failed to hash password: %w", err)
		}

		placeholderUser := &models.User{
			Name:         "Staff Placeholder",
			Email:        req.Email,
			PasswordHash: string(hashedPassword),
			Role:         req.Role, // assign role globally as well
		}

		if err := s.pgRepo.CreateUser(ctx, placeholderUser); err != nil {
			return err
		}
		userID = placeholderUser.ID
	} else {
		userID = user.ID
		// Sync their user role if it's currently Hacker or default
		if user.Role == "Hacker" || user.Role == "User" {
			_ = s.pgRepo.UpdateUserRole(ctx, user.ID, req.Role)
		}
	}

	// 3. Map user to hackathon staff
	return s.pgRepo.AddStaff(ctx, hackathonID, userID, req.Role)
}
