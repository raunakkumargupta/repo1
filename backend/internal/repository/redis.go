package repository

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisRepo struct {
	client *redis.Client
}

func NewRedisRepo(client *redis.Client) *RedisRepo {
	return &RedisRepo{client: client}
}

// StoreResetToken stores a password reset token with a TTL
func (r *RedisRepo) StoreResetToken(ctx context.Context, token, email string, ttl time.Duration) error {
	key := "pwd_reset:" + token
	return r.client.Set(ctx, key, email, ttl).Err()
}

// GetEmailByResetToken retrieves the email associated with a reset token
func (r *RedisRepo) GetEmailByResetToken(ctx context.Context, token string) (string, error) {
	key := "pwd_reset:" + token
	return r.client.Get(ctx, key).Result()
}

// DeleteResetToken deletes a reset token after it's used
func (r *RedisRepo) DeleteResetToken(ctx context.Context, token string) error {
	key := "pwd_reset:" + token
	return r.client.Del(ctx, key).Err()
}

// CacheGlobalAnnouncement stores a global announcement in Redis
func (r *RedisRepo) CacheGlobalAnnouncement(ctx context.Context, announcement string) error {
	return r.client.Set(ctx, "global:announcement", announcement, 0).Err()
}

// GetGlobalAnnouncement retrieves the current global announcement
func (r *RedisRepo) GetGlobalAnnouncement(ctx context.Context) (string, error) {
	return r.client.Get(ctx, "global:announcement").Result()
}

// AddTicketToQueue adds an unassigned ticket ID to the Redis queue
func (r *RedisRepo) AddTicketToQueue(ctx context.Context, ticketID string) error {
	return r.client.LPush(ctx, "tickets:unassigned", ticketID).Err()
}

// PopTicketFromQueue retrieves and removes an unassigned ticket ID from the Redis queue
func (r *RedisRepo) PopTicketFromQueue(ctx context.Context) (string, error) {
	return r.client.RPop(ctx, "tickets:unassigned").Result()
}

// GetUnassignedTicketIDs retrieves all unassigned ticket IDs from the queue without removing them
func (r *RedisRepo) GetUnassignedTicketIDs(ctx context.Context) ([]string, error) {
	return r.client.LRange(ctx, "tickets:unassigned", 0, -1).Result()
}

// RemoveTicketFromQueue removes a specific ticket ID from the queue
func (r *RedisRepo) RemoveTicketFromQueue(ctx context.Context, ticketID string) error {
	return r.client.LRem(ctx, "tickets:unassigned", 0, ticketID).Err()
}

