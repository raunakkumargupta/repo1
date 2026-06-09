package service

import (
	"context"
	"encoding/json"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

type HackathonService struct {
	pgRepo *repository.PostgresRepo
}

func NewHackathonService(pgRepo *repository.PostgresRepo) *HackathonService {
	return &HackathonService{pgRepo: pgRepo}
}

func (s *HackathonService) CreateHackathon(ctx context.Context, organizerID string, req models.CreateHackathonRequest) (*models.Hackathon, error) {
	tracksJSON, err := json.Marshal(req.Tracks)
	if err != nil {
		return nil, err
	}

	h := &models.Hackathon{
		OrganizerID:      organizerID,
		Title:            req.Title,
		Description:      req.Description,
		CoverImage:       req.CoverImage,
		Tracks:           string(tracksJSON),
		StartDate:        req.StartDate,
		EndDate:          req.EndDate,
		ProblemStatement: req.ProblemStatement,
		Prizes:           req.Prizes,
		Schedule:         req.Schedule,
		Sponsors:         req.Sponsors,
		MinTeamSize:      req.MinTeamSize,
		MaxTeamSize:      req.MaxTeamSize,
		RegistrationFee:  req.RegistrationFee,
		Rounds:           req.Rounds,
	}

	if err := s.pgRepo.CreateHackathon(ctx, h); err != nil {
		return nil, err
	}

	return h, nil
}

func (s *HackathonService) GetHackathonByID(ctx context.Context, id string) (*models.Hackathon, error) {
	return s.pgRepo.GetHackathonByID(ctx, id)
}

func (s *HackathonService) GetHackathons(ctx context.Context, onlyApproved bool) ([]models.Hackathon, error) {
	return s.pgRepo.GetHackathons(ctx, onlyApproved)
}

func (s *HackathonService) ApproveHackathon(ctx context.Context, id string) error {
	return s.pgRepo.ApproveHackathon(ctx, id)
}

func (s *HackathonService) UpdateHackathonDetails(ctx context.Context, id string, req models.UpdateHackathonDetailsRequest) error {
	return s.pgRepo.UpdateHackathonDetails(ctx, id, req)
}

func (s *HackathonService) DeleteHackathon(ctx context.Context, id string) error {
	return s.pgRepo.DeleteHackathon(ctx, id)
}

