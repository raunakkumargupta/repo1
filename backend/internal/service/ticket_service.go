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

func (s *TicketService) CreateTicket(ctx context.Context, hackathonID string, req models.CreateTicketRequest) (*models.Ticket, error) {
	// Spam prevention: check if team already has an open/active ticket
	hasOpen, err := s.pgRepo.HasOpenTicket(ctx, hackathonID, req.TeamID)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing tickets: %w", err)
	}
	if hasOpen {
		return nil, fmt.Errorf("your team already has an open ticket. Please wait for it to be resolved before creating another")
	}

	ticket := &models.Ticket{
		HackathonID: hackathonID,
		TeamID:      req.TeamID,
		Description: req.Description,
		Status:      "Open",
	}

	if err := s.pgRepo.CreateTicket(ctx, ticket); err != nil {
		return nil, err
	}

	// Add unassigned ticket ID to Redis Queue (event-specific list)
	key := fmt.Sprintf("hackathon:%s:open_tickets", hackathonID)
	_ = s.redisRepo.AddTicketToQueue(ctx, key) // fallback cache mapping

	// Dispatch asynchronous auditing
	s.workerPool.Enqueue(worker.Job{
		Type:    "AUDIT_LOG",
		Payload: fmt.Sprintf("Ticket %s created for Team %s in Hackathon %s", ticket.ID, ticket.TeamID, hackathonID),
	})

	return ticket, nil
}

func (s *TicketService) GetMyTeamTickets(ctx context.Context, hackathonID, teamID string) ([]models.Ticket, error) {
	return s.pgRepo.GetTicketsByTeam(ctx, hackathonID, teamID)
}

func (s *TicketService) GetHackathonTicketsQueue(ctx context.Context, hackathonID string) ([]models.Ticket, error) {
	return s.pgRepo.GetTicketsQueue(ctx, hackathonID)
}

func (s *TicketService) UpdateTicketStatus(ctx context.Context, ticketID, status, mentorID string) error {
	err := s.pgRepo.UpdateTicketStatus(ctx, ticketID, status, mentorID)
	if err != nil {
		return err
	}

	// Fetch ticket team and send push notification to all team members
	tickets, err := s.pgRepo.GetTicketsByIDs(ctx, []string{ticketID})
	if err == nil && len(tickets) > 0 {
		ticket := tickets[0]
		tokens, err := s.pgRepo.GetFcmTokensForTeam(ctx, ticket.TeamID)
		if err == nil && len(tokens) > 0 {
			s.workerPool.Enqueue(worker.Job{
				Type: "FCM_NOTIFICATION",
				Payload: worker.FcmJobPayload{
					Tokens: tokens,
					Title:  "Ticket Update",
					Body:   fmt.Sprintf("Ticket status has been updated to %s", status),
				},
			})
		}
	}

	return nil
}

// Backwards compatibility method
func (s *TicketService) GetUnassignedTickets(ctx context.Context) ([]models.Ticket, error) {
	return s.pgRepo.GetTicketsByQueue(ctx)
}
