package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"

	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/repository"
	"github.com/raunakkumargupta/repo1/backend/internal/worker"
)

type TeamService struct {
	pgRepo     *repository.PostgresRepo
	workerPool *worker.WorkerPool
}

func NewTeamService(pgRepo *repository.PostgresRepo, wp *worker.WorkerPool) *TeamService {
	return &TeamService{pgRepo: pgRepo, workerPool: wp}
}

func generateInviteCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Omitted lookalike characters: I, O, 1, 0
	result := make([]byte, 6)
	for i := range result {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		result[i] = chars[n.Int64()]
	}
	return string(result)
}

func (s *TeamService) CreateTeam(ctx context.Context, userID, hackathonID string, req models.CreateTeamRequest) (*models.Team, error) {
	if req.TeamName == "" {
		return nil, errors.New("team name is required")
	}

	inviteCode := generateInviteCode()
	team := &models.Team{
		HackathonID: hackathonID,
		LeaderID:    &userID,
		TeamName:    req.TeamName,
		InviteCode:  inviteCode,
		IsSubmitted: false,
	}

	// Insert team row
	if err := s.pgRepo.CreateTeam(ctx, team); err != nil {
		return nil, err
	}

	// Insert creator to team members mapping
	if err := s.pgRepo.AddUserToTeam(ctx, team.ID, userID); err != nil {
		return nil, err
	}

	// Sync: Create CometChat Group with GUID = team.ID
	go func() {
		ctx := context.Background()
		ccService := NewCometChatService()
		tags := []string{"hackathon:" + hackathonID, "team"}
		if err := ccService.CreateGroup(ctx, team.ID, req.TeamName, userID, tags); err != nil {
			fmt.Printf("[CometChat Sync] Failed to create group %s: %v\n", team.ID, err)
			return
		}
		// Explicitly add the team creator as a member of the group
		s.syncAddMemberToGroup(ctx, team.ID, userID)
	}()

	return team, nil
}

func (s *TeamService) JoinTeam(ctx context.Context, userID, inviteCode string) (*models.Team, error) {
	if inviteCode == "" {
		return nil, errors.New("invite code is required")
	}
	team, err := s.pgRepo.JoinTeamByInviteCode(ctx, userID, inviteCode)
	if err != nil {
		return nil, err
	}
	go s.notifyTeamJoin(userID, team.ID)

	// Sync: Add user to CometChat group
	go s.syncAddMemberToGroup(context.Background(), team.ID, userID)

	return team, nil
}

func (s *TeamService) GetTeamByUserIDAndHackathon(ctx context.Context, userID, hackathonID string) (*models.Team, error) {
	return s.pgRepo.GetTeamByUserIDAndHackathon(ctx, userID, hackathonID)
}

func (s *TeamService) GetTeamMembers(ctx context.Context, teamID string) ([]models.User, error) {
	return s.pgRepo.GetTeamMembers(ctx, teamID)
}

func (s *TeamService) SubmitRepository(ctx context.Context, teamID string, req models.UpdateRepoRequest) error {
	if req.RepositoryURL == "" {
		return errors.New("repository URL is required")
	}
	return s.pgRepo.UpdateTeamRepositoryURL(ctx, teamID, req.RepositoryURL)
}

func (s *TeamService) GetTeamsByHackathon(ctx context.Context, hackathonID string, onlySubmitted bool) ([]models.Team, error) {
	return s.pgRepo.GetTeamsByHackathon(ctx, hackathonID, onlySubmitted)
}

func (s *TeamService) ToggleTeamWinner(ctx context.Context, teamID string, isWinner bool) error {
	return s.pgRepo.UpdateTeamWinnerStatus(ctx, teamID, isWinner)
}

