package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/raunakkumargupta/repo1/backend/internal/middleware"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/service"
)

type JudgeHandler struct {
	judgeService *service.JudgeService
}

func NewJudgeHandler(judgeService *service.JudgeService) *JudgeHandler {
	return &JudgeHandler{judgeService: judgeService}
}

func (h *JudgeHandler) ListSubmittedProjects(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	projects, err := h.judgeService.GetSubmittedProjects(r.Context(), hackathonID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch already evaluated team ids by this judge
	evaluated, err := h.judgeService.GetEvaluatedTeamsByJudge(r.Context(), claims.UserID)
	if err != nil {
		evaluated = make(map[string]bool)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"projects":  projects,
		"evaluated": evaluated,
	})
}

func (h *JudgeHandler) SubmitEvaluation(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	var req models.EvaluateProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	ev, err := h.judgeService.SubmitEvaluation(r.Context(), hackathonID, claims.UserID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ev)
}
