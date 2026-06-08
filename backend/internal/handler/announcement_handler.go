package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/service"
)

type AnnouncementHandler struct {
	annService *service.AnnouncementService
}

func NewAnnouncementHandler(annService *service.AnnouncementService) *AnnouncementHandler {
	return &AnnouncementHandler{annService: annService}
}

func (h *AnnouncementHandler) Create(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	var req models.AnnouncementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	ann, err := h.annService.CreateAnnouncement(r.Context(), hackathonID, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ann)
}

func (h *AnnouncementHandler) List(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	list, err := h.annService.GetAnnouncements(r.Context(), hackathonID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}
