package service

import (
	"context"
	"errors"
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

	// Sync CometChat group asynchronously
	go s.syncCometChatSupportGroup(context.Background(), ticketID, status, mentorID)

	return nil
}

// Backwards compatibility method
func (s *TicketService) GetUnassignedTickets(ctx context.Context) ([]models.Ticket, error) {
	return s.pgRepo.GetTicketsByQueue(ctx)
}

func (s *TicketService) ResolveOwnTicket(ctx context.Context, hackathonID, ticketID, userID string) error {
	// 1. Get the ticket
	tickets, err := s.pgRepo.GetTicketsByIDs(ctx, []string{ticketID})
	if err != nil {
		return fmt.Errorf("failed to fetch ticket: %w", err)
	}
	if len(tickets) == 0 {
		return errors.New("ticket not found")
	}
	ticket := tickets[0]

	// 2. Verify hackathon matches
	if ticket.HackathonID != hackathonID {
		return errors.New("ticket does not belong to this hackathon")
	}

	// 3. Get user's team
	team, err := s.pgRepo.GetTeamByUserIDAndHackathon(ctx, userID, hackathonID)
	if err != nil {
		return fmt.Errorf("failed to verify team: %w", err)
	}
	if team == nil || team.ID != ticket.TeamID {
		return errors.New("unauthorized: you do not have permission to resolve this ticket")
	}

	// 4. Update status to 'Resolved'
	err = s.pgRepo.ResolveTicket(ctx, ticketID)
	if err != nil {
		return err
	}

	// Sync CometChat group asynchronously (delete group)
	go s.syncCometChatSupportGroup(context.Background(), ticketID, "Resolved", "")

	return nil
}

func (s *TicketService) syncCometChatSupportGroup(ctx context.Context, ticketID, status, mentorID string) {
	ccService := NewCometChatService()

	if status == "Active" {
		// 1. Fetch ticket details
		tickets, err := s.pgRepo.GetTicketsByIDs(ctx, []string{ticketID})
		if err != nil || len(tickets) == 0 {
			fmt.Printf("[CometChat Sync] Ticket not found: %s\n", ticketID)
			return
		}
		ticket := tickets[0]

		// 2. Fetch Team details
		team, err := s.pgRepo.GetTeamByID(ctx, ticket.TeamID)
		teamName := ""
		if err == nil && team != nil {
			teamName = team.TeamName
		}
		if teamName == "" {
			teamName = fmt.Sprintf("Team %s", ticket.TeamID[:8])
		}

		// 3. Create CometChat Group
		tags := []string{"hackathon:" + ticket.HackathonID, "support-ticket"}
		groupName := fmt.Sprintf("Support Chat: %s", teamName)
		err = ccService.CreateGroup(ctx, ticketID, groupName, mentorID, tags)
		if err != nil {
			fmt.Printf("[CometChat Sync] Failed to create support group %s: %v\n", ticketID, err)
			return
		}

		// 4. Add mentor as participant
		_ = ccService.AddMemberToGroup(ctx, ticketID, mentorID)

		// 5. Get all team members and add them
		members, err := s.pgRepo.GetTeamMembers(ctx, ticket.TeamID)
		if err == nil {
			for _, m := range members {
				_ = ccService.AddMemberToGroup(ctx, ticketID, m.ID)
			}
		}
	} else if status == "Resolved" {
		// Delete support group when ticket is resolved
		err := ccService.DeleteGroup(ctx, ticketID)
		if err != nil {
			fmt.Printf("[CometChat Sync] Failed to delete support group %s: %v\n", ticketID, err)
		}
	}
}

func (s *TicketService) GetResolvedTicketsByMentor(ctx context.Context, hackathonID, mentorID string) ([]models.Ticket, error) {
	return s.pgRepo.GetResolvedTicketsByMentor(ctx, hackathonID, mentorID)
}

