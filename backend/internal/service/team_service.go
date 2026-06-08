package service

import (
	"context"
	"crypto/rand"
	"errors"
	"math/big"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

type TeamService struct {
	pgRepo *repository.PostgresRepo
}

func NewTeamService(pgRepo *repository.PostgresRepo) *TeamService {
	return &TeamService{pgRepo: pgRepo}
}

func generateInviteCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Omitted lookalike characters: I, O, 1, 0
	result := make([]byte, 6)
	for i := range result {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		result[i] = chars[n.Int64()]
	}
	return string(result)
}

func (s *TeamService) CreateTeam(ctx context.Context, userID, hackathonID string, req models.CreateTeamRequest) (*models.Team, error) {
	if req.TeamName == "" {
		return nil, errors.New("team name is required")
	}

	inviteCode := generateInviteCode()
	team := &models.Team{
		HackathonID: hackathonID,
		TeamName:    req.TeamName,
		InviteCode:  inviteCode,
		IsSubmitted: false,
	}

	// Insert team row
	if err := s.pgRepo.CreateTeam(ctx, team); err != nil {
		return nil, err
	}

	// Insert creator to team members mapping
	if err := s.pgRepo.AddUserToTeam(ctx, team.ID, userID); err != nil {
		return nil, err
	}

	return team, nil
}

func (s *TeamService) JoinTeam(ctx context.Context, userID, inviteCode string) (*models.Team, error) {
	if inviteCode == "" {
		return nil, errors.New("invite code is required")
	}
	return s.pgRepo.JoinTeamByInviteCode(ctx, userID, inviteCode)
}

func (s *TeamService) GetTeamByUserIDAndHackathon(ctx context.Context, userID, hackathonID string) (*models.Team, error) {
	return s.pgRepo.GetTeamByUserIDAndHackathon(ctx, userID, hackathonID)
}

func (s *TeamService) GetTeamMembers(ctx context.Context, teamID string) ([]models.User, error) {
	return s.pgRepo.GetTeamMembers(ctx, teamID)
}

func (s *TeamService) SubmitRepository(ctx context.Context, teamID string, req models.UpdateRepoRequest) error {
	if req.RepositoryURL == "" {
		return errors.New("repository URL is required")
	}
	return s.pgRepo.UpdateTeamRepositoryURL(ctx, teamID, req.RepositoryURL)
}

func (s *TeamService) GetTeamsByHackathon(ctx context.Context, hackathonID string, onlySubmitted bool) ([]models.Team, error) {
	return s.pgRepo.GetTeamsByHackathon(ctx, hackathonID, onlySubmitted)
}
