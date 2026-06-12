package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/raunakkumargupta/repo1/backend/internal/middleware"
	"github.com/raunakkumargupta/repo1/backend/internal/models"
	"github.com/raunakkumargupta/repo1/backend/internal/service"
)

type TicketHandler struct {
	ticketService *service.TicketService
}

func NewTicketHandler(ticketService *service.TicketService) *TicketHandler {
	return &TicketHandler{ticketService: ticketService}
}

func (h *TicketHandler) CreateTicket(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	var req models.CreateTicketRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	ticket, err := h.ticketService.CreateTicket(r.Context(), hackathonID, req)
	if err != nil {
		// Return the error message (e.g. "already has an open ticket")
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ticket)
}

func (h *TicketHandler) GetMyTickets(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	teamID := r.URL.Query().Get("team_id")
	if hackathonID == "" || teamID == "" {
		http.Error(w, "hackathon_id and team_id are required", http.StatusBadRequest)
		return
	}

	tickets, err := h.ticketService.GetMyTeamTickets(r.Context(), hackathonID, teamID)
	if err != nil {
		http.Error(w, "failed to fetch tickets", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if tickets == nil {
		tickets = []models.Ticket{}
	}
	json.NewEncoder(w).Encode(tickets)
}

func (h *TicketHandler) GetQueue(w http.ResponseWriter, r *http.Request) {
	hackathonID := chi.URLParam(r, "id")
	if hackathonID == "" {
		http.Error(w, "hackathon id is required", http.StatusBadRequest)
		return
	}

	tickets, err := h.ticketService.GetHackathonTicketsQueue(r.Context(), hackathonID)
	if err != nil {
		http.Error(w, "failed to fetch tickets", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tickets)
}

func (h *TicketHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	ticketID := chi.URLParam(r, "ticket_id")
	if ticketID == "" {
		// Fallback to older param key
		ticketID = chi.URLParam(r, "id")
	}
	if ticketID == "" {
		http.Error(w, "ticket id required", http.StatusBadRequest)
		return
	}

	var req models.UpdateTicketStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	claims := middleware.GetUserClaims(r.Context())
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	err := h.ticketService.UpdateTicketStatus(r.Context(), ticketID, req.Status, claims.UserID)
	if err != nil {
		http.Error(w, "failed to update ticket", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "ticket updated successfully"})
}
