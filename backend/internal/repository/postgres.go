package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
)

type PostgresRepo struct {
	pool *pgxpool.Pool
}

func NewPostgresRepo(pool *pgxpool.Pool) *PostgresRepo {
	return &PostgresRepo{pool: pool}
}

func (r *PostgresRepo) CreateUser(ctx context.Context, user *models.User) error {
	query := `
		INSERT INTO users (name, email, password_hash, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, status, created_at
	`
	err := r.pool.QueryRow(ctx, query, user.Name, user.Email, user.PasswordHash, user.Role).
		Scan(&user.ID, &user.Status, &user.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (r *PostgresRepo) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	query := `
		SELECT id, name, email, password_hash, role, fcm_token, apns_token, status, created_at
		FROM users
		WHERE email = $1
	`
	user := &models.User{}
	err := r.pool.QueryRow(ctx, query, email).
		Scan(
			&user.ID, &user.Name, &user.Email, &user.PasswordHash,
			&user.Role, &user.FCMToken, &user.APNSToken, &user.Status, &user.CreatedAt,
		)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil // Return nil, nil instead of error for standard 'not found' check
		}
		return nil, err
	}
	return user, nil
}

func (r *PostgresRepo) UpdateUserPassword(ctx context.Context, userID, newHash string) error {
	query := `UPDATE users SET password_hash = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, newHash, userID)
	return err
}

func (r *PostgresRepo) CreateTicket(ctx context.Context, ticket *models.Ticket) error {
	query := `
		INSERT INTO tickets (team_id, description, status)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, ticket.TeamID, ticket.Description, ticket.Status).
		Scan(&ticket.ID, &ticket.CreatedAt)
}

func (r *PostgresRepo) UpdateTicketStatus(ctx context.Context, ticketID, status, agentID string) error {
	var query string
	var err error
	
	if status == "resolved" {
		query = `UPDATE tickets SET status = $1, assigned_agent_id = $2, resolved_at = CURRENT_TIMESTAMP WHERE id = $3`
		_, err = r.pool.Exec(ctx, query, status, agentID, ticketID)
	} else if status == "active" {
		query = `UPDATE tickets SET status = $1, assigned_agent_id = $2 WHERE id = $3`
		_, err = r.pool.Exec(ctx, query, status, agentID, ticketID)
	} else {
		query = `UPDATE tickets SET status = $1 WHERE id = $2`
		_, err = r.pool.Exec(ctx, query, status, ticketID)
	}
	return err
}

func (r *PostgresRepo) CreateTeam(ctx context.Context, team *models.Team) error {
	query := `
		INSERT INTO teams (team_name, repository_url)
		VALUES ($1, $2)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, team.TeamName, team.RepositoryURL).
		Scan(&team.ID, &team.CreatedAt)
}

func (r *PostgresRepo) AddUserToTeam(ctx context.Context, teamID, userID string) error {
	query := `INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)`
	_, err := r.pool.Exec(ctx, query, teamID, userID)
	return err
}

func (r *PostgresRepo) GetUsers(ctx context.Context) ([]models.User, error) {
	query := `SELECT id, name, email, role, status, created_at FROM users`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var u models.User
		if err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Status, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (r *PostgresRepo) UpdateUserRole(ctx context.Context, userID, role string) error {
	query := `UPDATE users SET role = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, role, userID)
	return err
}

func (r *PostgresRepo) GetTicketsByIDs(ctx context.Context, ids []string) ([]models.Ticket, error) {
	if len(ids) == 0 {
		return []models.Ticket{}, nil
	}
	
	query := `
		SELECT id, team_id, assigned_agent_id, description, status, created_at, resolved_at 
		FROM tickets WHERE id = ANY($1)
	`
	rows, err := r.pool.Query(ctx, query, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		if err := rows.Scan(&t.ID, &t.TeamID, &t.AssignedAgentID, &t.Description, &t.Status, &t.CreatedAt, &t.ResolvedAt); err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	return tickets, rows.Err()
}

func (r *PostgresRepo) CreateRegistration(ctx context.Context, reg *models.Registration) error {
	query := `
		INSERT INTO registrations (user_id, github_url, linkedin_url, skills, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, reg.UserID, reg.GithubURL, reg.LinkedinURL, reg.Skills, reg.Status).
		Scan(&reg.ID, &reg.CreatedAt)
}

func (r *PostgresRepo) GetRegistrationByUserID(ctx context.Context, userID string) (*models.Registration, error) {
	query := `
		SELECT id, user_id, github_url, linkedin_url, skills, status, created_at
		FROM registrations
		WHERE user_id = $1
	`
	reg := &models.Registration{}
	err := r.pool.QueryRow(ctx, query, userID).
		Scan(&reg.ID, &reg.UserID, &reg.GithubURL, &reg.LinkedinURL, &reg.Skills, &reg.Status, &reg.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return reg, nil
}

func (r *PostgresRepo) CreateCommunityPost(ctx context.Context, post *models.CommunityPost) error {
	query := `
		INSERT INTO community_posts (author_id, title, content, category)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, post.AuthorID, post.Title, post.Content, post.Category).
		Scan(&post.ID, &post.CreatedAt)
}

func (r *PostgresRepo) GetCommunityPosts(ctx context.Context, category string) ([]models.CommunityPost, error) {
	var query string
	var args []interface{}
	
	if category != "" {
		query = `SELECT id, author_id, title, content, category, created_at FROM community_posts WHERE category = $1 ORDER BY created_at DESC`
		args = append(args, category)
	} else {
		query = `SELECT id, author_id, title, content, category, created_at FROM community_posts ORDER BY created_at DESC`
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []models.CommunityPost
	for rows.Next() {
		var p models.CommunityPost
		if err := rows.Scan(&p.ID, &p.AuthorID, &p.Title, &p.Content, &p.Category, &p.CreatedAt); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, rows.Err()
}
