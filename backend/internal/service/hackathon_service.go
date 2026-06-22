package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
	"github.com/raunakkumargupta/repo1/backend/internal/worker"
)

const (
	cacheKeyHackathonsApproved = "cache:hackathons:approved"
	cacheKeyHackathonsAll      = "cache:hackathons:all"
	cacheKeyHackathonPrefix    = "cache:hackathon:"
	hackathonCacheTTL          = 60 * time.Second // 60s cache for hackathon lists
)

type HackathonService struct {
	pgRepo     *repository.PostgresRepo
	cache      *repository.Cache
	workerPool *worker.WorkerPool
}

func NewHackathonService(pgRepo *repository.PostgresRepo, cache *repository.Cache, wp *worker.WorkerPool) *HackathonService {
	return &HackathonService{pgRepo: pgRepo, cache: cache, workerPool: wp}
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

	// Invalidate hackathon list caches
	s.invalidateListCache(ctx)

	return h, nil
}

func (s *HackathonService) GetHackathonByID(ctx context.Context, id string) (*models.Hackathon, error) {
	// Try cache first
	if s.cache != nil {
		cached, err := s.cache.Get(ctx, cacheKeyHackathonPrefix+id)
		if err == nil && cached != "" {
			var h models.Hackathon
			if json.Unmarshal([]byte(cached), &h) == nil {
				return &h, nil
			}
		}
	}

	h, err := s.pgRepo.GetHackathonByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Cache the result
	if s.cache != nil && h != nil {
		_ = s.cache.Set(ctx, cacheKeyHackathonPrefix+id, h, hackathonCacheTTL)
	}

	return h, nil
}

func (s *HackathonService) GetHackathons(ctx context.Context, onlyApproved bool, limit, offset *int, search, track, organizerID *string) ([]models.Hackathon, int, error) {
	// If pagination/search/organizer filtering is used, bypass list cache to keep queries fresh and dynamic
	if limit == nil && offset == nil && search == nil && track == nil && organizerID == nil {
		cacheKey := cacheKeyHackathonsAll
		if onlyApproved {
			cacheKey = cacheKeyHackathonsApproved
		}

		// Try cache first
		if s.cache != nil {
			cached, err := s.cache.Get(ctx, cacheKey)
			if err == nil && cached != "" {
				var hackathons []models.Hackathon
				if json.Unmarshal([]byte(cached), &hackathons) == nil {
					log.Printf("[Cache HIT] %s (%d items)", cacheKey, len(hackathons))
					return hackathons, len(hackathons), nil
				}
			}
		}

		// Cache miss — fetch from DB
		hackathons, totalCount, err := s.pgRepo.GetHackathons(ctx, onlyApproved, nil, nil, nil, nil, nil)
		if err != nil {
			return nil, 0, err
		}

		// Store in cache
		if s.cache != nil {
			_ = s.cache.Set(ctx, cacheKey, hackathons, hackathonCacheTTL)
			log.Printf("[Cache MISS → SET] %s (%d items, TTL=%v)", cacheKey, len(hackathons), hackathonCacheTTL)
		}

		return hackathons, totalCount, nil
	}

	// Dynamic paginated / searched query
	return s.pgRepo.GetHackathons(ctx, onlyApproved, limit, offset, search, track, organizerID)
}

func (s *HackathonService) ApproveHackathon(ctx context.Context, id string) error {
	h, err := s.pgRepo.GetHackathonByID(ctx, id)
	if err != nil {
		return err
	}
	if h == nil {
		return errors.New("hackathon not found")
	}

	err = s.pgRepo.ApproveHackathon(ctx, id)
	if err != nil {
		return err
	}

	s.invalidateListCache(ctx)

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

func (s *HackathonService) UpdateHackathonDetails(ctx context.Context, id string, details models.UpdateHackathonDetailsRequest) error {
	err := s.pgRepo.UpdateHackathonDetails(ctx, id, details)
	if err == nil {
		s.invalidateListCache(ctx)
		if s.cache != nil {
			_ = s.cache.Delete(ctx, cacheKeyHackathonPrefix+id)
		}
	}
	return err
}

func (s *HackathonService) DeleteHackathon(ctx context.Context, id string) error {
	err := s.pgRepo.DeleteHackathon(ctx, id)
	if err == nil {
		s.invalidateListCache(ctx)
		if s.cache != nil {
			_ = s.cache.Delete(ctx, cacheKeyHackathonPrefix+id)
		}
	}
	return err
}

func (s *HackathonService) invalidateListCache(ctx context.Context) {
	if s.cache != nil {
		_ = s.cache.Delete(ctx, cacheKeyHackathonsApproved)
		_ = s.cache.Delete(ctx, cacheKeyHackathonsAll)
	}
}
