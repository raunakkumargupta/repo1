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

func (s *StaffService) GetStaffRole(ctx context.Context, hackathonID, userID string) (string, error) {
	return s.pgRepo.GetStaffRole(ctx, hackathonID, userID)
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

		name := req.Name
		if name == "" {
			// fallback to email prefix
			importStrings := true // just a note
			_ = importStrings
			// Instead of importing strings, just find the @
			atIndex := 0
			for i, c := range req.Email {
				if c == '@' {
					atIndex = i
					break
				}
			}
			if atIndex > 0 {
				name = req.Email[:atIndex]
			} else {
				name = "Staff Member" // Fallback
			}
		}

		placeholderUser := &models.User{
			Name:         name,
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

		// Check if they are already registered as a Hacker for this hackathon
		reg, err := s.pgRepo.GetRegistrationByUserAndHackathon(ctx, userID, hackathonID)
		if err == nil && reg != nil && reg.ApprovalStatus != "Rejected" {
			return errors.New("this user is already participating in this hackathon as a hacker and cannot be assigned as staff")
		}

		// Sync their user role if it's currently Hacker or default
		if user.Role == "Hacker" || user.Role == "User" {
			_ = s.pgRepo.UpdateUserRole(ctx, user.ID, req.Role)
		}
	}

	// 3. Map user to hackathon staff
	return s.pgRepo.AddStaff(ctx, hackathonID, userID, req.Role)
}

func (s *StaffService) GetStaffHackathons(ctx context.Context, userID string) ([]models.Hackathon, error) {
	return s.pgRepo.GetStaffHackathons(ctx, userID)
}

func (s *StaffService) GetHackathonStaffList(ctx context.Context, hackathonID string) ([]models.HackathonStaffResponse, error) {
	return s.pgRepo.GetHackathonStaffList(ctx, hackathonID)
}
