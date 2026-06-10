package service

import (
	"context"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
)

type UserService struct {
	pgRepo *repository.PostgresRepo
}

func NewUserService(pgRepo *repository.PostgresRepo) *UserService {
	return &UserService{pgRepo: pgRepo}
}

func (s *UserService) GetUsers(ctx context.Context) ([]models.User, error) {
	return s.pgRepo.GetUsers(ctx)
}

func (s *UserService) UpdateUserRole(ctx context.Context, userID, role string) error {
	return s.pgRepo.UpdateUserRole(ctx, userID, role)
}

func (s *UserService) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	return s.pgRepo.GetUserByID(ctx, id)
}

func (s *UserService) SaveFcmToken(ctx context.Context, userID, token, platform string) error {
	return s.pgRepo.UpsertFcmToken(ctx, userID, token, platform)
}
