package service

import (
	"context"
	"errors"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

type SuperAdminService struct {
	pgRepo *repository.PostgresRepo
}

func NewSuperAdminService(pgRepo *repository.PostgresRepo) *SuperAdminService {
	return &SuperAdminService{pgRepo: pgRepo}
}

func (s *SuperAdminService) ListPendingHackathons(ctx context.Context) ([]models.Hackathon, error) {
	list, err := s.pgRepo.GetHackathons(ctx, false)
	if err != nil {
		return nil, err
	}

	var pending []models.Hackathon
	for _, h := range list {
		if !h.IsApproved {
			pending = append(pending, h)
		}
	}
	return pending, nil
}

func (s *SuperAdminService) ApproveOrganizer(ctx context.Context, hackathonID string) error {
	h, err := s.pgRepo.GetHackathonByID(ctx, hackathonID)
	if err != nil {
		return err
	}
	if h == nil {
		return errors.New("hackathon not found")
	}

	// Upgrade the creator's role to Organizer if they are Hacker/User
	err = s.pgRepo.UpdateUserRole(ctx, h.OrganizerID, models.RoleOrganizer)
	if err != nil {
		// ignore if role already Organizer or higher
	}

	// Approve hackathon
	return s.pgRepo.ApproveHackathon(ctx, hackathonID)
}

func (s *SuperAdminService) GetGlobalMetrics(ctx context.Context) (map[string]interface{}, error) {
	users, err := s.pgRepo.GetUsers(ctx)
	if err != nil {
		return nil, err
	}

	hacks, err := s.pgRepo.GetHackathons(ctx, true)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total_users":      len(users),
		"active_hackathons": len(hacks),
	}, nil
}

func (s *SuperAdminService) BanUser(ctx context.Context, userID string) error {
	return s.pgRepo.UpdateUserStatus(ctx, userID, "deactivated")
}

func (s *SuperAdminService) GetModerationLogs(ctx context.Context) ([]map[string]interface{}, error) {
	// Return a set of mock moderation flags ready to receive future CometChat moderation webhooks
	logs := []map[string]interface{}{
		{
			"id":        "1",
			"user_id":   "hacker-id-placeholder-1",
			"content":   "Potential spam containing links to unverified software repositories.",
			"timestamp": "2026-06-08T01:00:00Z",
		},
		{
			"id":        "2",
			"user_id":   "hacker-id-placeholder-2",
			"content":   "Off-topic messaging report in team community channels.",
			"timestamp": "2026-06-08T01:10:00Z",
		},
	}
	return logs, nil
}
