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

type HackathonHandler struct {
	hackService *service.HackathonService
}

func NewHackathonHandler(hackService *service.HackathonService) *HackathonHandler {
	return &HackathonHandler{hackService: hackService}
}

func (h *HackathonHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetUserClaims(r.Context())
	var req models.CreateHackathonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	hack, err := h.hackService.CreateHackathon(r.Context(), claims.UserID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(hack)
}

func (h *HackathonHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	hack, err := h.hackService.GetHackathonByID(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if hack == nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(hack)
}

func (h *HackathonHandler) ListApproved(w http.ResponseWriter, r *http.Request) {
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

	var searchPtr *string
	if searchStr := r.URL.Query().Get("search"); searchStr != "" {
		searchPtr = &searchStr
	}

	var trackPtr *string
	if trackStr := r.URL.Query().Get("track"); trackStr != "" {
		trackPtr = &trackStr
	}

	list, totalCount, err := h.hackService.GetHackathons(r.Context(), true, limitPtr, offsetPtr, searchPtr, trackPtr, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Total-Count", strconv.Itoa(totalCount))
	w.Header().Set("Access-Control-Expose-Headers", "X-Total-Count")
	json.NewEncoder(w).Encode(list)
}

func (h *HackathonHandler) ListAll(w http.ResponseWriter, r *http.Request) {
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

	var searchPtr *string
	if searchStr := r.URL.Query().Get("search"); searchStr != "" {
		searchPtr = &searchStr
	}

	var trackPtr *string
	if trackStr := r.URL.Query().Get("track"); trackStr != "" {
		trackPtr = &trackStr
	}

	var organizerIDPtr *string
	if organizerIDStr := r.URL.Query().Get("organizer_id"); organizerIDStr != "" {
		organizerIDPtr = &organizerIDStr
	}

	list, totalCount, err := h.hackService.GetHackathons(r.Context(), false, limitPtr, offsetPtr, searchPtr, trackPtr, organizerIDPtr)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Total-Count", strconv.Itoa(totalCount))
	w.Header().Set("Access-Control-Expose-Headers", "X-Total-Count")
	json.NewEncoder(w).Encode(list)
}

func (h *HackathonHandler) UpdateDetails(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	var req models.UpdateHackathonDetailsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.hackService.UpdateHackathonDetails(r.Context(), id, req); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

func (h *HackathonHandler) DeleteHackathon(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		http.Error(w, "id is required", http.StatusBadRequest)
		return
	}

	if err := h.hackService.DeleteHackathon(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "hackathon deleted successfully"})
}

