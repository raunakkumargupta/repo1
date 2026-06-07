package models

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Roles definition
const (
	RoleAdmin     = "Admin"
	RoleManager   = "Manager"
	RoleAgent     = "Agent"
	RoleUser      = "User"
	RoleModerator = "Moderator"
)

type User struct {
	ID           string    `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Role         string    `json:"role" db:"role"`
	FCMToken     *string   `json:"fcm_token" db:"fcm_token"`
	APNSToken    *string   `json:"apns_token" db:"apns_token"`
	Status       string    `json:"status" db:"status"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

type Team struct {
	ID            string    `json:"id" db:"id"`
	TeamName      string    `json:"team_name" db:"team_name"`
	RepositoryURL *string   `json:"repository_url" db:"repository_url"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type Ticket struct {
	ID              string     `json:"id" db:"id"`
	TeamID          string     `json:"team_id" db:"team_id"`
	AssignedAgentID *string    `json:"assigned_agent_id" db:"assigned_agent_id"`
	Description     string     `json:"description" db:"description"`
	Status          string     `json:"status" db:"status"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	ResolvedAt      *time.Time `json:"resolved_at" db:"resolved_at"`
}

type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// Request/Response Structs
type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type ForgetPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

type CreateTicketRequest struct {
	TeamID      string `json:"team_id"`
	Description string `json:"description"`
}

type UpdateTicketStatusRequest struct {
	Status string `json:"status"` // active, resolved
}

type CreateTeamRequest struct {
	TeamName      string  `json:"team_name"`
	RepositoryURL *string `json:"repository_url"`
}

type AddTeamMemberRequest struct {
	UserID string `json:"user_id"`
}

type UpdateUserRoleRequest struct {
	Role string `json:"role"`
}

type Registration struct {
	ID          string    `json:"id" db:"id"`
	UserID      string    `json:"user_id" db:"user_id"`
	GithubURL   *string   `json:"github_url" db:"github_url"`
	LinkedinURL *string   `json:"linkedin_url" db:"linkedin_url"`
	Skills      string    `json:"skills" db:"skills"` // JSON string representation
	Status      string    `json:"status" db:"status"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type CommunityPost struct {
	ID        string    `json:"id" db:"id"`
	AuthorID  string    `json:"author_id" db:"author_id"`
	Title     string    `json:"title" db:"title"`
	Content   string    `json:"content" db:"content"`
	Category  string    `json:"category" db:"category"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type CreateRegistrationRequest struct {
	GithubURL   *string `json:"github_url"`
	LinkedinURL *string `json:"linkedin_url"`
	Skills      string  `json:"skills"` // raw json string from frontend array
	Status      string  `json:"status"`
}

type CreateCommunityPostRequest struct {
	Title    string `json:"title"`
	Content  string `json:"content"`
	Category string `json:"category"`
}
