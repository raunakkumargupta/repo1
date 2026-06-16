package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
)

// CometChatService handles all interactions with the CometChat REST API.
// It syncs users and groups between our PostgreSQL database and CometChat.
type CometChatService struct {
	appID   string
	region  string
	apiKey  string
	baseURL string
}

func NewCometChatService() *CometChatService {
	appID := os.Getenv("COMETCHAT_APP_ID")
	region := os.Getenv("COMETCHAT_REGION")
	apiKey := os.Getenv("COMETCHAT_API_KEY")

	if appID == "" || region == "" || apiKey == "" {
		log.Println("[CometChat] WARNING: COMETCHAT_APP_ID, COMETCHAT_REGION, or COMETCHAT_API_KEY not set")
	}

	baseURL := fmt.Sprintf("https://%s.api-%s.cometchat.io/v3", appID, region)

	return &CometChatService{
		appID:   appID,
		region:  region,
		apiKey:  apiKey,
		baseURL: baseURL,
	}
}

// ─── User Sync ────────────────────────────────────────────────────────────────

type CometChatUserPayload struct {
	UID      string                 `json:"uid"`
	Name     string                 `json:"name"`
	Role     string                 `json:"role,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
	Tags     []string               `json:"tags,omitempty"`
}

// CreateUser creates a new user in CometChat.
// Called during registration — maps our PostgreSQL user.ID to CometChat UID.
func (s *CometChatService) CreateUser(ctx context.Context, uid, name, role string) error {
	payload := CometChatUserPayload{
		UID:  uid,
		Name: name,
		Role: role,
		Tags: []string{role},
		Metadata: map[string]interface{}{
			"app_role": role,
		},
	}

	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/users", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("cometchat: failed to build create-user request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("cometchat: create-user HTTP error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		log.Printf("[CometChat] User created: UID=%s Name=%s Role=%s", uid, name, role)
		return nil
	}

	// If user already exists (409), that's fine — treat as success for idempotency
	if resp.StatusCode == http.StatusConflict {
		log.Printf("[CometChat] User already exists: UID=%s — skipping", uid)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("cometchat: create-user failed (status %d): %s", resp.StatusCode, string(respBody))
}

// UpdateUser updates user metadata/role in CometChat when the app user profile changes.
func (s *CometChatService) UpdateUser(ctx context.Context, uid, name, role string) error {
	payload := map[string]interface{}{
		"name": name,
		"role": role,
		"tags": []string{role},
		"metadata": map[string]interface{}{
			"app_role": role,
		},
	}

	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "PUT", s.baseURL+"/users/"+uid, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("cometchat: failed to build update-user request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("cometchat: update-user HTTP error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		log.Printf("[CometChat] User updated: UID=%s", uid)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("cometchat: update-user failed (status %d): %s", resp.StatusCode, string(respBody))
}

// DeactivateUser deactivates a user in CometChat when banned/deactivated in our app.
func (s *CometChatService) DeactivateUser(ctx context.Context, uid string) error {
	payload := map[string]interface{}{
		"activated": false,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "PUT", s.baseURL+"/users/"+uid, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("cometchat: failed to build deactivate-user request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("cometchat: deactivate-user HTTP error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		log.Printf("[CometChat] User deactivated: UID=%s", uid)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("cometchat: deactivate-user failed (status %d): %s", resp.StatusCode, string(respBody))
}

// ─── Group Sync ───────────────────────────────────────────────────────────────

type CometChatGroupPayload struct {
	GUID     string                 `json:"guid"`
	Name     string                 `json:"name"`
	Type     string                 `json:"type"` // "public", "private", "password"
	Metadata map[string]interface{} `json:"metadata,omitempty"`
	Tags     []string               `json:"tags,omitempty"`
	Owner    string                 `json:"owner,omitempty"`
}

// CreateGroup creates a CometChat group mapped to a team.
// GUID = team_id from our PostgreSQL teams table.
func (s *CometChatService) CreateGroup(ctx context.Context, guid, name, ownerUID string, tags []string) error {
	payload := CometChatGroupPayload{
		GUID:  guid,
		Name:  name,
		Type:  "private",
		Owner: ownerUID,
		Tags:  tags,
		Metadata: map[string]interface{}{
			"source": "matrix-hackathon-platform",
		},
	}

	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/groups", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("cometchat: failed to build create-group request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("cometchat: create-group HTTP error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		log.Printf("[CometChat] Group created: GUID=%s Name=%s", guid, name)
		return nil
	}

	// 409 = already exists — idempotent
	if resp.StatusCode == http.StatusConflict {
		log.Printf("[CometChat] Group already exists: GUID=%s — skipping", guid)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("cometchat: create-group failed (status %d): %s", resp.StatusCode, string(respBody))
}

// AddMemberToGroup adds a user to a CometChat group.
func (s *CometChatService) AddMemberToGroup(ctx context.Context, guid, uid string) error {
	payload := map[string]interface{}{
		"participants": []map[string]string{
			{"uid": uid},
		},
	}

	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/groups/"+guid+"/members", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("cometchat: failed to build add-member request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("onBehalfOf", uid)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("cometchat: add-member HTTP error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		log.Printf("[CometChat] Member added to group: GUID=%s UID=%s", guid, uid)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	log.Printf("[CometChat] Add member response (status %d): %s", resp.StatusCode, string(respBody))
	// Non-fatal — member might already be in the group
	return nil
}
