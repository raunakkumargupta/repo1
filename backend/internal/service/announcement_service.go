package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
	"github.com/raunakkumargupta/repo1/backend/internal/worker"
)

type AnnouncementService struct {
	pgRepo     *repository.PostgresRepo
	workerPool *worker.WorkerPool
}

func NewAnnouncementService(pgRepo *repository.PostgresRepo, wp *worker.WorkerPool) *AnnouncementService {
	return &AnnouncementService{
		pgRepo:     pgRepo,
		workerPool: wp,
	}
}

func (s *AnnouncementService) CreateAnnouncement(ctx context.Context, hackathonID string, req models.AnnouncementRequest) (*models.Announcement, error) {
	if req.Message == "" {
		return nil, errors.New("message cannot be empty")
	}

	ann := &models.Announcement{
		HackathonID: hackathonID,
		Message:     req.Message,
	}

	if err := s.pgRepo.CreateAnnouncement(ctx, ann); err != nil {
		return nil, err
	}

	// Dispatch asynchronous push notifications to all users accepted to this event
	s.workerPool.Enqueue(worker.Job{
		Type:    "FCM_NOTIFICATION",
		Payload: fmt.Sprintf("Mass broadcast to hackathon %s: %s", hackathonID, req.Message),
	})

	return ann, nil
}

func (s *AnnouncementService) GetAnnouncements(ctx context.Context, hackathonID string) ([]models.Announcement, error) {
	return s.pgRepo.GetAnnouncements(ctx, hackathonID)
}
