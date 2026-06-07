package handler

import (
	"net/http"

	"strings"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/raunakkumargupta/repo1/backend/internal/middleware"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/redis/go-redis/v9"
)

func NewRouter(authHandler *AuthHandler, ticketHandler *TicketHandler, teamHandler *TeamHandler, userHandler *UserHandler, regHandler *RegistrationHandler, commHandler *CommunityHandler, jwtSecret string, allowedOrigins string, redisClient *redis.Client) *chi.Mux {
	r := chi.NewRouter()

	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(middleware.SecurityHeadersMiddleware)
	r.Use(middleware.MaxBytesReaderMiddleware(1024 * 1024)) // 1MB Limit

	// CORS config
	origins := strings.Split(allowedOrigins, ",")
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Rate Limit Middleware specifically for potentially abused POST routes
	// 5 requests per second capacity 5
	rateLimiter := middleware.RateLimitMiddleware(redisClient, 5, 5)

	// Public Routes
	r.Group(func(r chi.Router) {
		r.Post("/api/auth/register", authHandler.Register)
		r.With(rateLimiter).Post("/api/auth/login", authHandler.Login)
		r.Post("/api/auth/forget-password", authHandler.ForgetPassword)
		r.Post("/api/auth/reset-password", authHandler.ResetPassword)
	})

	// Protected Routes
	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(jwtSecret))
		
		r.Post("/api/auth/logout", authHandler.Logout)

		// Example RBAC route for Admins only
		r.With(middleware.RequireRole(models.RoleAdmin)).Get("/api/admin/dashboard", func(w http.ResponseWriter, req *http.Request) {
			w.Write([]byte("Welcome to the admin dashboard!"))
		})

		// Example RBAC route for Agents and Managers
		r.With(middleware.RequireRole(models.RoleAgent, models.RoleManager)).Get("/api/agent/tickets", func(w http.ResponseWriter, req *http.Request) {
			w.Write([]byte("Here are the active tickets..."))
		})
		
		// Example RBAC route for Users
		r.With(middleware.RequireRole(models.RoleUser)).Get("/api/user/profile", func(w http.ResponseWriter, req *http.Request) {
			claims := middleware.GetUserClaims(req.Context())
			w.Write([]byte("Hello user " + claims.UserID))
		})
		// Ticket Routes
		r.With(middleware.RequireRole(models.RoleUser), rateLimiter).Post("/api/tickets", ticketHandler.CreateTicket)
		r.With(middleware.RequireRole(models.RoleAgent, models.RoleManager)).Get("/api/tickets/queue", ticketHandler.GetQueue)
		r.With(middleware.RequireRole(models.RoleAgent)).Put("/api/tickets/{id}/status", ticketHandler.UpdateStatus)

		// Team Routes
		r.With(middleware.RequireRole(models.RoleAdmin, models.RoleManager)).Post("/api/teams", teamHandler.CreateTeam)
		r.With(middleware.RequireRole(models.RoleAdmin, models.RoleManager)).Post("/api/teams/{id}/members", teamHandler.AddMember)

		// User Routes
		r.With(middleware.RequireRole(models.RoleAdmin)).Get("/api/users", userHandler.GetUsers)
		r.With(middleware.RequireRole(models.RoleAdmin)).Put("/api/users/{id}/role", userHandler.UpdateRole)

		// Registration Routes
		r.With(middleware.RequireRole(models.RoleUser)).Post("/api/registrations", regHandler.CreateRegistration)
		r.With(middleware.RequireRole(models.RoleUser)).Get("/api/registrations/me", regHandler.GetMyRegistration)

		// Community Routes
		r.With(middleware.RequireRole(models.RoleUser, models.RoleAdmin, models.RoleManager, models.RoleAgent, models.RoleModerator)).Post("/api/community", commHandler.CreatePost)
		r.With(middleware.RequireRole(models.RoleUser, models.RoleAdmin, models.RoleManager, models.RoleAgent, models.RoleModerator)).Get("/api/community", commHandler.GetPosts)
	})

	return r
}
