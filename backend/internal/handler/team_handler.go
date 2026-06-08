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
