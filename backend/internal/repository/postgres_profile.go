package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
)

func (r *PostgresRepo) GetHackerProfile(ctx context.Context, userID string) (*models.HackerProfile, error) {
	query := `
		SELECT user_id, gender, tshirt_size, city, phone_number, emergency_contact_name, emergency_contact_number, bio, readme_md,
		       has_formal_education, degree_type, institution, field_of_study, grad_year, grad_month,
		       dietary_preference, allergies, github_url, linkedin_url, resume_url, skills, default_team_preference,
		       industry, years_of_experience, mentor_expertise, created_at, updated_at
		FROM hacker_profiles
		WHERE user_id = $1
	`

	var p models.HackerProfile
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&p.UserID, &p.Gender, &p.TShirtSize, &p.City, &p.PhoneNumber, &p.EmergencyContactName, &p.EmergencyContactNumber, &p.Bio, &p.ReadmeMd,
		&p.HasFormalEducation, &p.DegreeType, &p.Institution, &p.FieldOfStudy, &p.GradYear, &p.GradMonth,
		&p.DietaryPreference, &p.Allergies, &p.GithubURL, &p.LinkedinURL, &p.ResumeURL, &p.Skills, &p.DefaultTeamPreference,
		&p.Industry, &p.YearsOfExperience, &p.MentorExpertise, &p.CreatedAt, &p.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // Not found is not an error here, just nil profile
		}
		return nil, fmt.Errorf("error fetching hacker profile: %w", err)
	}

	return &p, nil
}

func (r *PostgresRepo) UpsertHackerProfile(ctx context.Context, p *models.HackerProfile) error {
	query := `
		INSERT INTO hacker_profiles (
			user_id, gender, tshirt_size, city, phone_number, emergency_contact_name, emergency_contact_number, bio, readme_md,
			has_formal_education, degree_type, institution, field_of_study, grad_year, grad_month,
			dietary_preference, allergies, github_url, linkedin_url, resume_url, skills, default_team_preference,
			industry, years_of_experience, mentor_expertise, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
		)
		ON CONFLICT (user_id) DO UPDATE SET
			gender = EXCLUDED.gender,
			tshirt_size = EXCLUDED.tshirt_size,
			city = EXCLUDED.city,
			phone_number = EXCLUDED.phone_number,
			emergency_contact_name = EXCLUDED.emergency_contact_name,
			emergency_contact_number = EXCLUDED.emergency_contact_number,
			bio = EXCLUDED.bio,
			readme_md = EXCLUDED.readme_md,
			has_formal_education = EXCLUDED.has_formal_education,
			degree_type = EXCLUDED.degree_type,
			institution = EXCLUDED.institution,
			field_of_study = EXCLUDED.field_of_study,
			grad_year = EXCLUDED.grad_year,
			grad_month = EXCLUDED.grad_month,
			dietary_preference = EXCLUDED.dietary_preference,
			allergies = EXCLUDED.allergies,
			github_url = EXCLUDED.github_url,
			linkedin_url = EXCLUDED.linkedin_url,
			resume_url = EXCLUDED.resume_url,
			skills = EXCLUDED.skills,
			default_team_preference = EXCLUDED.default_team_preference,
			industry = EXCLUDED.industry,
			years_of_experience = EXCLUDED.years_of_experience,
			mentor_expertise = EXCLUDED.mentor_expertise,
			updated_at = EXCLUDED.updated_at
	`

	_, err := r.pool.Exec(ctx, query,
		p.UserID, p.Gender, p.TShirtSize, p.City, p.PhoneNumber, p.EmergencyContactName, p.EmergencyContactNumber, p.Bio, p.ReadmeMd,
		p.HasFormalEducation, p.DegreeType, p.Institution, p.FieldOfStudy, p.GradYear, p.GradMonth,
		p.DietaryPreference, p.Allergies, p.GithubURL, p.LinkedinURL, p.ResumeURL, p.Skills, p.DefaultTeamPreference,
		p.Industry, p.YearsOfExperience, p.MentorExpertise, time.Now(),
	)

	if err != nil {
		return fmt.Errorf("error upserting hacker profile: %w", err)
	}
	return nil
}

func (r *PostgresRepo) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	query := `
		SELECT id, name, email, role, fcm_token, apns_token, status, created_at
		FROM users
		WHERE id = $1
	`
	var u models.User
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Name, &u.Email, &u.Role, &u.FCMToken, &u.APNSToken, &u.Status, &u.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("error fetching user by id: %w", err)
	}
	return &u, nil
}
