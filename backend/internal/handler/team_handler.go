package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/raunakkumargupta/repo1/backend/internal/middleware"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/service"
)

type TeamHandler struct {
	teamService *service.TeamService
}

func NewTeamHandler(teamService *service.TeamService) *TeamHandler {
	return &TeamHandler{teamService: teamService}
}

func (h *TeamHandler) Create(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	var req models.CreateTeamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	team, err := h.teamService.CreateTeam(r.Context(), claims.UserID, hackathonID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(team)
}

func (h *TeamHandler) Join(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	var req models.JoinTeamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	team, err := h.teamService.JoinTeam(r.Context(), claims.UserID, req.InviteCode)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(team)
}

func (h *TeamHandler) GetMyTeam(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	team, err := h.teamService.GetTeamByUserIDAndHackathon(r.Context(), claims.UserID, hackathonID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if team == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(nil)
		return
	}

	members, err := h.teamService.GetTeamMembers(r.Context(), team.ID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"team":    team,
		"members": members,
	})
}

func (h *TeamHandler) SubmitProject(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	team, err := h.teamService.GetTeamByUserIDAndHackathon(r.Context(), claims.UserID, hackathonID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if team == nil {
		http.Error(w, "you are not in a team", http.StatusBadRequest)
		return
	}

	var req models.UpdateRepoRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	err = h.teamService.SubmitRepository(r.Context(), team.ID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Project submitted successfully!"})
}

func (h *TeamHandler) ListSubmissions(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	list, err := h.teamService.GetTeamsByHackathon(r.Context(), hackathonID, true)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *TeamHandler) MarkWinner(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	teamID := chi.URLParam(r, "team_id")
	if hackathonID == "" || teamID == "" {
		http.Error(w, "hackathon id and team id are required", http.StatusBadRequest)
		return
	}

	var req struct {
		IsWinner bool `json:"is_winner"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.teamService.ToggleTeamWinner(r.Context(), teamID, req.IsWinner); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *TeamHandler) RemoveMember(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "team_id")
	memberID := chi.URLParam(r, "member_id")
	claims := middleware.GetUserClaims(r.Context())

	if err := h.teamService.RemoveMember(r.Context(), teamID, memberID, claims.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *TeamHandler) GetPublicTeams(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	teams, err := h.teamService.GetPublicTeamsByHackathon(r.Context(), hackathonID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(teams)
}

func (h *TeamHandler) RequestToJoin(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "team_id")
	claims := middleware.GetUserClaims(r.Context())

	if err := h.teamService.CreateJoinRequest(r.Context(), teamID, claims.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *TeamHandler) WithdrawRequest(w http.ResponseWriter, r *http.Request) {
	reqID := chi.URLParam(r, "req_id")
	claims := middleware.GetUserClaims(r.Context())

	if err := h.teamService.WithdrawJoinRequest(r.Context(), reqID, claims.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *TeamHandler) ManageRequest(w http.ResponseWriter, r *http.Request) {
	reqID := chi.URLParam(r, "req_id")
	claims := middleware.GetUserClaims(r.Context())

	var req models.UpdateJoinRequestStatus
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.teamService.ManageJoinRequest(r.Context(), reqID, req.Status, claims.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *TeamHandler) GetTeamRequests(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "team_id")
	reqs, err := h.teamService.GetJoinRequestsForTeam(r.Context(), teamID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reqs)
}

func (h *TeamHandler) GetMyRequests(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	claims := middleware.GetUserClaims(r.Context())
	reqs, err := h.teamService.GetMyJoinRequests(r.Context(), hackathonID, claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reqs)
}

func (h *TeamHandler) InviteUser(w http.ResponseWriter, r *http.Request) {
	teamID := chi.URLParam(r, "team_id")
	claims := middleware.GetUserClaims(r.Context())

	var req models.InviteUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.teamService.CreateInvitation(r.Context(), teamID, req.Email, claims.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *TeamHandler) ManageInvitation(w http.ResponseWriter, r *http.Request) {
	invID := chi.URLParam(r, "inv_id")
	claims := middleware.GetUserClaims(r.Context())

	var req models.UpdateInvitationStatus
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.teamService.ManageInvitation(r.Context(), invID, req.Status, claims.UserID); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func (h *TeamHandler) GetMyInvitations(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	claims := middleware.GetUserClaims(r.Context())
	invs, err := h.teamService.GetMyInvitations(r.Context(), hackathonID, claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(invs)
}
