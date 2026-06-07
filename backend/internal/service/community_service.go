package service

import (
	"context"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

type CommunityService struct {
	pgRepo *repository.PostgresRepo
}

func NewCommunityService(pgRepo *repository.PostgresRepo) *CommunityService {
	return &CommunityService{pgRepo: pgRepo}
}

func (s *CommunityService) CreatePost(ctx context.Context, authorID string, req models.CreateCommunityPostRequest) (*models.CommunityPost, error) {
	post := &models.CommunityPost{
		AuthorID: authorID,
		Title:    req.Title,
		Content:  req.Content,
		Category: req.Category,
	}

	if err := s.pgRepo.CreateCommunityPost(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

func (s *CommunityService) GetPosts(ctx context.Context, category string) ([]models.CommunityPost, error) {
	return s.pgRepo.GetCommunityPosts(ctx, category)
}