func (s *TeamService) RemoveMember(ctx context.Context, teamID, memberID, requesterID string) error {
	team, err := s.pgRepo.GetTeamByID(ctx, teamID)
	if err != nil {
		return err
	}
	if team == nil {
		return errors.New("team not found")
	}

	// Only leader can remove members, or members can leave voluntarily
	if team.LeaderID == nil || (*team.LeaderID != requesterID && memberID != requesterID) {
		return errors.New("only team leader can remove members")
	}

	if *team.LeaderID == memberID {
		return errors.New("team leader cannot be removed")
	}

	if err := s.pgRepo.RemoveUserFromTeam(ctx, teamID, memberID); err != nil {
		return err
	}

	// Sync: Remove user from CometChat group
	go s.syncRemoveMemberFromGroup(context.Background(), teamID, memberID)

	return nil
}

func (s *TeamService) GetPublicTeamsByHackathon(ctx context.Context, hackathonID string, limit, offset *int, search *string) ([]models.TeamWithMembers, error) {
	return s.pgRepo.GetPublicTeamsByHackathon(ctx, hackathonID, limit, offset, search)
}

// Requests
func (s *TeamService) CreateJoinRequest(ctx context.Context, teamID, userID string) error {
	req := &models.TeamJoinRequest{
		TeamID: teamID,
		UserID: userID,
		Status: "Pending",
	}
	return s.pgRepo.CreateJoinRequest(ctx, req)
}

func (s *TeamService) WithdrawJoinRequest(ctx context.Context, reqID, userID string) error {
	return s.pgRepo.WithdrawJoinRequest(ctx, reqID, userID)
}

func (s *TeamService) ManageJoinRequest(ctx context.Context, reqID, status, requesterID string) error {
	req, err := s.pgRepo.GetJoinRequestByID(ctx, reqID)
	if err != nil {
		return err
	}
	team, err := s.pgRepo.GetTeamByID(ctx, req.TeamID)
	if err != nil {
		return err
	}

	if team.LeaderID == nil || *team.LeaderID != requesterID {
		return errors.New("only team leader can manage requests")
	}

	if err := s.pgRepo.UpdateJoinRequestStatus(ctx, reqID, status); err != nil {
		return err
	}

	if status == "Accepted" {
		err := s.pgRepo.AddUserToTeam(ctx, req.TeamID, req.UserID)
		if err == nil {
			go s.notifyTeamJoin(req.UserID, req.TeamID)
			// Sync: Add accepted user to CometChat group
			go s.syncAddMemberToGroup(context.Background(), req.TeamID, req.UserID)
		}
		return err
	}

	return nil
}

func (s *TeamService) GetJoinRequestsForTeam(ctx context.Context, teamID string) ([]models.TeamJoinRequest, error) {
	return s.pgRepo.GetJoinRequestsForTeam(ctx, teamID)
}

func (s *TeamService) GetMyJoinRequests(ctx context.Context, hackathonID, userID string) ([]models.TeamJoinRequest, error) {
	return s.pgRepo.GetMyJoinRequests(ctx, hackathonID, userID)
}

// Invitations
func (s *TeamService) CreateInvitation(ctx context.Context, teamID, inviteeEmail, requesterID string) error {
	team, err := s.pgRepo.GetTeamByID(ctx, teamID)
	if err != nil {
		return err
	}
	if team.LeaderID == nil || *team.LeaderID != requesterID {
		return errors.New("only team leader can invite members")
	}

	user, err := s.pgRepo.GetUserByEmail(ctx, inviteeEmail)
	if err != nil || user == nil {
		return errors.New("user not found")
	}

	// Verify the invitee is actually registered for this hackathon
	reg, err := s.pgRepo.GetRegistrationByUserAndHackathon(ctx, user.ID, team.HackathonID)
	if err != nil || reg == nil {
		return errors.New("this user has not registered for this hackathon")
	}

	// Check if they are already in a team for this hackathon
	existingTeam, _ := s.pgRepo.GetTeamByUserIDAndHackathon(ctx, user.ID, team.HackathonID)
	if existingTeam != nil {
		return errors.New("this user is already in a team for this hackathon")
	}

	inv := &models.TeamInvitation{
		TeamID:    teamID,
		InviteeID: user.ID,
		Status:    "Pending",
	}
	return s.pgRepo.CreateInvitation(ctx, inv)
}

