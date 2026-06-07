package handler

import (
	"encoding/json"
	"net/http"

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

func (h *RegistrationHandler) CreateRegistration(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	var req models.CreateRegistrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	reg, err := h.regService.CreateRegistration(r.Context(), claims.UserID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(reg)
}

func (h *RegistrationHandler) GetMyRegistration(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())

	reg, err := h.regService.GetRegistrationByUserID(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if reg == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reg)
}
