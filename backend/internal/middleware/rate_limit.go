package middleware

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

// RateLimitMiddleware implements a Token Bucket algorithm in Redis using Lua script
func RateLimitMiddleware(redisClient *redis.Client, rate int, capacity int) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := getIP(r)
			key := fmt.Sprintf("ratelimit:%s:%s", r.URL.Path, ip)

			// Lua Script for atomic token bucket
			script := `
				local tokens_key = KEYS[1]
				local timestamp_key = KEYS[2]
				
				local rate = tonumber(ARGV[1])
				local capacity = tonumber(ARGV[2])
				local now = tonumber(ARGV[3])
				local requested = 1
				
				local fill_time = capacity / rate
				local ttl = math.floor(fill_time * 2)
				
				local last_tokens = tonumber(redis.call("get", tokens_key))
				if last_tokens == nil then
					last_tokens = capacity
				end
				
				local last_refreshed = tonumber(redis.call("get", timestamp_key))
				if last_refreshed == nil then
					last_refreshed = 0
				end
				
				local delta = math.max(0, now - last_refreshed)
				local filled_tokens = math.min(capacity, last_tokens + (delta * rate))
				local allowed = filled_tokens >= requested
				local new_tokens = filled_tokens
				if allowed then
					new_tokens = filled_tokens - requested
				end
				
				redis.call("setex", tokens_key, ttl, new_tokens)
				redis.call("setex", timestamp_key, ttl, now)
				
				return allowed
			`

			now := float64(time.Now().UnixNano()) / float64(time.Second)
			keys := []string{key + ":tokens", key + ":ts"}
			
			res, err := redisClient.Eval(context.Background(), script, keys, rate, capacity, now).Result()
			if err != nil {
				// Fail open if Redis fails (could fail closed depending on strictness requirements)
				next.ServeHTTP(w, r)
				return
			}

			allowed, ok := res.(int64)
			if !ok || allowed == 0 {
				http.Error(w, "429 Too Many Requests", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func getIP(r *http.Request) string {
	ip := r.Header.Get("X-Forwarded-For")
	if ip == "" {
		ip = r.Header.Get("X-Real-Ip")
	}
	if ip != "" {
		ip = strings.Split(ip, ",")[0]
		return ip
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
