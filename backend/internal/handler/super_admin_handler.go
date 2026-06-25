package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/service"
)

type SuperAdminHandler struct {
	adminService *service.SuperAdminService
}

func NewSuperAdminHandler(adminService *service.SuperAdminService) *SuperAdminHandler {
	return &SuperAdminHandler{adminService: adminService}
}

func (h *SuperAdminHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	list, err := h.adminService.ListPendingHackathons(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func (h *SuperAdminHandler) Approve(w http.ResponseWriter, r *http.Request) {
	hackID := chi.URLParam(r, "id")
	if hackID == "" {
		http.Error(w, "hackathon id required", http.StatusBadRequest)
		return
	}

	var req models.UpdateRegistrationStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if req.Status == "Accepted" {
		err := h.adminService.ApproveOrganizer(r.Context(), hackID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Hackathon approval state updated successfully"})
}

func (h *SuperAdminHandler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.adminService.GetGlobalMetrics(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

func (h *SuperAdminHandler) GetModerationLogs(w http.ResponseWriter, r *http.Request) {
	logs, err := h.adminService.GetModerationLogs(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

func (h *SuperAdminHandler) BanUser(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")
	if userID == "" {
		http.Error(w, "user id required", http.StatusBadRequest)
		return
	}

	var req models.UpdateUserStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	status := req.Status
	if status == "" {
		status = "deactivated"
	}

	err := h.adminService.UpdateUserStatus(r.Context(), userID, status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "User status updated successfully"})
}

// SyncCometChatUsers backfills all existing app users into CometChat (one-time).
func (h *SuperAdminHandler) SyncCometChatUsers(w http.ResponseWriter, r *http.Request) {
	result, err := h.adminService.SyncAllUsersToCometChat(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
