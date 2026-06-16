package handler

import (
	"strings"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/raunakkumargupta/repo1/backend/internal/middleware"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/redis/go-redis/v9"
)

func NewRouter(
	authHandler *AuthHandler,
	ticketHandler *TicketHandler,
	teamHandler *TeamHandler,
	userHandler *UserHandler,
	regHandler *RegistrationHandler,
	commHandler *CommunityHandler,
	hackathonHandler *HackathonHandler,
	judgeHandler *JudgeHandler,
	superAdminHandler *SuperAdminHandler,
	staffHandler *StaffHandler,
	announcementHandler *AnnouncementHandler,
	profileHandler *ProfileHandler,
	webhookHandler *CometChatWebhookHandler,
	jwtSecret string,
	allowedOrigins string,
	redisClient *redis.Client,
) *chi.Mux {
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

	// Rate Limit Middleware
	rateLimiter := middleware.RateLimitMiddleware(redisClient, 10, 10)

	// ==========================================
	// Public Routes
	// ==========================================
	r.Group(func(r chi.Router) {
		r.Post("/api/auth/register", authHandler.Register)
		r.With(rateLimiter).Post("/api/auth/login", authHandler.Login)
		r.Post("/api/auth/forget-password", authHandler.ForgetPassword)
		r.Post("/api/auth/reset-password", authHandler.ResetPassword)
		
		// Public hackathon list/details
		r.Get("/api/hackathons", hackathonHandler.ListApproved)
		r.Get("/api/hackathons/{id}", hackathonHandler.GetByID)
		
		// Community reads
		r.Get("/api/community", commHandler.GetPosts)

		// CometChat Webhooks (public — validated by CometChat secret)
		r.Post("/api/webhooks/cometchat", webhookHandler.HandleWebhook)
	})

	// ==========================================
	// Protected Routes (Required Authentication)
	// ==========================================
	r.Group(func(r chi.Router) {
		r.Use(middleware.AuthMiddleware(jwtSecret))
		
		r.Post("/api/auth/logout", authHandler.Logout)
		r.Get("/api/auth/me", userHandler.GetMe)
		r.Get("/api/auth/me/staff-hackathons", staffHandler.GetMyStaffHackathons)
		// Mobile FCM token registration
		r.Post("/api/users/fcm-token", userHandler.RegisterFcmToken)

		// Create a hackathon (accessible to all authenticated users)
		r.Post("/api/hackathons", hackathonHandler.Create)
		// Fetch all hackathons (including pending)
		r.Get("/api/hackathons/all", hackathonHandler.ListAll)

		// Hacker Profile (Global Profile)
		r.Get("/api/profile/me", profileHandler.GetMyProfile)
		r.Post("/api/profile/me", profileHandler.UpdateMyProfile)
		r.Get("/api/users/{id}/profile", profileHandler.GetPublicProfile)

		// For backward compatibility (legacy routes)
		r.Post("/api/registrations", regHandler.CreateRegistration)
		r.Get("/api/registrations/me", regHandler.GetMyRegistration)
		r.Post("/api/community", commHandler.CreatePost)

		// ------------------------------------------
		// Hacker (User) Roles - Shared
		// ------------------------------------------
		r.Group(func(r chi.Router) {
			// Apply to hackathon
			r.Post("/api/hackathons/{id}/apply", regHandler.Apply)
			// Get application details
			r.Get("/api/hackathons/{id}/my-registration", regHandler.GetMyRegistration)
			r.Get("/api/hackathons/{id}/staff-role", staffHandler.GetMyRole)
			
			// Teams & Team Management
			r.Post("/api/hackathons/{id}/teams", teamHandler.Create)
			r.Post("/api/hackathons/{id}/teams/join", teamHandler.Join)
			r.Get("/api/hackathons/{id}/my-team", teamHandler.GetMyTeam)
			r.Put("/api/hackathons/{id}/teams/submit", teamHandler.SubmitProject)
			r.Delete("/api/hackathons/{id}/teams/{team_id}/members/{member_id}", teamHandler.RemoveMember)
			r.Get("/api/hackathons/{id}/teams/public", teamHandler.GetPublicTeams)

			// Team Join Requests
			r.Post("/api/hackathons/{id}/teams/{team_id}/request", teamHandler.RequestToJoin)
			r.Delete("/api/hackathons/{id}/requests/{req_id}", teamHandler.WithdrawRequest)
			r.Put("/api/hackathons/{id}/requests/{req_id}", teamHandler.ManageRequest)
			r.Get("/api/hackathons/{id}/teams/{team_id}/requests", teamHandler.GetTeamRequests)
			r.Get("/api/hackathons/{id}/my-requests", teamHandler.GetMyRequests)

			// Team Invitations
			r.Post("/api/hackathons/{id}/teams/{team_id}/invite", teamHandler.InviteUser)
			r.Put("/api/hackathons/{id}/invitations/{inv_id}", teamHandler.ManageInvitation)
			r.Get("/api/hackathons/{id}/my-invitations", teamHandler.GetMyInvitations)
			
			// Tickets
			r.Post("/api/hackathons/{id}/tickets", ticketHandler.CreateTicket)
			r.Get("/api/hackathons/{id}/my-tickets", ticketHandler.GetMyTickets)
			
			// Broadcast announcements history
			r.Get("/api/hackathons/{id}/broadcasts", announcementHandler.List)
		})

		// ------------------------------------------
		// Organizer
		// ------------------------------------------
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole(models.RoleOrganizer, models.RoleHacker, models.RoleManager, models.RoleAdmin, models.RoleSuperAdmin))
			
			// Update hackathon event details (description, prizes, schedule, rounds etc.)
			r.Patch("/api/hackathons/{id}/details", hackathonHandler.UpdateDetails)
			
			// View metrics & details
			r.Get("/api/hackathons/{id}/applications", regHandler.ListByHackathon)
			r.Put("/api/registrations/{reg_id}/status", regHandler.UpdateStatus)
			
			// Staffing
			r.Post("/api/hackathons/{id}/staff", staffHandler.Assign)
			r.Get("/api/hackathons/{id}/staff", staffHandler.GetStaffList)
			
			// Broadcast announcements
			r.Post("/api/hackathons/{id}/broadcasts", announcementHandler.Create)
			
			// Submissions list
			r.Get("/api/hackathons/{id}/submissions", teamHandler.ListSubmissions)
			
			// Mark winner
			r.Put("/api/hackathons/{id}/teams/{team_id}/winner", teamHandler.MarkWinner)
		})

		// ------------------------------------------
		// Mentor (Agent)
		// ------------------------------------------
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole(models.RoleMentor, models.RoleAgent, models.RoleOrganizer, models.RoleAdmin, models.RoleSuperAdmin))
			
			r.Get("/api/hackathons/{id}/tickets", ticketHandler.GetQueue)
			r.Put("/api/tickets/{ticket_id}/status", ticketHandler.UpdateStatus)
		})

		// ------------------------------------------
		// Judge
		// ------------------------------------------
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole(models.RoleJudge, models.RoleModerator, models.RoleOrganizer, models.RoleAdmin, models.RoleSuperAdmin))
			
			r.Get("/api/hackathons/{id}/projects", judgeHandler.ListSubmittedProjects)
			r.Post("/api/hackathons/{id}/evaluations", judgeHandler.SubmitEvaluation)
		})

		// ------------------------------------------
		// Super Admin
		// ------------------------------------------
		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireRole(models.RoleSuperAdmin, models.RoleAdmin))
			
			r.Get("/api/admin/organizers/pending", superAdminHandler.ListPending)
			r.Put("/api/admin/organizers/{id}/status", superAdminHandler.Approve)
			r.Get("/api/admin/metrics", superAdminHandler.GetMetrics)
			r.Get("/api/admin/moderation/logs", superAdminHandler.GetModerationLogs)
			r.Put("/api/admin/users/{id}/status", superAdminHandler.BanUser)
			r.Delete("/api/admin/hackathons/{id}", hackathonHandler.DeleteHackathon)
			
			// Legacy user fetch
			r.Get("/api/users", userHandler.GetUsers)
			r.Put("/api/users/{id}/role", userHandler.UpdateRole)
		})
	})

	return r
}