func (s *TeamService) ManageInvitation(ctx context.Context, invID, status, userID string) error {
	inv, err := s.pgRepo.GetInvitationByID(ctx, invID)
	if err != nil {
		return err
	}
	if inv.InviteeID != userID {
		return errors.New("unauthorized")
	}

	if err := s.pgRepo.UpdateInvitationStatus(ctx, invID, status); err != nil {
		return err
	}

	if status == "Accepted" {
		err := s.pgRepo.AddUserToTeam(ctx, inv.TeamID, inv.InviteeID)
		if err == nil {
			go s.notifyTeamJoin(inv.InviteeID, inv.TeamID)
			// Sync: Add accepted invitee to CometChat group
			go s.syncAddMemberToGroup(context.Background(), inv.TeamID, inv.InviteeID)
		}
		return err
	}
	return nil
}

func (s *TeamService) GetMyInvitations(ctx context.Context, hackathonID, userID string) ([]models.TeamInvitation, error) {
	return s.pgRepo.GetMyInvitations(ctx, hackathonID, userID)
}

func (s *TeamService) notifyTeamJoin(joiningUserID, teamID string) {
	ctx := context.Background()
	user, err := s.pgRepo.GetUserByID(ctx, joiningUserID)
	if err != nil || user == nil {
		return
	}

	team, err := s.pgRepo.GetTeamByID(ctx, teamID)
	if err != nil || team == nil {
		return
	}

	tokens, err := s.pgRepo.GetFcmTokensForTeam(ctx, teamID)
	if err != nil || len(tokens) == 0 {
		return
	}

	var targetTokens []string
	for _, t := range tokens {
		if user.FCMToken != nil && t == *user.FCMToken {
			continue
		}
		targetTokens = append(targetTokens, t)
	}

	if len(targetTokens) > 0 {
		s.workerPool.Enqueue(worker.Job{
			Type: "FCM_NOTIFICATION",
			Payload: worker.FcmJobPayload{
				Tokens: targetTokens,
				Title:  "New Team Member",
				Body:   fmt.Sprintf("%s has joined your team %s!", user.Name, team.TeamName),
			},
		})
	}
}

func (s *TeamService) syncAddMemberToGroup(ctx context.Context, teamID, userID string) {
	ccService := NewCometChatService()
	if err := ccService.AddMemberToGroup(ctx, teamID, userID); err != nil {
		fmt.Printf("[CometChat Sync] AddMemberToGroup failed for %s to group %s: %v. Retrying after ensuring user exists in CometChat...\n", userID, teamID, err)
		u, dbErr := s.pgRepo.GetUserByID(ctx, userID)
		if dbErr != nil {
			fmt.Printf("[CometChat Sync] Failed to get user %s from DB: %v\n", userID, dbErr)
			return
		}
		if errCreate := ccService.CreateUser(ctx, u.ID, u.Name, u.Role); errCreate != nil {
			fmt.Printf("[CometChat Sync] Failed to recreate user %s in CometChat: %v\n", userID, errCreate)
			return
		}
		if errRetry := ccService.AddMemberToGroup(ctx, teamID, userID); errRetry != nil {
			fmt.Printf("[CometChat Sync] Failed on retry to add member %s to group %s: %v\n", userID, teamID, errRetry)
		} else {
			fmt.Printf("[CometChat Sync] Successfully added member %s to group %s on retry\n", userID, teamID)
		}
	}
}

func (s *TeamService) syncRemoveMemberFromGroup(ctx context.Context, teamID, userID string) {
	ccService := NewCometChatService()
	if err := ccService.RemoveMemberFromGroup(ctx, teamID, userID); err != nil {
		fmt.Printf("[CometChat Sync] RemoveMemberFromGroup failed for %s from group %s: %v\n", userID, teamID, err)
	}
}
