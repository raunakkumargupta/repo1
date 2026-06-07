package service

import (
	"context"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

type TeamService struct {
	pgRepo *repository.PostgresRepo
}

func NewTeamService(pgRepo *repository.PostgresRepo) *TeamService {
	return &TeamService{pgRepo: pgRepo}
}

func (s *TeamService) CreateTeam(ctx context.Context, req models.CreateTeamRequest) (*models.Team, error) {
	team := &models.Team{
		TeamName:      req.TeamName,
		RepositoryURL: req.RepositoryURL,
	}

	if err := s.pgRepo.CreateTeam(ctx, team); err != nil {
		return nil, err
	}

	return team, nil
}

func (s *TeamService) AddUserToTeam(ctx context.Context, teamID string, req models.AddTeamMemberRequest) error {
	return s.pgRepo.AddUserToTeam(ctx, teamID, req.UserID)
}
