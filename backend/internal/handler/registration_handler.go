package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/raunakkumargupta/repo1/backend/internal/middleware"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/service"
)

type RegistrationHandler struct {
	regService *service.RegistrationService
}

func NewRegistrationHandler(regService *service.RegistrationService) *RegistrationHandler {
	return &RegistrationHandler{regService: regService}
}

func (h *RegistrationHandler) Apply(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	var req models.ApplyHackathonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	reg, err := h.regService.Apply(r.Context(), claims.UserID, hackathonID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(reg)
}

func (h *RegistrationHandler) GetMyRegistration(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	reg, err := h.regService.GetRegistration(r.Context(), claims.UserID, hackathonID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if reg == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reg)
}

func (h *RegistrationHandler) GetMyRegistrations(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	list, err := h.regService.GetRegistrationsByUserID(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if list == nil {
		list = []models.Registration{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *RegistrationHandler) ListByHackathon(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	var limitPtr, offsetPtr *int
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil {
			limitPtr = &limit
		}
	}
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil {
			offsetPtr = &offset
		}
	}

	var approvalStatusPtr, teamPreferencePtr, searchPtr, excludeUserIDPtr *string
	if status := r.URL.Query().Get("approval_status"); status != "" {
		approvalStatusPtr = &status
	}
	if preference := r.URL.Query().Get("team_preference"); preference != "" {
		teamPreferencePtr = &preference
	}
	if search := r.URL.Query().Get("search"); search != "" {
		searchPtr = &search
	}
	if excludeUserID := r.URL.Query().Get("exclude_user_id"); excludeUserID != "" {
		excludeUserIDPtr = &excludeUserID
	}

	list, total, err := h.regService.ListByHackathon(r.Context(), hackathonID, limitPtr, offsetPtr, approvalStatusPtr, teamPreferencePtr, searchPtr, excludeUserIDPtr)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("X-Total-Count", strconv.Itoa(total))
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *RegistrationHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	regID := chi.URLParam(r, "reg_id")
	if regID == "" {
		http.Error(w, "registration id is required", http.StatusBadRequest)
		return
	}

	var req models.UpdateRegistrationStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	err := h.regService.UpdateStatus(r.Context(), regID, req.Status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Status updated successfully!"})
}

// Legacy compatibility
func (h *RegistrationHandler) CreateRegistration(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	var req models.CreateRegistrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Fetch or stub a default/active hackathon ID if available
	hackathonID := "00000000-0000-0000-0000-000000000000" // placeholder for backwards compatibility
	skillsArr := []string{}
	_ = json.Unmarshal([]byte(req.Skills), &skillsArr)

	applyReq := models.ApplyHackathonRequest{
		GithubURL:      req.GithubURL,
		LinkedinURL:    req.LinkedinURL,
		Skills:         skillsArr,
		TeamPreference: req.Status, // maps old status ('Looking for Team' etc) to preference
		ResumeURL:      nil,
	}

	reg, err := h.regService.Apply(r.Context(), claims.UserID, hackathonID, applyReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(reg)
}
