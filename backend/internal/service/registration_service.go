package service

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/raunakkumargupta/repo1/backend/internal/middleware"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

type RegistrationService struct {
	pgRepo *repository.PostgresRepo
}

func NewRegistrationService(pgRepo *repository.PostgresRepo) *RegistrationService {
	return &RegistrationService{pgRepo: pgRepo}
}

func (s *RegistrationService) Apply(ctx context.Context, userID, hackathonID string, req models.ApplyHackathonRequest) (*models.Registration, error) {
	// Check if the user is already staff (Mentor/Judge) for this hackathon
	role, err := s.pgRepo.GetStaffRole(ctx, hackathonID, userID)
	if err == nil && (role == "Mentor" || role == "Judge") {
		return nil, errors.New("you are already assigned as staff for this hackathon and cannot participate as a hacker")
	}

	skillsJSON, err := json.Marshal(req.Skills)
	if err != nil {
		return nil, err
	}

	reg := &models.Registration{
		UserID:         userID,
		HackathonID:    hackathonID,
		GithubURL:      req.GithubURL,
		LinkedinURL:    req.LinkedinURL,
		Skills:         string(skillsJSON),
		TeamPreference: req.TeamPreference,
		ApprovalStatus: "Pending", // Reset/default to Pending on applying
		ResumeURL:      req.ResumeURL,
	}

	if err := s.pgRepo.UpsertRegistration(ctx, reg); err != nil {
		return nil, err
	}

	return reg, nil
}

func (s *RegistrationService) GetRegistration(ctx context.Context, userID, hackathonID string) (*models.Registration, error) {
	return s.pgRepo.GetRegistrationByUserAndHackathon(ctx, userID, hackathonID)
}

func (s *RegistrationService) GetRegistrationByUserID(ctx context.Context, userID string) (*models.Registration, error) {
	// Fallback/compatibility method
	return s.pgRepo.GetRegistrationByUserID(ctx, userID)
}

func (s *RegistrationService) GetRegistrationsByUserID(ctx context.Context, userID string) ([]models.Registration, error) {
	return s.pgRepo.GetRegistrationsByUserID(ctx, userID)
}

func (s *RegistrationService) ListByHackathon(ctx context.Context, hackathonID string, limit, offset *int, approvalStatus, teamPreference, search, excludeUserID *string) ([]models.RegistrationProfile, int, error) {
	return s.pgRepo.GetRegistrationsByHackathon(ctx, hackathonID, limit, offset, approvalStatus, teamPreference, search, excludeUserID)
}

func (s *RegistrationService) GetRegistrationByID(ctx context.Context, id string) (*models.Registration, error) {
	return s.pgRepo.GetRegistrationByID(ctx, id)
}

func (s *RegistrationService) UpdateStatus(ctx context.Context, regID string, status string) error {
	if status != "Accepted" && status != "Rejected" && status != "Pending" {
		return errors.New("invalid status value")
	}

	claims := middleware.GetUserClaims(ctx)
	if claims == nil {
		return errors.New("unauthorized: missing credentials")
	}

	reg, err := s.pgRepo.GetRegistrationByID(ctx, regID)
	if err != nil {
		return err
	}
	if reg == nil {
		return errors.New("registration not found")
	}

	hack, err := s.pgRepo.GetHackathonByID(ctx, reg.HackathonID)
	if err != nil {
		return err
	}
	if hack == nil {
		return errors.New("hackathon not found")
	}

	if claims.Role != models.RoleSuperAdmin && claims.Role != models.RoleAdmin && hack.OrganizerID != claims.UserID {
		return errors.New("forbidden: you do not have permission to manage this hackathon's registrations")
	}

	return s.pgRepo.UpdateRegistrationStatus(ctx, regID, status)
}
