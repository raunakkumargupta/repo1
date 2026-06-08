package service

import (
	"context"
	"errors"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

type JudgeService struct {
	pgRepo *repository.PostgresRepo
}

func NewJudgeService(pgRepo *repository.PostgresRepo) *JudgeService {
	return &JudgeService{pgRepo: pgRepo}
}

func (s *JudgeService) SubmitEvaluation(ctx context.Context, hackathonID, judgeID string, req models.EvaluateProjectRequest) (*models.Evaluation, error) {
	if req.TechnicalScore < 1 || req.TechnicalScore > 10 ||
		req.DesignScore < 1 || req.DesignScore > 10 ||
		req.InnovationScore < 1 || req.InnovationScore > 10 {
		return nil, errors.New("scores must be between 1 and 10")
	}

	ev := &models.Evaluation{
		HackathonID:     hackathonID,
		TeamID:          req.TeamID,
		JudgeID:         judgeID,
		TechnicalScore:  req.TechnicalScore,
		DesignScore:     req.DesignScore,
		InnovationScore: req.InnovationScore,
		Feedback:        req.Feedback,
	}

	if err := s.pgRepo.CreateEvaluation(ctx, ev); err != nil {
		return nil, err
	}

	return ev, nil
}

func (s *JudgeService) GetSubmittedProjects(ctx context.Context, hackathonID string) ([]models.Team, error) {
	return s.pgRepo.GetTeamsByHackathon(ctx, hackathonID, true)
}

func (s *JudgeService) GetEvaluatedTeamsByJudge(ctx context.Context, judgeID string) (map[string]bool, error) {
	return s.pgRepo.GetEvaluatedTeamsByJudge(ctx, judgeID)
}
