package models

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Roles definition
const (
	RoleSuperAdmin = "SuperAdmin"
	RoleOrganizer  = "Organizer"
	RoleJudge      = "Judge"
	RoleMentor     = "Mentor"
	RoleHacker     = "Hacker"

	// Backward compatibility mapping if needed
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

type Hackathon struct {
	ID                 string    `json:"id" db:"id"`
	OrganizerID        string    `json:"organizer_id" db:"organizer_id"`
	Title              string    `json:"title" db:"title"`
	Description        string    `json:"description" db:"description"`
	CoverImage         string    `json:"cover_image" db:"cover_image"`
	Tracks             string    `json:"tracks" db:"tracks"` // JSON string representation
	StartDate          time.Time `json:"start_date" db:"start_date"`
	EndDate            time.Time `json:"end_date" db:"end_date"`
	RegistrationStatus string    `json:"registration_status" db:"registration_status"`
	IsApproved         bool      `json:"is_approved" db:"is_approved"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
	ProblemStatement   string    `json:"problem_statement" db:"problem_statement"`
	Prizes             string    `json:"prizes" db:"prizes"`
	Schedule           string    `json:"schedule" db:"schedule"`
	Sponsors           string    `json:"sponsors" db:"sponsors"`
	MinTeamSize        int       `json:"min_team_size" db:"min_team_size"`
	MaxTeamSize        int       `json:"max_team_size" db:"max_team_size"`
	RegistrationFee    string    `json:"registration_fee" db:"registration_fee"`
	Rounds             string    `json:"rounds" db:"rounds"`
}

type Registration struct {
	ID             string    `json:"id" db:"id"`
	UserID         string    `json:"user_id" db:"user_id"`
	HackathonID    string    `json:"hackathon_id" db:"hackathon_id"`
	GithubURL      *string   `json:"github_url" db:"github_url"`
	LinkedinURL    *string   `json:"linkedin_url" db:"linkedin_url"`
	Skills         string    `json:"skills" db:"skills"` // JSON string representation
	TeamPreference string    `json:"team_preference" db:"team_preference"`
	ApprovalStatus string    `json:"approval_status" db:"approval_status"`
	ResumeURL      *string   `json:"resume_url" db:"resume_url"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

type RegistrationProfile struct {
	Registration
	UserName  string  `json:"user_name"`
	UserEmail string  `json:"user_email"`
	Bio       *string `json:"bio"`
	ReadmeMd  *string `json:"readme_md"`
}

type Team struct {
	ID            string    `json:"id" db:"id"`
	HackathonID   string    `json:"hackathon_id" db:"hackathon_id"`
	LeaderID      *string   `json:"leader_id" db:"leader_id"`
	TeamName      string    `json:"team_name" db:"team_name"`
	InviteCode    string    `json:"invite_code" db:"invite_code"`
	RepositoryURL *string   `json:"repository_url" db:"repository_url"`
	IsSubmitted   bool      `json:"is_submitted" db:"is_submitted"`
	IsWinner      bool      `json:"is_winner" db:"is_winner"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
}

type TeamWithMembers struct {
	Team
	Members []User `json:"members"`
}

type TeamJoinRequest struct {
	ID        string    `json:"id" db:"id"`
	TeamID    string    `json:"team_id" db:"team_id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Status    string    `json:"status" db:"status"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`

	// Joined fields for display
	UserName  string `json:"user_name,omitempty" db:"user_name"`
	UserEmail string `json:"user_email,omitempty" db:"user_email"`
	TeamName  string `json:"team_name,omitempty" db:"team_name"`
}

type TeamInvitation struct {
	ID        string    `json:"id" db:"id"`
	TeamID    string    `json:"team_id" db:"team_id"`
	InviteeID string    `json:"invitee_id" db:"invitee_id"`
	Status    string    `json:"status" db:"status"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`

	// Joined fields for display
	TeamName string `json:"team_name,omitempty" db:"team_name"`
}

type Ticket struct {
	ID               string     `json:"id" db:"id"`
	HackathonID      string     `json:"hackathon_id" db:"hackathon_id"`
	TeamID           string     `json:"team_id" db:"team_id"`
	AssignedMentorID *string    `json:"assigned_mentor_id" db:"assigned_mentor_id"`
	Description      string     `json:"description" db:"description"`
	Status           string     `json:"status" db:"status"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	ResolvedAt       *time.Time `json:"resolved_at" db:"resolved_at"`
}

type Evaluation struct {
	ID              string    `json:"id" db:"id"`
	HackathonID     string    `json:"hackathon_id" db:"hackathon_id"`
	TeamID          string    `json:"team_id" db:"team_id"`
	JudgeID         string    `json:"judge_id" db:"judge_id"`
	TechnicalScore  int       `json:"technical_score" db:"technical_score"`
	DesignScore     int       `json:"design_score" db:"design_score"`
	InnovationScore int       `json:"innovation_score" db:"innovation_score"`
	Feedback        string    `json:"feedback" db:"feedback"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

type HackathonStaff struct {
	HackathonID string `json:"hackathon_id" db:"hackathon_id"`
	UserID      string `json:"user_id" db:"user_id"`
	Role        string `json:"role" db:"role"`
}

type Announcement struct {
	ID          string    `json:"id" db:"id"`
	HackathonID string    `json:"hackathon_id" db:"hackathon_id"`
	Message     string    `json:"message" db:"message"`
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

type CreateCommunityPostRequest struct {
	Title    string `json:"title"`
	Content  string `json:"content"`
	Category string `json:"category"`
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

type CreateHackathonRequest struct {
	Title            string    `json:"title"`
	Description      string    `json:"description"`
	CoverImage       string    `json:"cover_image"`
	Tracks           []string  `json:"tracks"`
	StartDate        time.Time `json:"start_date"`
	EndDate          time.Time `json:"end_date"`
	ProblemStatement string    `json:"problem_statement"`
	Prizes           string    `json:"prizes"`
	Schedule         string    `json:"schedule"`
	Sponsors         string    `json:"sponsors"`
	MinTeamSize      int       `json:"min_team_size"`
	MaxTeamSize      int       `json:"max_team_size"`
	RegistrationFee  string    `json:"registration_fee"`
	Rounds           string    `json:"rounds"`
}

type ApplyHackathonRequest struct {
	GithubURL      *string  `json:"github_url"`
	LinkedinURL    *string  `json:"linkedin_url"`
	Skills         []string `json:"skills"`
	TeamPreference string   `json:"team_preference"`
	ResumeURL      *string  `json:"resume_url"`
}

type CreateTeamRequest struct {
	TeamName string `json:"team_name"`
}

type JoinTeamRequest struct {
	InviteCode string `json:"invite_code"`
}

type InviteUserRequest struct {
	Email string `json:"email"`
}

type UpdateJoinRequestStatus struct {
	Status string `json:"status"` // Accepted, Rejected
}

type UpdateInvitationStatus struct {
	Status string `json:"status"` // Accepted, Declined
}

type UpdateRepoRequest struct {
	RepositoryURL string `json:"repository_url"`
}

type CreateTicketRequest struct {
	TeamID      string `json:"team_id"`
	Description string `json:"description"`
}

type EvaluateProjectRequest struct {
	TeamID          string `json:"team_id"`
	TechnicalScore  int    `json:"technical_score"`
	DesignScore     int    `json:"design_score"`
	InnovationScore int    `json:"innovation_score"`
	Feedback        string `json:"feedback"`
}

type StaffAssignmentRequest struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"` // Judge, Mentor
}

type HackathonStaffResponse struct {
	UserID string `json:"user_id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Role   string `json:"role"`
}

type AnnouncementRequest struct {
	Message string `json:"message"`
}

type UpdateRegistrationStatusRequest struct {
	Status string `json:"status"` // Pending, Accepted, Rejected
}

type UpdateUserStatusRequest struct {
	Status string `json:"status"` // active, deactivated (banned)
}

type CreateRegistrationRequest struct {
	GithubURL   *string `json:"github_url"`
	LinkedinURL *string `json:"linkedin_url"`
	Skills      string  `json:"skills"` // raw json string from frontend
	Status      string  `json:"status"`
}

type UpdateTicketStatusRequest struct {
	Status string `json:"status"` // active, resolved
}

type UpdateUserRoleRequest struct {
	Role string `json:"role"`
}

type HackerProfile struct {
	UserID                 string    `json:"user_id" db:"user_id"`
	Gender                 string    `json:"gender" db:"gender"`
	TShirtSize             string    `json:"tshirt_size" db:"tshirt_size"`
	City                   string    `json:"city" db:"city"`
	PhoneNumber            string    `json:"phone_number" db:"phone_number"`
	EmergencyContactName   string    `json:"emergency_contact_name" db:"emergency_contact_name"`
	EmergencyContactNumber string    `json:"emergency_contact_number" db:"emergency_contact_number"`
	Bio                    string    `json:"bio" db:"bio"`
	ReadmeMd               string    `json:"readme_md" db:"readme_md"`
	HasFormalEducation     bool      `json:"has_formal_education" db:"has_formal_education"`
	DegreeType             string    `json:"degree_type" db:"degree_type"`
	Institution            string    `json:"institution" db:"institution"`
	FieldOfStudy           string    `json:"field_of_study" db:"field_of_study"`
	GradYear               int       `json:"grad_year" db:"grad_year"`
	GradMonth              string    `json:"grad_month" db:"grad_month"`
	DietaryPreference      string    `json:"dietary_preference" db:"dietary_preference"`
	Allergies              string    `json:"allergies" db:"allergies"`
	GithubURL              string    `json:"github_url" db:"github_url"`
	LinkedinURL            string    `json:"linkedin_url" db:"linkedin_url"`
	ResumeURL              string    `json:"resume_url" db:"resume_url"`
	Skills                 string    `json:"skills" db:"skills"`
	DefaultTeamPreference  string    `json:"default_team_preference" db:"default_team_preference"`
	Industry               string    `json:"industry" db:"industry"`
	YearsOfExperience      int       `json:"years_of_experience" db:"years_of_experience"`
	MentorExpertise        string    `json:"mentor_expertise" db:"mentor_expertise"`
	CreatedAt              time.Time `json:"created_at" db:"created_at"`
	UpdatedAt              time.Time `json:"updated_at" db:"updated_at"`
}

type HackerProfileRequest struct {
	Gender                 string `json:"gender"`
	TShirtSize             string `json:"tshirt_size"`
	City                   string `json:"city"`
	PhoneNumber            string `json:"phone_number"`
	EmergencyContactName   string `json:"emergency_contact_name"`
	EmergencyContactNumber string `json:"emergency_contact_number"`
	Bio                    string `json:"bio"`
	ReadmeMd               string `json:"readme_md"`
	HasFormalEducation     bool   `json:"has_formal_education"`
	DegreeType             string `json:"degree_type"`
	Institution            string `json:"institution"`
	FieldOfStudy           string `json:"field_of_study"`
	GradYear               int    `json:"grad_year"`
	GradMonth              string `json:"grad_month"`
	DietaryPreference      string `json:"dietary_preference"`
	Allergies              string `json:"allergies"`
	GithubURL              string `json:"github_url"`
	LinkedinURL            string `json:"linkedin_url"`
	ResumeURL              string `json:"resume_url"`
	Skills                 string `json:"skills"`
	DefaultTeamPreference  string `json:"default_team_preference"`
}

type UpdateHackathonDetailsRequest struct {
	Title            string    `json:"title"`
	Tracks           string    `json:"tracks"`
	CoverImage       string    `json:"cover_image"`
	StartDate        time.Time `json:"start_date"`
	EndDate          time.Time `json:"end_date"`
	Description      string    `json:"description"`
	ProblemStatement string    `json:"problem_statement"`
	Prizes           string    `json:"prizes"`
	Schedule         string    `json:"schedule"`
	Sponsors         string    `json:"sponsors"`
	MinTeamSize      int       `json:"min_team_size"`
	MaxTeamSize      int       `json:"max_team_size"`
	RegistrationFee  string    `json:"registration_fee"`
	Rounds           string    `json:"rounds"`
}


