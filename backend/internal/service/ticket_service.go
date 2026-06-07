package service

import (
	"context"

	"fmt"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
	"github.com/raunakkumargupta/repo1/backend/internal/worker"
)

type TicketService struct {
	pgRepo     *repository.PostgresRepo
	redisRepo  *repository.RedisRepo
	workerPool *worker.WorkerPool
}

func NewTicketService(pgRepo *repository.PostgresRepo, redisRepo *repository.RedisRepo, wp *worker.WorkerPool) *TicketService {
	return &TicketService{
		pgRepo:     pgRepo,
		redisRepo:  redisRepo,
		workerPool: wp,
	}
}

func (s *TicketService) CreateTicket(ctx context.Context, req models.CreateTicketRequest) (*models.Ticket, error) {
	ticket := &models.Ticket{
		TeamID:      req.TeamID,
		Description: req.Description,
		Status:      "open",
	}

	if err := s.pgRepo.CreateTicket(ctx, ticket); err != nil {
		return nil, err
	}

	// Add to Redis Queue
	if err := s.redisRepo.AddTicketToQueue(ctx, ticket.ID); err != nil {
		// Even if Redis fails, the ticket is in the DB.
		// A background sync could recover this.
		return ticket, nil 
	}

	// Dispatch asynchronous auditing
	s.workerPool.Enqueue(worker.Job{
		Type:    "AUDIT_LOG",
		Payload: fmt.Sprintf("Ticket %s created for Team %s", ticket.ID, ticket.TeamID),
	})

	return ticket, nil
}

func (s *TicketService) GetUnassignedTickets(ctx context.Context) ([]models.Ticket, error) {
	ids, err := s.redisRepo.GetUnassignedTicketIDs(ctx)
	if err != nil {
		return nil, err
	}

	return s.pgRepo.GetTicketsByIDs(ctx, ids)
}

func (s *TicketService) UpdateTicketStatus(ctx context.Context, ticketID, status, agentID string) error {
	err := s.pgRepo.UpdateTicketStatus(ctx, ticketID, status, agentID)
	if err != nil {
		return err
	}

	// If the ticket is being assigned (active) or resolved, remove it from the unassigned queue
	if status == "active" || status == "resolved" {
		_ = s.redisRepo.RemoveTicketFromQueue(ctx, ticketID)
	}

	// Dispatch asynchronous notification
	s.workerPool.Enqueue(worker.Job{
		Type:    "FCM_NOTIFICATION",
		Payload: fmt.Sprintf("Ticket %s status updated to %s by agent %s", ticketID, status, agentID),
	})

	return nil
}
