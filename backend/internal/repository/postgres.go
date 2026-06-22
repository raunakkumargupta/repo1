package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

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

// ==========================================
// Users Logic
// ==========================================

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
			return nil, nil
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

func (r *PostgresRepo) UpdateUserStatus(ctx context.Context, userID, status string) error {
	query := `UPDATE users SET status = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, status, userID)
	return err
}

func (r *PostgresRepo) UpsertFcmToken(ctx context.Context, userID, token, platform string) error {
	var query string
	if platform == "ios" {
		query = `UPDATE users SET apns_token = $1 WHERE id = $2`
	} else {
		// Default to Android FCM token
		query = `UPDATE users SET fcm_token = $1 WHERE id = $2`
	}
	_, err := r.pool.Exec(ctx, query, token, userID)
	return err
}

// ==========================================
// Hackathons Logic
// ==========================================

func (r *PostgresRepo) CreateHackathon(ctx context.Context, h *models.Hackathon) error {
	query := `
		INSERT INTO hackathons (organizer_id, title, description, cover_image, tracks, start_date, end_date, problem_statement, prizes, schedule, sponsors, min_team_size, max_team_size, registration_fee, rounds)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id, registration_status, is_approved, created_at
	`
	return r.pool.QueryRow(ctx, query, h.OrganizerID, h.Title, h.Description, h.CoverImage, h.Tracks, h.StartDate, h.EndDate, h.ProblemStatement, h.Prizes, h.Schedule, h.Sponsors, h.MinTeamSize, h.MaxTeamSize, h.RegistrationFee, h.Rounds).
		Scan(&h.ID, &h.RegistrationStatus, &h.IsApproved, &h.CreatedAt)
}

func (r *PostgresRepo) GetHackathonByID(ctx context.Context, id string) (*models.Hackathon, error) {
	query := `
		SELECT id, organizer_id, title, COALESCE(description, ''), COALESCE(cover_image, ''), tracks, start_date, end_date, registration_status, is_approved, created_at,
		       COALESCE(problem_statement, ''), COALESCE(prizes, ''), COALESCE(schedule, ''), COALESCE(sponsors, ''), COALESCE(min_team_size, 1), COALESCE(max_team_size, 4), COALESCE(registration_fee, 'Free'), COALESCE(rounds, '')
		FROM hackathons
		WHERE id = $1
	`
	h := &models.Hackathon{}
	err := r.pool.QueryRow(ctx, query, id).
		Scan(
			&h.ID, &h.OrganizerID, &h.Title, &h.Description, &h.CoverImage, &h.Tracks,
			&h.StartDate, &h.EndDate, &h.RegistrationStatus, &h.IsApproved, &h.CreatedAt,
			&h.ProblemStatement, &h.Prizes, &h.Schedule, &h.Sponsors, &h.MinTeamSize, &h.MaxTeamSize, &h.RegistrationFee, &h.Rounds,
		)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return h, nil
}

func (r *PostgresRepo) GetHackathons(ctx context.Context, onlyApproved bool, limit, offset *int, search, track, organizerID *string) ([]models.Hackathon, int, error) {
	var query string
	var args []interface{}
	placeholderIdx := 1

	if onlyApproved {
		query = `SELECT id, organizer_id, title, COALESCE(description, ''), COALESCE(cover_image, ''), tracks, start_date, end_date, registration_status, is_approved, created_at,
		                COALESCE(problem_statement, ''), COALESCE(prizes, ''), COALESCE(schedule, ''), COALESCE(sponsors, ''), COALESCE(min_team_size, 1), COALESCE(max_team_size, 4), COALESCE(registration_fee, 'Free'), COALESCE(rounds, ''),
		                COUNT(*) OVER() as total_count
		         FROM hackathons WHERE is_approved = true`
	} else {
		query = `SELECT id, organizer_id, title, COALESCE(description, ''), COALESCE(cover_image, ''), tracks, start_date, end_date, registration_status, is_approved, created_at,
		                COALESCE(problem_statement, ''), COALESCE(prizes, ''), COALESCE(schedule, ''), COALESCE(sponsors, ''), COALESCE(min_team_size, 1), COALESCE(max_team_size, 4), COALESCE(registration_fee, 'Free'), COALESCE(rounds, ''),
		                COUNT(*) OVER() as total_count
		         FROM hackathons WHERE true`
	}

	if organizerID != nil && *organizerID != "" {
		query += fmt.Sprintf(" AND organizer_id = $%d", placeholderIdx)
		args = append(args, *organizerID)
		placeholderIdx++
	}

	if search != nil && *search != "" {
		query += fmt.Sprintf(" AND (title ILIKE $%d OR description ILIKE $%d)", placeholderIdx, placeholderIdx+1)
		searchPattern := "%" + *search + "%"
		args = append(args, searchPattern, searchPattern)
		placeholderIdx += 2
	}

	if track != nil && *track != "" && *track != "All" {
		query += fmt.Sprintf(" AND tracks ILIKE $%d", placeholderIdx)
		args = append(args, `%"`+*track+`"%`)
		placeholderIdx++
	}

	if onlyApproved {
		query += " ORDER BY start_date ASC"
	} else {
		query += " ORDER BY created_at DESC"
	}

	if limit != nil {
		query += fmt.Sprintf(" LIMIT $%d", placeholderIdx)
		args = append(args, *limit)
		placeholderIdx++
	}

	if offset != nil {
		query += fmt.Sprintf(" OFFSET $%d", placeholderIdx)
		args = append(args, *offset)
		placeholderIdx++
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []models.Hackathon
	totalCount := 0
	for rows.Next() {
		var h models.Hackathon
		var count int
		err := rows.Scan(
			&h.ID, &h.OrganizerID, &h.Title, &h.Description, &h.CoverImage, &h.Tracks,
			&h.StartDate, &h.EndDate, &h.RegistrationStatus, &h.IsApproved, &h.CreatedAt,
			&h.ProblemStatement, &h.Prizes, &h.Schedule, &h.Sponsors, &h.MinTeamSize, &h.MaxTeamSize, &h.RegistrationFee, &h.Rounds,
			&count,
		)
		if err != nil {
			return nil, 0, err
		}
		totalCount = count
		list = append(list, h)
	}
	return list, totalCount, rows.Err()
}

func (r *PostgresRepo) DeleteHackathon(ctx context.Context, id string) error {
	query := `DELETE FROM hackathons WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

func (r *PostgresRepo) UpdateHackathonDetails(ctx context.Context, id string, req models.UpdateHackathonDetailsRequest) error {
	query := `
		UPDATE hackathons SET
			title = $2,
			tracks = $3,
			cover_image = $4,
			start_date = $5,
			end_date = $6,
			description = $7,
			problem_statement = $8,
			prizes = $9,
			schedule = $10,
			sponsors = $11,
			min_team_size = $12,
			max_team_size = $13,
			registration_fee = $14,
			rounds = $15
		WHERE id = $1
	`
	_, err := r.pool.Exec(ctx, query, id,
		req.Title, req.Tracks, req.CoverImage, req.StartDate, req.EndDate,
		req.Description, req.ProblemStatement, req.Prizes, req.Schedule,
		req.Sponsors, req.MinTeamSize, req.MaxTeamSize, req.RegistrationFee, req.Rounds,
	)
	return err
}

func (r *PostgresRepo) ApproveHackathon(ctx context.Context, id string) error {
	query := `UPDATE hackathons SET is_approved = true WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, id)
	return err
}

// ==========================================
// Registrations Logic
// ==========================================

func (r *PostgresRepo) CreateRegistration(ctx context.Context, reg *models.Registration) error {
	query := `
		INSERT INTO registrations (user_id, hackathon_id, github_url, linkedin_url, skills, team_preference, approval_status, resume_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, reg.UserID, reg.HackathonID, reg.GithubURL, reg.LinkedinURL, reg.Skills, reg.TeamPreference, reg.ApprovalStatus, reg.ResumeURL).
		Scan(&reg.ID, &reg.CreatedAt)
}

func (r *PostgresRepo) UpsertRegistration(ctx context.Context, reg *models.Registration) error {
	query := `
		INSERT INTO registrations (user_id, hackathon_id, github_url, linkedin_url, skills, team_preference, approval_status, resume_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id, hackathon_id) DO UPDATE SET
			github_url = EXCLUDED.github_url,
			linkedin_url = EXCLUDED.linkedin_url,
			skills = EXCLUDED.skills,
			team_preference = EXCLUDED.team_preference,
			resume_url = EXCLUDED.resume_url
		RETURNING id, approval_status, created_at
	`
	return r.pool.QueryRow(ctx, query, reg.UserID, reg.HackathonID, reg.GithubURL, reg.LinkedinURL, reg.Skills, reg.TeamPreference, reg.ApprovalStatus, reg.ResumeURL).
		Scan(&reg.ID, &reg.ApprovalStatus, &reg.CreatedAt)
}

func (r *PostgresRepo) GetRegistrationByUserID(ctx context.Context, userID string) (*models.Registration, error) {
	query := `
		SELECT id, user_id, hackathon_id, github_url, linkedin_url, skills, team_preference, approval_status, resume_url, created_at
		FROM registrations
		WHERE user_id = $1
		LIMIT 1
	`
	reg := &models.Registration{}
	err := r.pool.QueryRow(ctx, query, userID).
		Scan(&reg.ID, &reg.UserID, &reg.HackathonID, &reg.GithubURL, &reg.LinkedinURL, &reg.Skills, &reg.TeamPreference, &reg.ApprovalStatus, &reg.ResumeURL, &reg.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return reg, nil
}

func (r *PostgresRepo) GetRegistrationByUserAndHackathon(ctx context.Context, userID, hackathonID string) (*models.Registration, error) {
	query := `
		SELECT id, user_id, hackathon_id, github_url, linkedin_url, skills, team_preference, approval_status, resume_url, created_at
		FROM registrations
		WHERE user_id = $1 AND hackathon_id = $2
	`
	reg := &models.Registration{}
	err := r.pool.QueryRow(ctx, query, userID, hackathonID).
		Scan(&reg.ID, &reg.UserID, &reg.HackathonID, &reg.GithubURL, &reg.LinkedinURL, &reg.Skills, &reg.TeamPreference, &reg.ApprovalStatus, &reg.ResumeURL, &reg.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return reg, nil
}

func (r *PostgresRepo) GetRegistrationsByHackathon(ctx context.Context, hackathonID string, limit, offset *int, approvalStatus, teamPreference, search, excludeUserID *string) ([]models.RegistrationProfile, int, error) {
	query := `
		SELECT r.id, r.user_id, r.hackathon_id, r.github_url, r.linkedin_url, r.skills, r.team_preference, r.approval_status, r.resume_url, r.created_at, u.name, u.email, hp.bio, hp.readme_md, COUNT(*) OVER() as total_count
		FROM registrations r
		JOIN users u ON r.user_id = u.id
		LEFT JOIN hacker_profiles hp ON r.user_id = hp.user_id
		WHERE r.hackathon_id = $1
	`
	args := []interface{}{hackathonID}
	placeholderIdx := 2

	if approvalStatus != nil && *approvalStatus != "" {
		query += fmt.Sprintf(" AND r.approval_status = $%d", placeholderIdx)
		args = append(args, *approvalStatus)
		placeholderIdx++
	}

	if teamPreference != nil && *teamPreference != "" {
		query += fmt.Sprintf(" AND r.team_preference = $%d", placeholderIdx)
		args = append(args, *teamPreference)
		placeholderIdx++
	}

	if search != nil && *search != "" {
		query += fmt.Sprintf(" AND (u.name ILIKE $%d OR u.email ILIKE $%d OR r.skills::text ILIKE $%d)", placeholderIdx, placeholderIdx+1, placeholderIdx+2)
		searchPattern := "%" + *search + "%"
		args = append(args, searchPattern, searchPattern, searchPattern)
		placeholderIdx += 3
	}

	if excludeUserID != nil && *excludeUserID != "" {
		query += fmt.Sprintf(" AND r.user_id != $%d", placeholderIdx)
		args = append(args, *excludeUserID)
		placeholderIdx++
	}

	query += " ORDER BY r.created_at DESC"

	if limit != nil {
		query += fmt.Sprintf(" LIMIT $%d", placeholderIdx)
		args = append(args, *limit)
		placeholderIdx++
	}

	if offset != nil {
		query += fmt.Sprintf(" OFFSET $%d", placeholderIdx)
		args = append(args, *offset)
		placeholderIdx++
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	list := []models.RegistrationProfile{}
	totalCount := 0
	for rows.Next() {
		var rp models.RegistrationProfile
		var count int
		err := rows.Scan(
			&rp.ID, &rp.UserID, &rp.HackathonID, &rp.GithubURL, &rp.LinkedinURL, &rp.Skills,
			&rp.TeamPreference, &rp.ApprovalStatus, &rp.ResumeURL, &rp.CreatedAt, &rp.UserName, &rp.UserEmail,
			&rp.Bio, &rp.ReadmeMd, &count,
		)
		if err != nil {
			return nil, 0, err
		}
		totalCount = count
		list = append(list, rp)
	}
	return list, totalCount, rows.Err()
}

func (r *PostgresRepo) UpdateRegistrationStatus(ctx context.Context, regID string, status string) error {
	query := `UPDATE registrations SET approval_status = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, status, regID)
	return err
}

// ==========================================
// Teams Logic
// ==========================================

func (r *PostgresRepo) CreateTeam(ctx context.Context, team *models.Team) error {
	query := `
		INSERT INTO teams (hackathon_id, team_name, invite_code, repository_url, is_submitted, is_winner, leader_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, team.HackathonID, team.TeamName, team.InviteCode, team.RepositoryURL, team.IsSubmitted, team.IsWinner, team.LeaderID).
		Scan(&team.ID, &team.CreatedAt)
}

func (r *PostgresRepo) AddUserToTeam(ctx context.Context, teamID, userID string) error {
	query := `INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)`
	_, err := r.pool.Exec(ctx, query, teamID, userID)
	return err
}

func (r *PostgresRepo) JoinTeamByInviteCode(ctx context.Context, userID string, inviteCode string) (*models.Team, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Get team details
	query := `SELECT id, hackathon_id, team_name, invite_code, repository_url, is_submitted, is_winner, created_at, leader_id FROM teams WHERE invite_code = $1`
	team := &models.Team{}
	err = tx.QueryRow(ctx, query, inviteCode).
		Scan(&team.ID, &team.HackathonID, &team.TeamName, &team.InviteCode, &team.RepositoryURL, &team.IsSubmitted, &team.IsWinner, &team.CreatedAt, &team.LeaderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("invalid invite code")
		}
		return nil, err
	}

	// Insert member mapping
	insertQuery := `INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)`
	_, err = tx.Exec(ctx, insertQuery, team.ID, userID)
	if err != nil {
		// Unique violation or other error
		return nil, errors.New("already in team or database constraint violation")
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return team, nil
}

func (r *PostgresRepo) GetTeamByUserIDAndHackathon(ctx context.Context, userID, hackathonID string) (*models.Team, error) {
	query := `
		SELECT t.id, t.hackathon_id, t.team_name, t.invite_code, t.repository_url, t.is_submitted, t.is_winner, t.created_at, t.leader_id
		FROM teams t
		JOIN team_members tm ON t.id = tm.team_id
		WHERE tm.user_id = $1 AND t.hackathon_id = $2
	`
	team := &models.Team{}
	err := r.pool.QueryRow(ctx, query, userID, hackathonID).
		Scan(&team.ID, &team.HackathonID, &team.TeamName, &team.InviteCode, &team.RepositoryURL, &team.IsSubmitted, &team.IsWinner, &team.CreatedAt, &team.LeaderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return team, nil
}

func (r *PostgresRepo) GetTeamMembers(ctx context.Context, teamID string) ([]models.User, error) {
	query := `
		SELECT u.id, u.name, u.email, u.role, u.status, u.created_at
		FROM users u
		JOIN team_members tm ON u.id = tm.user_id
		WHERE tm.team_id = $1
	`
	rows, err := r.pool.Query(ctx, query, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.User
	for rows.Next() {
		var u models.User
		err := rows.Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.Status, &u.CreatedAt)
		if err != nil {
			return nil, err
		}
		list = append(list, u)
	}
	return list, rows.Err()
}

func (r *PostgresRepo) UpdateTeamRepositoryURL(ctx context.Context, teamID string, repoURL string) error {
	query := `UPDATE teams SET repository_url = $1, is_submitted = true WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, repoURL, teamID)
	return err
}

func (r *PostgresRepo) GetTeamByID(ctx context.Context, id string) (*models.Team, error) {
	query := `SELECT id, hackathon_id, team_name, invite_code, repository_url, is_submitted, is_winner, created_at, leader_id FROM teams WHERE id = $1`
	team := &models.Team{}
	err := r.pool.QueryRow(ctx, query, id).
		Scan(&team.ID, &team.HackathonID, &team.TeamName, &team.InviteCode, &team.RepositoryURL, &team.IsSubmitted, &team.IsWinner, &team.CreatedAt, &team.LeaderID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return team, nil
}

func (r *PostgresRepo) GetTeamsByHackathon(ctx context.Context, hackathonID string, onlySubmitted bool) ([]models.Team, error) {
	var query string
	if onlySubmitted {
		query = `SELECT id, hackathon_id, team_name, invite_code, repository_url, is_submitted, is_winner, created_at, leader_id FROM teams WHERE hackathon_id = $1 AND is_submitted = true ORDER BY team_name ASC`
	} else {
		query = `SELECT id, hackathon_id, team_name, invite_code, repository_url, is_submitted, is_winner, created_at, leader_id FROM teams WHERE hackathon_id = $1 ORDER BY team_name ASC`
	}

	rows, err := r.pool.Query(ctx, query, hackathonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []models.Team{}
	for rows.Next() {
		var t models.Team
		err := rows.Scan(&t.ID, &t.HackathonID, &t.TeamName, &t.InviteCode, &t.RepositoryURL, &t.IsSubmitted, &t.IsWinner, &t.CreatedAt, &t.LeaderID)
		if err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

func (r *PostgresRepo) UpdateTeamWinnerStatus(ctx context.Context, teamID string, isWinner bool) error {
	query := `UPDATE teams SET is_winner = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, isWinner, teamID)
	return err
}

func (r *PostgresRepo) RemoveUserFromTeam(ctx context.Context, teamID, userID string) error {
	query := `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, teamID, userID)
	return err
}

func (r *PostgresRepo) GetPublicTeamsByHackathon(ctx context.Context, hackathonID string, limit, offset *int, search *string) ([]models.TeamWithMembers, error) {
	query := `SELECT id, hackathon_id, team_name, invite_code, repository_url, is_submitted, is_winner, created_at, leader_id FROM teams WHERE hackathon_id = $1`
	args := []interface{}{hackathonID}
	placeholderIdx := 2

	if search != nil && *search != "" {
		query += fmt.Sprintf(" AND team_name ILIKE $%d", placeholderIdx)
		args = append(args, "%"+*search+"%")
		placeholderIdx++
	}

	query += " ORDER BY created_at DESC"

	if limit != nil {
		query += fmt.Sprintf(" LIMIT $%d", placeholderIdx)
		args = append(args, *limit)
		placeholderIdx++
	}

	if offset != nil {
		query += fmt.Sprintf(" OFFSET $%d", placeholderIdx)
		args = append(args, *offset)
		placeholderIdx++
	}

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var teams []models.TeamWithMembers
	for rows.Next() {
		var t models.Team
		err := rows.Scan(&t.ID, &t.HackathonID, &t.TeamName, &t.InviteCode, &t.RepositoryURL, &t.IsSubmitted, &t.IsWinner, &t.CreatedAt, &t.LeaderID)
		if err != nil {
			return nil, err
		}
		teams = append(teams, models.TeamWithMembers{Team: t, Members: []models.User{}})
	}

	// For each team, fetch members
	for i := range teams {
		members, _ := r.GetTeamMembers(ctx, teams[i].ID)
		teams[i].Members = members
	}

	return teams, nil
}

// Join Requests
func (r *PostgresRepo) CreateJoinRequest(ctx context.Context, req *models.TeamJoinRequest) error {
	query := `
		INSERT INTO team_join_requests (team_id, user_id, status)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, req.TeamID, req.UserID, req.Status).Scan(&req.ID, &req.CreatedAt)
}

func (r *PostgresRepo) WithdrawJoinRequest(ctx context.Context, reqID, userID string) error {
	query := `UPDATE team_join_requests SET status = 'Withdrawn' WHERE id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, reqID, userID)
	return err
}

func (r *PostgresRepo) UpdateJoinRequestStatus(ctx context.Context, reqID, status string) error {
	query := `UPDATE team_join_requests SET status = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, status, reqID)
	return err
}

func (r *PostgresRepo) GetJoinRequestByID(ctx context.Context, reqID string) (*models.TeamJoinRequest, error) {
	query := `SELECT id, team_id, user_id, status, created_at FROM team_join_requests WHERE id = $1`
	req := &models.TeamJoinRequest{}
	err := r.pool.QueryRow(ctx, query, reqID).Scan(&req.ID, &req.TeamID, &req.UserID, &req.Status, &req.CreatedAt)
	if err != nil {
		return nil, err
	}
	return req, nil
}

func (r *PostgresRepo) GetJoinRequestsForTeam(ctx context.Context, teamID string) ([]models.TeamJoinRequest, error) {
	query := `
		SELECT r.id, r.team_id, r.user_id, r.status, r.created_at, u.name, u.email
		FROM team_join_requests r
		JOIN users u ON r.user_id = u.id
		WHERE r.team_id = $1 AND r.status = 'Pending'
		ORDER BY r.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reqs []models.TeamJoinRequest
	for rows.Next() {
		var r models.TeamJoinRequest
		if err := rows.Scan(&r.ID, &r.TeamID, &r.UserID, &r.Status, &r.CreatedAt, &r.UserName, &r.UserEmail); err != nil {
			return nil, err
		}
		reqs = append(reqs, r)
	}
	return reqs, nil
}

func (r *PostgresRepo) GetMyJoinRequests(ctx context.Context, hackathonID, userID string) ([]models.TeamJoinRequest, error) {
	query := `
		SELECT r.id, r.team_id, r.user_id, r.status, r.created_at, t.team_name
		FROM team_join_requests r
		JOIN teams t ON r.team_id = t.id
		WHERE r.user_id = $1 AND t.hackathon_id = $2 AND r.status = 'Pending'
	`
	rows, err := r.pool.Query(ctx, query, userID, hackathonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reqs []models.TeamJoinRequest
	for rows.Next() {
		var req models.TeamJoinRequest
		if err := rows.Scan(&req.ID, &req.TeamID, &req.UserID, &req.Status, &req.CreatedAt, &req.TeamName); err != nil {
			return nil, err
		}
		reqs = append(reqs, req)
	}
	return reqs, nil
}

// Invitations
func (r *PostgresRepo) CreateInvitation(ctx context.Context, inv *models.TeamInvitation) error {
	query := `
		INSERT INTO team_invitations (team_id, invitee_id, status)
		VALUES ($1, $2, $3)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, inv.TeamID, inv.InviteeID, inv.Status).Scan(&inv.ID, &inv.CreatedAt)
}

func (r *PostgresRepo) UpdateInvitationStatus(ctx context.Context, invID, status string) error {
	query := `UPDATE team_invitations SET status = $1 WHERE id = $2`
	_, err := r.pool.Exec(ctx, query, status, invID)
	return err
}

func (r *PostgresRepo) GetInvitationByID(ctx context.Context, invID string) (*models.TeamInvitation, error) {
	query := `SELECT id, team_id, invitee_id, status, created_at FROM team_invitations WHERE id = $1`
	inv := &models.TeamInvitation{}
	err := r.pool.QueryRow(ctx, query, invID).Scan(&inv.ID, &inv.TeamID, &inv.InviteeID, &inv.Status, &inv.CreatedAt)
	if err != nil {
		return nil, err
	}
	return inv, nil
}

func (r *PostgresRepo) GetMyInvitations(ctx context.Context, hackathonID, userID string) ([]models.TeamInvitation, error) {
	query := `
		SELECT i.id, i.team_id, i.invitee_id, i.status, i.created_at, t.team_name
		FROM team_invitations i
		JOIN teams t ON i.team_id = t.id
		WHERE i.invitee_id = $1 AND t.hackathon_id = $2 AND i.status = 'Pending'
	`
	rows, err := r.pool.Query(ctx, query, userID, hackathonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invs []models.TeamInvitation
	for rows.Next() {
		var inv models.TeamInvitation
		if err := rows.Scan(&inv.ID, &inv.TeamID, &inv.InviteeID, &inv.Status, &inv.CreatedAt, &inv.TeamName); err != nil {
			return nil, err
		}
		invs = append(invs, inv)
	}
	return invs, nil
}

// ==========================================
// Help Tickets Logic
// ==========================================

func (r *PostgresRepo) CreateTicket(ctx context.Context, ticket *models.Ticket) error {
	query := `
		INSERT INTO tickets (hackathon_id, team_id, description, status)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, ticket.HackathonID, ticket.TeamID, ticket.Description, ticket.Status).
		Scan(&ticket.ID, &ticket.CreatedAt)
}

func (r *PostgresRepo) UpdateTicketStatus(ctx context.Context, ticketID, status, mentorID string) error {
	query := `UPDATE tickets SET status = $1, assigned_mentor_id = $2 WHERE id = $3`
	_, err := r.pool.Exec(ctx, query, status, mentorID, ticketID)
	return err
}

func (r *PostgresRepo) ResolveTicket(ctx context.Context, ticketID string) error {
	query := `UPDATE tickets SET status = 'Resolved', resolved_at = NOW() WHERE id = $1`
	_, err := r.pool.Exec(ctx, query, ticketID)
	return err
}


func (r *PostgresRepo) GetTicketsByIDs(ctx context.Context, ids []string) ([]models.Ticket, error) {
	if len(ids) == 0 {
		return []models.Ticket{}, nil
	}
	query := `
		SELECT id, hackathon_id, team_id, assigned_mentor_id, description, status, created_at
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
		if err := rows.Scan(&t.ID, &t.HackathonID, &t.TeamID, &t.AssignedMentorID, &t.Description, &t.Status, &t.CreatedAt); err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	return tickets, rows.Err()
}

func (r *PostgresRepo) GetTicketsQueue(ctx context.Context, hackathonID string) ([]models.Ticket, error) {
	query := `
		SELECT t.id, t.hackathon_id, t.team_id, t.assigned_mentor_id, t.description, t.status, t.created_at,
			   COALESCE(tm.team_name, 'Unknown Team') as team_name
		FROM tickets t
		LEFT JOIN teams tm ON tm.id = t.team_id
		WHERE t.hackathon_id = $1 AND t.status != 'Resolved'
		ORDER BY t.created_at ASC
	`
	rows, err := r.pool.Query(ctx, query, hackathonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		var teamName string
		if err := rows.Scan(&t.ID, &t.HackathonID, &t.TeamID, &t.AssignedMentorID, &t.Description, &t.Status, &t.CreatedAt, &teamName); err != nil {
			return nil, err
		}
		t.TeamName = teamName
		tickets = append(tickets, t)
	}
	return tickets, rows.Err()
}

// GetTicketsByTeam returns all tickets for a specific team (for "my tickets" view)
func (r *PostgresRepo) GetTicketsByTeam(ctx context.Context, hackathonID, teamID string) ([]models.Ticket, error) {
	query := `
		SELECT id, hackathon_id, team_id, assigned_mentor_id, description, status, created_at
		FROM tickets
		WHERE hackathon_id = $1 AND team_id = $2
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, hackathonID, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		if err := rows.Scan(&t.ID, &t.HackathonID, &t.TeamID, &t.AssignedMentorID, &t.Description, &t.Status, &t.CreatedAt); err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	return tickets, rows.Err()
}

// HasOpenTicket checks if a team already has an open/active ticket (spam prevention)
func (r *PostgresRepo) HasOpenTicket(ctx context.Context, hackathonID, teamID string) (bool, error) {
	query := `SELECT COUNT(*) FROM tickets WHERE hackathon_id = $1 AND team_id = $2 AND status IN ('Open', 'Active')`
	var count int
	err := r.pool.QueryRow(ctx, query, hackathonID, teamID).Scan(&count)
	return count > 0, err
}

// ==========================================
// Staff Linkage Logic
// ==========================================

func (r *PostgresRepo) AddStaff(ctx context.Context, hackathonID, userID, role string) error {
	query := `
		INSERT INTO hackathon_staff (hackathon_id, user_id, role)
		VALUES ($1, $2, $3)
		ON CONFLICT (hackathon_id, user_id) DO UPDATE SET role = EXCLUDED.role
	`
	_, err := r.pool.Exec(ctx, query, hackathonID, userID, role)
	return err
}

func (r *PostgresRepo) GetStaffRole(ctx context.Context, hackathonID, userID string) (string, error) {
	query := `SELECT role FROM hackathon_staff WHERE hackathon_id = $1 AND user_id = $2`
	var role string
	err := r.pool.QueryRow(ctx, query, hackathonID, userID).Scan(&role)
	if err != nil {
		return "", err
	}
	return role, nil
}

func (r *PostgresRepo) IsStaff(ctx context.Context, hackathonID, userID, role string) (bool, error) {
	query := `SELECT COUNT(*) FROM hackathon_staff WHERE hackathon_id = $1 AND user_id = $2 AND role = $3`
	var count int
	err := r.pool.QueryRow(ctx, query, hackathonID, userID, role).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *PostgresRepo) GetStaffHackathons(ctx context.Context, userID string) ([]models.Hackathon, error) {
	query := `
		SELECT h.id, h.organizer_id, h.title, COALESCE(h.description, ''), COALESCE(h.cover_image, ''), COALESCE(h.tracks, '[]'), h.start_date, h.end_date, h.registration_status, h.is_approved, h.created_at, COALESCE(h.problem_statement, ''), COALESCE(h.prizes, ''), COALESCE(h.schedule, ''), COALESCE(h.sponsors, ''), COALESCE(h.min_team_size, 1), COALESCE(h.max_team_size, 4), COALESCE(h.registration_fee, 'Free'), COALESCE(h.rounds, '')
		FROM hackathons h
		JOIN hackathon_staff s ON h.id = s.hackathon_id
		WHERE s.user_id = $1
	`
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hackathons []models.Hackathon
	for rows.Next() {
		var h models.Hackathon
		if err := rows.Scan(
			&h.ID, &h.OrganizerID, &h.Title, &h.Description, &h.CoverImage, &h.Tracks,
			&h.StartDate, &h.EndDate, &h.RegistrationStatus, &h.IsApproved, &h.CreatedAt,
			&h.ProblemStatement, &h.Prizes, &h.Schedule, &h.Sponsors, &h.MinTeamSize, &h.MaxTeamSize, &h.RegistrationFee, &h.Rounds,
		); err != nil {
			return nil, err
		}
		hackathons = append(hackathons, h)
	}
	return hackathons, rows.Err()
}

func (r *PostgresRepo) GetHackathonStaffList(ctx context.Context, hackathonID string) ([]models.HackathonStaffResponse, error) {
	query := `
		SELECT u.id, u.name, u.email, s.role
		FROM users u
		JOIN hackathon_staff s ON u.id = s.user_id
		WHERE s.hackathon_id = $1
	`
	rows, err := r.pool.Query(ctx, query, hackathonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var staff []models.HackathonStaffResponse
	for rows.Next() {
		var s models.HackathonStaffResponse
		if err := rows.Scan(&s.UserID, &s.Name, &s.Email, &s.Role); err != nil {
			return nil, err
		}
		staff = append(staff, s)
	}
	return staff, rows.Err()
}

func (r *PostgresRepo) RemoveStaff(ctx context.Context, hackathonID, userID string) error {
	query := `DELETE FROM hackathon_staff WHERE hackathon_id = $1 AND user_id = $2`
	_, err := r.pool.Exec(ctx, query, hackathonID, userID)
	return err
}

// ==========================================
// Project Evaluation Grading Logic
// ==========================================

func (r *PostgresRepo) CreateEvaluation(ctx context.Context, ev *models.Evaluation) error {
	query := `
		INSERT INTO evaluations (hackathon_id, team_id, judge_id, technical_score, design_score, innovation_score, feedback)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, ev.HackathonID, ev.TeamID, ev.JudgeID, ev.TechnicalScore, ev.DesignScore, ev.InnovationScore, ev.Feedback).
		Scan(&ev.ID, &ev.CreatedAt)
}

func (r *PostgresRepo) GetEvaluationsByTeam(ctx context.Context, teamID string) ([]models.Evaluation, error) {
	query := `
		SELECT id, hackathon_id, team_id, judge_id, technical_score, design_score, innovation_score, feedback, created_at
		FROM evaluations
		WHERE team_id = $1
	`
	rows, err := r.pool.Query(ctx, query, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var evs []models.Evaluation
	for rows.Next() {
		var ev models.Evaluation
		err := rows.Scan(&ev.ID, &ev.HackathonID, &ev.TeamID, &ev.JudgeID, &ev.TechnicalScore, &ev.DesignScore, &ev.InnovationScore, &ev.Feedback, &ev.CreatedAt)
		if err != nil {
			return nil, err
		}
		evs = append(evs, ev)
	}
	return evs, rows.Err()
}

func (r *PostgresRepo) GetEvaluatedTeamsByJudge(ctx context.Context, judgeID string) (map[string]bool, error) {
	query := `SELECT team_id FROM evaluations WHERE judge_id = $1`
	rows, err := r.pool.Query(ctx, query, judgeID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := make(map[string]bool)
	for rows.Next() {
		var tid string
		if err := rows.Scan(&tid); err != nil {
			return nil, err
		}
		m[tid] = true
	}
	return m, nil
}

// ==========================================
// Announcements / Broadcasts Logic
// ==========================================

func (r *PostgresRepo) CreateAnnouncement(ctx context.Context, ann *models.Announcement) error {
	query := `
		INSERT INTO announcements (hackathon_id, message)
		VALUES ($1, $2)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, ann.HackathonID, ann.Message).
		Scan(&ann.ID, &ann.CreatedAt)
}

func (r *PostgresRepo) GetAnnouncements(ctx context.Context, hackathonID string) ([]models.Announcement, error) {
	query := `
		SELECT id, hackathon_id, message, created_at
		FROM announcements
		WHERE hackathon_id = $1
		ORDER BY created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, hackathonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.Announcement
	for rows.Next() {
		var a models.Announcement
		if err := rows.Scan(&a.ID, &a.HackathonID, &a.Message, &a.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	if list == nil {
		list = []models.Announcement{}
	}
	return list, rows.Err()
}

// ==========================================
// Legacy Compatibility
// ==========================================

func (r *PostgresRepo) GetTicketsByQueue(ctx context.Context) ([]models.Ticket, error) {
	query := `
		SELECT id, team_id, assigned_agent_id, description, status, created_at 
		FROM tickets WHERE status != 'resolved'
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		var agentID *string
		if err := rows.Scan(&t.ID, &t.TeamID, &agentID, &t.Description, &t.Status, &t.CreatedAt); err != nil {
			return nil, err
		}
		t.AssignedMentorID = agentID
		tickets = append(tickets, t)
	}
	return tickets, rows.Err()
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

func (r *PostgresRepo) GetFcmTokensForHackathon(ctx context.Context, hackathonID string) ([]string, error) {
	query := `
		SELECT u.fcm_token, u.apns_token
		FROM users u
		JOIN registrations r ON u.id = r.user_id
		WHERE r.hackathon_id = $1
	`
	rows, err := r.pool.Query(ctx, query, hackathonID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tokenMap := make(map[string]bool)
	for rows.Next() {
		var fcm, apns *string
		if err := rows.Scan(&fcm, &apns); err != nil {
			return nil, err
		}
		if fcm != nil && *fcm != "" {
			tokenMap[*fcm] = true
		}
		if apns != nil && *apns != "" {
			tokenMap[*apns] = true
		}
	}

	tokens := make([]string, 0, len(tokenMap))
	for t := range tokenMap {
		tokens = append(tokens, t)
	}
	return tokens, rows.Err()
}

func (r *PostgresRepo) GetFcmTokensForTeam(ctx context.Context, teamID string) ([]string, error) {
	query := `
		SELECT u.fcm_token, u.apns_token
		FROM users u
		JOIN team_members tm ON u.id = tm.user_id
		WHERE tm.team_id = $1
	`
	rows, err := r.pool.Query(ctx, query, teamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tokenMap := make(map[string]bool)
	for rows.Next() {
		var fcm, apns *string
		if err := rows.Scan(&fcm, &apns); err != nil {
			return nil, err
		}
		if fcm != nil && *fcm != "" {
			tokenMap[*fcm] = true
		}
		if apns != nil && *apns != "" {
			tokenMap[*apns] = true
		}
	}

	tokens := make([]string, 0, len(tokenMap))
	for t := range tokenMap {
		tokens = append(tokens, t)
	}
	return tokens, rows.Err()
}

func (r *PostgresRepo) GetFcmTokensForAllHackers(ctx context.Context) ([]string, error) {
	query := `
		SELECT fcm_token, apns_token
		FROM users
		WHERE role = 'Hacker'
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	tokenMap := make(map[string]bool)
	for rows.Next() {
		var fcm, apns *string
		if err := rows.Scan(&fcm, &apns); err != nil {
			return nil, err
		}
		if fcm != nil && *fcm != "" {
			tokenMap[*fcm] = true
		}
		if apns != nil && *apns != "" {
			tokenMap[*apns] = true
		}
	}

	tokens := make([]string, 0, len(tokenMap))
	for t := range tokenMap {
		tokens = append(tokens, t)
	}
	return tokens, rows.Err()
}

// ==========================================
// CometChat Moderation Logs
// ==========================================

// ModerationLogEntry represents a CometChat webhook event stored for admin review.
type ModerationLogEntry struct {
	EventType    string
	SenderUID    string
	SenderName   string
	ReceiverID   string
	MessageType  string
	MessageText  string
	IsFlagged    bool
	FlagCategory string
	FlagReason   string
	CreatedAt    time.Time
}

// InsertModerationLog writes a CometChat webhook event to the moderation_logs table.
func (r *PostgresRepo) InsertModerationLog(ctx context.Context, entry ModerationLogEntry) error {
	query := `
		INSERT INTO moderation_logs (event_type, sender_uid, sender_name, receiver_id, message_type, message_text, is_flagged, flag_category, flag_reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.pool.Exec(ctx, query,
		entry.EventType, entry.SenderUID, entry.SenderName, entry.ReceiverID,
		entry.MessageType, entry.MessageText, entry.IsFlagged, entry.FlagCategory, entry.FlagReason, entry.CreatedAt,
	)
	return err
}

// GetModerationLogs returns flagged moderation entries for the admin dashboard.
func (r *PostgresRepo) GetModerationLogs(ctx context.Context, flaggedOnly bool) ([]map[string]interface{}, error) {
	var query string
	if flaggedOnly {
		query = `SELECT id, event_type, sender_uid, sender_name, receiver_id, message_type, message_text, is_flagged, flag_category, flag_reason, created_at FROM moderation_logs WHERE is_flagged = true ORDER BY created_at DESC LIMIT 100`
	} else {
		query = `SELECT id, event_type, sender_uid, sender_name, receiver_id, message_type, message_text, is_flagged, flag_category, flag_reason, created_at FROM moderation_logs ORDER BY created_at DESC LIMIT 100`
	}

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []map[string]interface{}
	for rows.Next() {
		var id, eventType, senderUID, senderName, receiverID, msgType, msgText, flagCat, flagReason string
		var isFlagged bool
		var createdAt time.Time
		if err := rows.Scan(&id, &eventType, &senderUID, &senderName, &receiverID, &msgType, &msgText, &isFlagged, &flagCat, &flagReason, &createdAt); err != nil {
			return nil, err
		}
		logs = append(logs, map[string]interface{}{
			"id":            id,
			"user_id":       senderUID, // Frontend compatibility
			"content":       msgText,   // Frontend compatibility
			"timestamp":     createdAt, // Frontend compatibility
			"event_type":    eventType,
			"sender_uid":    senderUID,
			"sender_name":   senderName,
			"receiver_id":   receiverID,
			"message_type":  msgType,
			"message_text":  msgText,
			"is_flagged":    isFlagged,
			"flag_category": flagCat,
			"flag_reason":   flagReason,
			"created_at":    createdAt,
		})
	}
	if logs == nil {
		logs = []map[string]interface{}{}
	}
	return logs, rows.Err()
}

func (r *PostgresRepo) GetResolvedTicketsByMentor(ctx context.Context, hackathonID, mentorID string) ([]models.Ticket, error) {
	query := `
		SELECT t.id, t.hackathon_id, t.team_id, t.assigned_mentor_id, t.description, t.status, t.created_at, t.resolved_at,
			   COALESCE(tm.team_name, 'Unknown Team') as team_name
		FROM tickets t
		LEFT JOIN teams tm ON tm.id = t.team_id
		WHERE t.hackathon_id = $1 AND t.assigned_mentor_id = $2 AND t.status = 'Resolved'
		ORDER BY t.resolved_at DESC
	`
	rows, err := r.pool.Query(ctx, query, hackathonID, mentorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []models.Ticket
	for rows.Next() {
		var t models.Ticket
		var teamName string
		if err := rows.Scan(&t.ID, &t.HackathonID, &t.TeamID, &t.AssignedMentorID, &t.Description, &t.Status, &t.CreatedAt, &t.ResolvedAt, &teamName); err != nil {
			return nil, err
		}
		t.TeamName = teamName
		tickets = append(tickets, t)
	}
	return tickets, rows.Err()
}


