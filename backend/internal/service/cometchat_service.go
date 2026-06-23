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
	"strings"
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
		Role: "default",
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

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		log.Printf("[CometChat] User created: UID=%s Name=%s Role=%s", uid, name, role)
		return nil
	}

	// Treat conflict (409) or 400 Bad Request with ERR_UID_ALREADY_EXISTS code as success for idempotency
	if resp.StatusCode == http.StatusConflict {
		log.Printf("[CometChat] User already exists (409): UID=%s — skipping", uid)
		return nil
	}

	var errResp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(respBody, &errResp); err == nil {
		if errResp.Error.Code == "ERR_UID_ALREADY_EXISTS" {
			log.Printf("[CometChat] User already exists: UID=%s — skipping", uid)
			return nil
		}
	}

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

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		log.Printf("[CometChat] Group created: GUID=%s Name=%s", guid, name)
		return nil
	}

	// Treat conflict (409) or 400 Bad Request with ERR_GUID_ALREADY_EXISTS code as success for idempotency
	if resp.StatusCode == http.StatusConflict {
		log.Printf("[CometChat] Group already exists (409): GUID=%s — skipping", guid)
		return nil
	}

	var errResp struct {
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	if err := json.Unmarshal(respBody, &errResp); err == nil {
		if errResp.Error.Code == "ERR_GUID_ALREADY_EXISTS" {
			log.Printf("[CometChat] Group already exists: GUID=%s — skipping", guid)
			return nil
		}
	}

	return fmt.Errorf("cometchat: create-group failed (status %d): %s", resp.StatusCode, string(respBody))
}

// AddMemberToGroup adds a user to a CometChat group.
func (s *CometChatService) AddMemberToGroup(ctx context.Context, guid, uid string) error {
	payload := map[string]interface{}{
		"participants": []string{uid},
	}

	body, _ := json.Marshal(payload)

	req, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/groups/"+guid+"/members", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("cometchat: failed to build add-member request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("cometchat: add-member HTTP error: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("cometchat: failed to read add-member response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return fmt.Errorf("cometchat: add-member HTTP failure (status %d): %s", resp.StatusCode, string(respBody))
	}

	// Parse the response body to check for user success
	var result struct {
		Data struct {
			Participants map[string]struct {
				Success bool `json:"success"`
				Error   *struct {
					Code    string `json:"code"`
					Message string `json:"message"`
				} `json:"error"`
			} `json:"participants"`
		} `json:"data"`
	}

	if err := json.Unmarshal(respBody, &result); err != nil {
		return fmt.Errorf("cometchat: failed to parse add-member JSON response: %w", err)
	}

	pResult, exists := result.Data.Participants[uid]
	if !exists {
		for k, v := range result.Data.Participants {
			if strings.EqualFold(k, uid) {
				pResult = v
				exists = true
				break
			}
		}
	}

	if !exists {
		return fmt.Errorf("cometchat: add-member response did not contain status for UID %s: %s", uid, string(respBody))
	}

	if !pResult.Success {
		if pResult.Error != nil {
			code := pResult.Error.Code
			// If user is already in the group (or is the group owner/already has this scope), treat as success
			if code == "ERR_GROUP_OWNER_DEMOTE_FORBIDDEN" || code == "ERR_SAME_SCOPE" || code == "ERR_ALREADY_JOINED" {
				log.Printf("[CometChat] Member %s already in group %s (code: %s) — skipping", uid, guid, code)
				return nil
			}
			return fmt.Errorf("cometchat: add-member failed for UID %s: %s (code: %s)", uid, pResult.Error.Message, pResult.Error.Code)
		}
		return fmt.Errorf("cometchat: add-member failed for UID %s: success was false", uid)
	}

	log.Printf("[CometChat] Member added to group: GUID=%s UID=%s", guid, uid)
	return nil
}

// RemoveMemberFromGroup removes a user from a CometChat group.
func (s *CometChatService) RemoveMemberFromGroup(ctx context.Context, guid, uid string) error {
	req, err := http.NewRequestWithContext(ctx, "DELETE", s.baseURL+"/groups/"+guid+"/members/"+uid, nil)
	if err != nil {
		return fmt.Errorf("cometchat: failed to build remove-member request: %w", err)
	}
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("cometchat: remove-member HTTP error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		log.Printf("[CometChat] Member removed from group: GUID=%s UID=%s", guid, uid)
		return nil
	}
	if resp.StatusCode == http.StatusNotFound {
		log.Printf("[CometChat] Member %s not in group %s (404) — skipping", uid, guid)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("cometchat: remove-member failed (status %d): %s", resp.StatusCode, string(respBody))
}

// DeleteGroup deletes a CometChat group.
func (s *CometChatService) DeleteGroup(ctx context.Context, guid string) error {
	req, err := http.NewRequestWithContext(ctx, "DELETE", s.baseURL+"/groups/"+guid, nil)
	if err != nil {
		return fmt.Errorf("cometchat: failed to build delete-group request: %w", err)
	}
	req.Header.Set("apikey", s.apiKey)
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("cometchat: delete-group HTTP error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		log.Printf("[CometChat] Group deleted: GUID=%s", guid)
		return nil
	}

	respBody, _ := io.ReadAll(resp.Body)
	// If the group is already gone (404), return nil for idempotency
	if resp.StatusCode == http.StatusNotFound {
		log.Printf("[CometChat] Group already deleted (404): GUID=%s — skipping", guid)
		return nil
	}
	return fmt.Errorf("cometchat: delete-group failed (status %d): %s", resp.StatusCode, string(respBody))
}
