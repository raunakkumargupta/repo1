package service

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

const (
	cacheKeyHackathonsApproved = "cache:hackathons:approved"
	cacheKeyHackathonsAll      = "cache:hackathons:all"
	cacheKeyHackathonPrefix    = "cache:hackathon:"
	hackathonCacheTTL          = 60 * time.Second // 60s cache for hackathon lists
)

type HackathonService struct {
	pgRepo *repository.PostgresRepo
	cache  *repository.Cache
}

func NewHackathonService(pgRepo *repository.PostgresRepo, cache *repository.Cache) *HackathonService {
	return &HackathonService{pgRepo: pgRepo, cache: cache}
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

func (s *HackathonService) GetHackathons(ctx context.Context, onlyApproved bool) ([]models.Hackathon, error) {
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
				return hackathons, nil
			}
		}
	}

	// Cache miss — fetch from DB
	hackathons, err := s.pgRepo.GetHackathons(ctx, onlyApproved)
	if err != nil {
		return nil, err
	}

	// Store in cache
	if s.cache != nil {
		_ = s.cache.Set(ctx, cacheKey, hackathons, hackathonCacheTTL)
		log.Printf("[Cache MISS → SET] %s (%d items, TTL=%v)", cacheKey, len(hackathons), hackathonCacheTTL)
	}

	return hackathons, nil
}

func (s *HackathonService) ApproveHackathon(ctx context.Context, id string) error {
	err := s.pgRepo.ApproveHackathon(ctx, id)
	if err == nil {
		s.invalidateListCache(ctx)
	}
	return err
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
