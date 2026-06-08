package service

import (
	"context"
	"encoding/json"
	"errors"

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

func (s *RegistrationService) ListByHackathon(ctx context.Context, hackathonID string) ([]models.RegistrationProfile, error) {
	return s.pgRepo.GetRegistrationsByHackathon(ctx, hackathonID)
}

func (s *RegistrationService) UpdateStatus(ctx context.Context, regID string, status string) error {
	if status != "Accepted" && status != "Rejected" && status != "Pending" {
		return errors.New("invalid status value")
	}
	return s.pgRepo.UpdateRegistrationStatus(ctx, regID, status)
}
