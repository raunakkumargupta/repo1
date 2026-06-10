package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/raunakkumargupta/repo1/backend/internal/middleware"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/service"
)

type UserHandler struct {
	userService *service.UserService
}

func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

func (h *UserHandler) GetUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.userService.GetUsers(r.Context())
	if err != nil {
		http.Error(w, "failed to fetch users", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (h *UserHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")
	if userID == "" {
		http.Error(w, "user id required", http.StatusBadRequest)
		return
	}

	var req models.UpdateUserRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	err := h.userService.UpdateUserRole(r.Context(), userID, req.Role)
	if err != nil {
		http.Error(w, "failed to update user role", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "user role updated successfully"})
}

func (h *UserHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := h.userService.GetUserByID(r.Context(), claims.UserID)
	if err != nil || user == nil {
		// Fallback to claims if user not found (shouldn't happen)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":   claims.UserID,
			"role": claims.Role,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// RegisterFcmToken stores the mobile device's Firebase Cloud Messaging token
// so the backend can send targeted push notifications to this device.
func (h *UserHandler) RegisterFcmToken(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req struct {
		Token    string `json:"token"`
		Platform string `json:"platform"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Token == "" {
		http.Error(w, "token is required", http.StatusBadRequest)
		return
	}

	if err := h.userService.SaveFcmToken(r.Context(), claims.UserID, req.Token, req.Platform); err != nil {
		http.Error(w, "failed to save FCM token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "FCM token registered"})
}
