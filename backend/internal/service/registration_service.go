package service

import (
	"context"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

type RegistrationService struct {
	pgRepo *repository.PostgresRepo
}

func NewRegistrationService(pgRepo *repository.PostgresRepo) *RegistrationService {
	return &RegistrationService{pgRepo: pgRepo}
}

func (s *RegistrationService) CreateRegistration(ctx context.Context, userID string, req models.CreateRegistrationRequest) (*models.Registration, error) {
	reg := &models.Registration{
		UserID:      userID,
		GithubURL:   req.GithubURL,
		LinkedinURL: req.LinkedinURL,
		Skills:      req.Skills,
		Status:      req.Status,
	}

	if err := s.pgRepo.CreateRegistration(ctx, reg); err != nil {
		return nil, err
	}
	return reg, nil
}

func (s *RegistrationService) GetRegistrationByUserID(ctx context.Context, userID string) (*models.Registration, error) {
	return s.pgRepo.GetRegistrationByUserID(ctx, userID)
}
