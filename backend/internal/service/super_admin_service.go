package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
	"github.com/raunakkumargupta/repo1/backend/internal/worker"
)

type SuperAdminService struct {
	pgRepo     *repository.PostgresRepo
	workerPool *worker.WorkerPool
}

func NewSuperAdminService(pgRepo *repository.PostgresRepo, wp *worker.WorkerPool) *SuperAdminService {
	return &SuperAdminService{pgRepo: pgRepo, workerPool: wp}
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
	err = s.pgRepo.ApproveHackathon(ctx, hackathonID)
	if err != nil {
		return err
	}

	// 1. Notify the organizer (the creator) of the hackathon
	organizer, err := s.pgRepo.GetUserByID(ctx, h.OrganizerID)
	if err == nil && organizer != nil && organizer.FCMToken != nil && *organizer.FCMToken != "" {
		s.workerPool.Enqueue(worker.Job{
			Type: "FCM_NOTIFICATION",
			Payload: worker.FcmJobPayload{
				Tokens: []string{*organizer.FCMToken},
				Title:  "Hackathon Approved",
				Body:   fmt.Sprintf("Your hackathon '%s' has been approved and is now live!", h.Title),
			},
		})
	}

	// 2. Notify all hackers about the new hackathon
	hackerTokens, err := s.pgRepo.GetFcmTokensForAllHackers(ctx)
	if err == nil && len(hackerTokens) > 0 {
		var targetTokens []string
		for _, t := range hackerTokens {
			if organizer != nil && organizer.FCMToken != nil && t == *organizer.FCMToken {
				continue
			}
			targetTokens = append(targetTokens, t)
		}
		if len(targetTokens) > 0 {
			s.workerPool.Enqueue(worker.Job{
				Type: "FCM_NOTIFICATION",
				Payload: worker.FcmJobPayload{
					Tokens: targetTokens,
					Title:  "New Hackathon Published",
					Body:   fmt.Sprintf("A new event '%s' is now open for registrations! check it out.", h.Title),
				},
			})
		}
	}

	return nil
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
	// Fetch real moderation logs from the database (populated by CometChat webhooks)
	logs, err := s.pgRepo.GetModerationLogs(ctx, false)
	if err != nil {
		// Fallback: return empty array if table doesn't exist yet
		return []map[string]interface{}{}, nil
	}
	return logs, nil
}
