package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/raunakkumargupta/repo1/backend/internal/middleware"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/service"
)

type StaffHandler struct {
	staffService *service.StaffService
}

func NewStaffHandler(staffService *service.StaffService) *StaffHandler {
	return &StaffHandler{staffService: staffService}
}

func (h *StaffHandler) Assign(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	var req models.StaffAssignmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	err := h.staffService.AssignStaff(r.Context(), hackathonID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Staff member assigned successfully!"})
}

func (h *StaffHandler) GetMyRole(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	role, err := h.staffService.GetStaffRole(r.Context(), hackathonID, claims.UserID)
	if err != nil {
		// Not found in staff table, so return empty role
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"role": ""})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"role": role})
}

func (h *StaffHandler) GetMyStaffHackathons(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	hackathons, err := h.staffService.GetStaffHackathons(r.Context(), claims.UserID)
	if err != nil {
		fmt.Printf("GetMyStaffHackathons error: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if hackathons == nil {
		hackathons = []models.Hackathon{}
	}
	json.NewEncoder(w).Encode(hackathons)
}

func (h *StaffHandler) GetStaffList(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	staffList, err := h.staffService.GetHackathonStaffList(r.Context(), hackathonID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if staffList == nil {
		staffList = []models.HackathonStaffResponse{}
	}
	json.NewEncoder(w).Encode(staffList)
}

func (h *StaffHandler) Remove(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	userID := chi.URLParam(r, "userId")
	if hackathonID == "" || userID == "" {
		http.Error(w, "hackathon id and user id are required", http.StatusBadRequest)
		return
	}

	err := h.staffService.RemoveStaff(r.Context(), hackathonID, userID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Staff member removed successfully!"})
}

