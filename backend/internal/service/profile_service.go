package service

import (
	"context"
	"fmt"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

type ProfileService struct {
	pgRepo *repository.PostgresRepo
}

func NewProfileService(pgRepo *repository.PostgresRepo) *ProfileService {
	return &ProfileService{
		pgRepo: pgRepo,
	}
}

func (s *ProfileService) GetProfile(ctx context.Context, userID string) (*models.HackerProfile, error) {
	profile, err := s.pgRepo.GetHackerProfile(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch profile: %w", err)
	}

	// If no profile exists, return an empty one
	if profile == nil {
		return &models.HackerProfile{
			UserID: userID,
			// Default fields
		}, nil
	}

	return profile, nil
}

func (s *ProfileService) UpsertProfile(ctx context.Context, userID string, req models.HackerProfileRequest) (*models.HackerProfile, error) {
	profile := &models.HackerProfile{
		UserID:                 userID,
		Gender:                 req.Gender,
		TShirtSize:             req.TShirtSize,
		City:                   req.City,
		PhoneNumber:            req.PhoneNumber,
		EmergencyContactName:   req.EmergencyContactName,
		EmergencyContactNumber: req.EmergencyContactNumber,
		Bio:                    req.Bio,
		ReadmeMd:               req.ReadmeMd,
		HasFormalEducation:     req.HasFormalEducation,
		DegreeType:             req.DegreeType,
		Institution:            req.Institution,
		FieldOfStudy:           req.FieldOfStudy,
		GradYear:               req.GradYear,
		GradMonth:              req.GradMonth,
		DietaryPreference:      req.DietaryPreference,
		Allergies:              req.Allergies,
		GithubURL:              req.GithubURL,
		LinkedinURL:            req.LinkedinURL,
		ResumeURL:              req.ResumeURL,
		Skills:                 req.Skills,
		DefaultTeamPreference:  req.DefaultTeamPreference,
	}

	if err := s.pgRepo.UpsertHackerProfile(ctx, profile); err != nil {
		return nil, fmt.Errorf("failed to save profile: %w", err)
	}

	return s.pgRepo.GetHackerProfile(ctx, userID)
}
