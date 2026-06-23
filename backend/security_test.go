package main

// Security Test Suite for Matrix Command Backend
// Run with: go test -v ./security_test.go -tags security
//
// These tests validate the security posture of the API by testing:
// 1. Authentication & Authorization bypass attempts
// 2. Input validation & injection prevention
// 3. Rate limiting enforcement
// 4. RBAC (Role-Based Access Control) enforcement
// 5. Security headers presence
// 6. JWT token security
// 7. Password security
// 8. IDOR (Insecure Direct Object Reference) checks
// 9. Payload size limits
// 10. CORS policy enforcement

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"testing"
	"time"
)

// Configuration — adjust to your running backend
const (
	BaseURL       = "http://192.168.29.115:8080"
	AdminEmail    = "admin@matrix.com"
	AdminPassword = "M@tr1x_P@ssw0rd!2026"
	HackerEmail   = "hacker1@matrix.com"
	HackerPassword = "M@tr1x_P@ssw0rd!2026"
)

// Helper: login and return JWT token
func loginAs(email, password string) (string, error) {
	body := fmt.Sprintf(`{"email":"%s","password":"%s"}`, email, password)
	resp, err := http.Post(BaseURL+"/api/auth/login", "application/json", strings.NewReader(body))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("login failed: status %d", resp.StatusCode)
	}
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	token, ok := result["token"].(string)
	if !ok {
		return "", fmt.Errorf("no token in response")
	}
	return token, nil
}

// Helper: make authenticated request
func authRequest(method, url, token string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	return http.DefaultClient.Do(req)
}

// ============================================================
// TEST 1: Authentication Bypass Attempts
// ============================================================

func TestAuth_NoToken_Returns401(t *testing.T) {
	endpoints := []struct {
		method string
		path   string
	}{
		{"GET", "/api/auth/me"},
		{"GET", "/api/profile/me"},
		{"POST", "/api/hackathons"},
		{"GET", "/api/hackathons/all"},
		{"POST", "/api/users/fcm-token"},
		{"GET", "/api/admin/metrics"},
		{"GET", "/api/admin/moderation/logs"},
	}

	for _, ep := range endpoints {
		t.Run(fmt.Sprintf("%s %s", ep.method, ep.path), func(t *testing.T) {
			req, _ := http.NewRequest(ep.method, BaseURL+ep.path, nil)
			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusUnauthorized {
				t.Errorf("Expected 401, got %d for %s %s", resp.StatusCode, ep.method, ep.path)
			}
		})
	}
}

func TestAuth_InvalidToken_Returns401(t *testing.T) {
	invalidTokens := []string{
		"invalid.token.here",
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZmFrZSIsInJvbGUiOiJBZG1pbiJ9.fake",
		"",
		"Bearer ",
		"null",
	}

	for _, token := range invalidTokens {
		t.Run("token="+token[:min(len(token), 20)], func(t *testing.T) {
			resp, err := authRequest("GET", BaseURL+"/api/auth/me", token, nil)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusUnauthorized {
				t.Errorf("Expected 401 for invalid token, got %d", resp.StatusCode)
			}
		})
	}
}

func TestAuth_ExpiredToken_Returns401(t *testing.T) {
	// This is a token with exp in the past (manually crafted)
	expiredToken := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZmFrZSIsInJvbGUiOiJIYWNrZXIiLCJleHAiOjE2MDAwMDAwMDB9.invalid"
	resp, err := authRequest("GET", BaseURL+"/api/auth/me", expiredToken, nil)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("Expected 401 for expired token, got %d", resp.StatusCode)
	}
}

func TestAuth_TamperedToken_Returns401(t *testing.T) {
	// Get a valid token, then tamper with it
	token, err := loginAs(HackerEmail, HackerPassword)
	if err != nil {
		t.Skipf("Could not login: %v", err)
	}
	// Tamper: change last character
	tampered := token[:len(token)-1] + "X"
	resp, err := authRequest("GET", BaseURL+"/api/auth/me", tampered, nil)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Errorf("Expected 401 for tampered token, got %d", resp.StatusCode)
	}
}

// ============================================================
// TEST 2: RBAC — Role-Based Access Control Enforcement
// ============================================================

func TestRBAC_HackerCannotAccessAdminEndpoints(t *testing.T) {
	token, err := loginAs(HackerEmail, HackerPassword)
	if err != nil {
		t.Skipf("Could not login as hacker: %v", err)
	}

	adminEndpoints := []struct {
		method string
		path   string
	}{
		{"GET", "/api/admin/metrics"},
		{"GET", "/api/admin/moderation/logs"},
		{"GET", "/api/admin/organizers/pending"},
		{"GET", "/api/users"},
		{"POST", "/api/admin/cometchat/sync-users"},
	}

	for _, ep := range adminEndpoints {
		t.Run(fmt.Sprintf("Hacker_%s_%s", ep.method, ep.path), func(t *testing.T) {
			resp, err := authRequest(ep.method, BaseURL+ep.path, token, nil)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusForbidden {
				t.Errorf("Expected 403 Forbidden, got %d for %s %s", resp.StatusCode, ep.method, ep.path)
			}
		})
	}
}

func TestRBAC_HackerCannotAccessMentorEndpoints(t *testing.T) {
	token, err := loginAs(HackerEmail, HackerPassword)
	if err != nil {
		t.Skipf("Could not login as hacker: %v", err)
	}

	// Using a dummy hackathon ID — we mainly check the 403, not 404
	mentorEndpoints := []struct {
		method string
		path   string
	}{
		{"GET", "/api/hackathons/00000000-0000-0000-0000-000000000000/tickets"},
		{"PUT", "/api/tickets/00000000-0000-0000-0000-000000000000/status"},
	}

	for _, ep := range mentorEndpoints {
		t.Run(fmt.Sprintf("Hacker_%s_%s", ep.method, ep.path), func(t *testing.T) {
			var body io.Reader
			if ep.method == "PUT" {
				body = strings.NewReader(`{"status":"Active"}`)
			}
			resp, err := authRequest(ep.method, BaseURL+ep.path, token, body)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			if resp.StatusCode != http.StatusForbidden {
				t.Errorf("Expected 403, got %d for %s %s", resp.StatusCode, ep.method, ep.path)
			}
		})
	}
}

// ============================================================
// TEST 3: SQL Injection Attempts
// ============================================================

func TestSQLInjection_LoginEndpoint(t *testing.T) {
	payloads := []string{
		`{"email":"' OR '1'='1","password":"anything"}`,
		`{"email":"admin@matrix.com","password":"' OR '1'='1"}`,
		`{"email":"admin@matrix.com'; DROP TABLE users;--","password":"x"}`,
		`{"email":"\" OR 1=1 --","password":"test"}`,
		`{"email":"admin@matrix.com","password":"\" OR \"\"=\""}`,
	}

	for i, payload := range payloads {
		t.Run(fmt.Sprintf("SQLi_Login_%d", i), func(t *testing.T) {
			resp, err := http.Post(
				BaseURL+"/api/auth/login",
				"application/json",
				strings.NewReader(payload),
			)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			// Should NOT return 200 with a valid token
			if resp.StatusCode == http.StatusOK {
				body, _ := io.ReadAll(resp.Body)
				if strings.Contains(string(body), "token") {
					t.Errorf("SQL injection succeeded! Payload: %s", payload)
				}
			}
		})
	}
}

func TestSQLInjection_RegisterEndpoint(t *testing.T) {
	payloads := []string{
		`{"name":"Test'; DROP TABLE users;--","email":"sqli@test.com","password":"Password123!","role":"Hacker"}`,
		`{"name":"Test","email":"' UNION SELECT * FROM users--@test.com","password":"Password123!","role":"Hacker"}`,
	}

	for i, payload := range payloads {
		t.Run(fmt.Sprintf("SQLi_Register_%d", i), func(t *testing.T) {
			resp, err := http.Post(
				BaseURL+"/api/auth/register",
				"application/json",
				strings.NewReader(payload),
			)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			// If it returns 201, verify the stored name doesn't execute SQL
			// The key check is that the server doesn't crash or return 500
			if resp.StatusCode == http.StatusInternalServerError {
				t.Errorf("Server error on SQL injection payload — may be vulnerable")
			}
		})
	}
}

// ============================================================
// TEST 4: XSS (Cross-Site Scripting) via API
// ============================================================

func TestXSS_InputSanitization(t *testing.T) {
	token, err := loginAs(HackerEmail, HackerPassword)
	if err != nil {
		t.Skipf("Could not login: %v", err)
	}

	xssPayloads := []string{
		`<script>alert('xss')</script>`,
		`<img src=x onerror=alert(1)>`,
		`javascript:alert(1)`,
		`"><script>alert(document.cookie)</script>`,
		`<svg onload=alert(1)>`,
	}

	for i, xss := range xssPayloads {
		t.Run(fmt.Sprintf("XSS_Profile_%d", i), func(t *testing.T) {
			body := fmt.Sprintf(`{"bio":"%s","github_url":"https://github.com/test"}`, xss)
			resp, err := authRequest("POST", BaseURL+"/api/profile/me", token, strings.NewReader(body))
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			// Server should either reject (400) or store safely (200)
			// NOT return 500
			if resp.StatusCode == http.StatusInternalServerError {
				t.Errorf("Server error on XSS payload — check input handling")
			}
		})
	}
}

// ============================================================
// TEST 5: Security Headers
// ============================================================

func TestSecurityHeaders_Present(t *testing.T) {
	resp, err := http.Get(BaseURL + "/api/hackathons")
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	expectedHeaders := map[string]string{
		"X-Frame-Options":    "DENY",
		"X-XSS-Protection":  "1; mode=block",
		"X-Content-Type-Options": "nosniff",
	}

	for header, expected := range expectedHeaders {
		actual := resp.Header.Get(header)
		if actual != expected {
			t.Errorf("Header %s: expected '%s', got '%s'", header, expected, actual)
		}
	}
}

// ============================================================
// TEST 6: Rate Limiting
// ============================================================

func TestRateLimit_LoginEndpoint(t *testing.T) {
	// Send many requests rapidly — should get 429 eventually
	var wg sync.WaitGroup
	results := make([]int, 25)

	for i := 0; i < 25; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			body := `{"email":"ratelimit@test.com","password":"wrong"}`
			resp, err := http.Post(
				BaseURL+"/api/auth/login",
				"application/json",
				strings.NewReader(body),
			)
			if err != nil {
				results[idx] = 0
				return
			}
			defer resp.Body.Close()
			results[idx] = resp.StatusCode
		}(i)
	}
	wg.Wait()

	got429 := false
	for _, code := range results {
		if code == http.StatusTooManyRequests {
			got429 = true
			break
		}
	}
	if !got429 {
		t.Log("WARNING: Rate limiter did not trigger after 25 concurrent requests.")
		t.Log("This may be acceptable if rate limit is > 25 req/window, but verify configuration.")
	}
}

// ============================================================
// TEST 7: Payload Size Limits (DoS Prevention)
// ============================================================

func TestPayloadSize_ExceedsLimit(t *testing.T) {
	// Create a 2MB payload (limit is 1MB per middleware)
	largePayload := strings.Repeat("A", 2*1024*1024)
	body := fmt.Sprintf(`{"email":"test@test.com","password":"%s"}`, largePayload)

	resp, err := http.Post(
		BaseURL+"/api/auth/login",
		"application/json",
		strings.NewReader(body),
	)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	// Should reject with 400 or 413 (Request Entity Too Large)
	if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
		t.Errorf("Server accepted oversized payload (2MB) — DoS risk!")
	}
}

// ============================================================
// TEST 8: Password Security
// ============================================================

func TestPassword_WeakPasswordRejection(t *testing.T) {
	weakPasswords := []struct {
		password string
		desc     string
	}{
		{"123", "too short"},
		{"password", "common word"},
		{"12345678", "all digits"},
		{"", "empty"},
	}

	for _, tc := range weakPasswords {
		t.Run("WeakPwd_"+tc.desc, func(t *testing.T) {
			body := fmt.Sprintf(`{"name":"Test","email":"weak%d@test.com","password":"%s","role":"Hacker"}`,
				time.Now().UnixNano(), tc.password)
			resp, err := http.Post(
				BaseURL+"/api/auth/register",
				"application/json",
				strings.NewReader(body),
			)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			// Ideally should reject weak passwords (400)
			// If it accepts them (201), log as a warning
			if resp.StatusCode == http.StatusCreated {
				t.Logf("WARNING: Server accepted weak password '%s' — consider adding password policy", tc.password)
			}
		})
	}
}

func TestPassword_NotExposedInResponse(t *testing.T) {
	token, err := loginAs(HackerEmail, HackerPassword)
	if err != nil {
		t.Skipf("Could not login: %v", err)
	}

	resp, err := authRequest("GET", BaseURL+"/api/auth/me", token, nil)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()
	bodyBytes, _ := io.ReadAll(resp.Body)
	bodyStr := string(bodyBytes)

	if strings.Contains(bodyStr, "password_hash") ||
		strings.Contains(bodyStr, "PasswordHash") ||
		strings.Contains(bodyStr, HackerPassword) {
		t.Errorf("Password or hash exposed in API response! Body: %s", bodyStr[:min(len(bodyStr), 200)])
	}
}

// ============================================================
// TEST 9: IDOR (Insecure Direct Object Reference)
// ============================================================

func TestIDOR_CannotAccessOtherUsersProfile(t *testing.T) {
	// Login as hacker1, try to modify hacker2's profile
	token, err := loginAs(HackerEmail, HackerPassword)
	if err != nil {
		t.Skipf("Could not login: %v", err)
	}

	// Try to get another user's profile using their ID
	// This should only return public info, not private details
	resp, err := authRequest("GET", BaseURL+"/api/users/00000000-0000-0000-0000-000000000002/profile", token, nil)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	// Should return 200 with PUBLIC profile or 404, not private data
	if resp.StatusCode == http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		bodyStr := string(bodyBytes)
		if strings.Contains(bodyStr, "password") || strings.Contains(bodyStr, "fcm_token") {
			t.Errorf("IDOR: Private data exposed in public profile endpoint")
		}
	}
}

func TestIDOR_CannotDeleteOtherUsersTeamMember(t *testing.T) {
	token, err := loginAs(HackerEmail, HackerPassword)
	if err != nil {
		t.Skipf("Could not login: %v", err)
	}

	// Try to remove a member from a team we don't own
	resp, err := authRequest("DELETE",
		BaseURL+"/api/hackathons/00000000-0000-0000-0000-000000000001/teams/00000000-0000-0000-0000-000000000001/members/00000000-0000-0000-0000-000000000002",
		token, nil)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	// Should be 403 or 404, not 200
	if resp.StatusCode == http.StatusOK {
		t.Errorf("IDOR: Was able to remove member from team we don't own!")
	}
}

// ============================================================
// TEST 10: CORS Policy
// ============================================================

func TestCORS_DisallowedOriginRejected(t *testing.T) {
	req, _ := http.NewRequest("OPTIONS", BaseURL+"/api/auth/login", nil)
	req.Header.Set("Origin", "https://evil-attacker.com")
	req.Header.Set("Access-Control-Request-Method", "POST")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	allowedOrigin := resp.Header.Get("Access-Control-Allow-Origin")
	if allowedOrigin == "*" || allowedOrigin == "https://evil-attacker.com" {
		t.Errorf("CORS allows arbitrary origin: %s", allowedOrigin)
	}
}

// ============================================================
// TEST 11: JWT Token Manipulation
// ============================================================

func TestJWT_AlgorithmNoneAttack(t *testing.T) {
	// "alg: none" attack — a classic JWT bypass
	// Header: {"alg":"none","typ":"JWT"} → base64url: eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
	// Payload: {"user_id":"fake-admin","role":"SuperAdmin","exp":9999999999}
	noneToken := "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VyX2lkIjoiZmFrZS1hZG1pbiIsInJvbGUiOiJTdXBlckFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ."

	resp, err := authRequest("GET", BaseURL+"/api/admin/metrics", noneToken, nil)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		t.Errorf("CRITICAL: 'alg: none' JWT attack succeeded! Server accepts unsigned tokens!")
	}
}

func TestJWT_RoleEscalationInPayload(t *testing.T) {
	// Login as hacker, then craft a token with role=SuperAdmin
	// This tests if the server validates the signature properly
	// We can't actually forge it without the secret, so we test
	// that a modified payload (which breaks the signature) is rejected
	token, err := loginAs(HackerEmail, HackerPassword)
	if err != nil {
		t.Skipf("Could not login: %v", err)
	}

	// Split JWT and modify payload
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Skip("Token is not standard JWT format")
	}
	// Replace payload with a SuperAdmin claim (breaks signature)
	fakePayload := "eyJ1c2VyX2lkIjoiZmFrZSIsInJvbGUiOiJTdXBlckFkbWluIiwiZXhwIjo5OTk5OTk5OTk5fQ"
	forgedToken := parts[0] + "." + fakePayload + "." + parts[2]

	resp, err := authRequest("GET", BaseURL+"/api/admin/metrics", forgedToken, nil)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		t.Errorf("CRITICAL: Role escalation via JWT payload tampering succeeded!")
	}
}

// ============================================================
// TEST 12: Email Enumeration Prevention
// ============================================================

func TestEmailEnumeration_ForgetPassword(t *testing.T) {
	// Both existing and non-existing emails should return same response
	existingEmail := `{"email":"admin@matrix.com"}`
	fakeEmail := `{"email":"nonexistent_user_xyz@fake.com"}`

	resp1, _ := http.Post(BaseURL+"/api/auth/forget-password", "application/json", strings.NewReader(existingEmail))
	resp2, _ := http.Post(BaseURL+"/api/auth/forget-password", "application/json", strings.NewReader(fakeEmail))

	if resp1 != nil && resp2 != nil {
		defer resp1.Body.Close()
		defer resp2.Body.Close()

		if resp1.StatusCode != resp2.StatusCode {
			t.Errorf("Email enumeration possible: existing=%d, fake=%d", resp1.StatusCode, resp2.StatusCode)
		}

		body1, _ := io.ReadAll(resp1.Body)
		body2, _ := io.ReadAll(resp2.Body)
		if string(body1) != string(body2) {
			t.Logf("WARNING: Different response bodies for existing vs fake email — potential enumeration")
			t.Logf("Existing: %s", string(body1))
			t.Logf("Fake: %s", string(body2))
		}
	}
}

// ============================================================
// TEST 13: Webhook Endpoint Security
// ============================================================

func TestWebhook_MalformedPayload(t *testing.T) {
	payloads := []struct {
		desc string
		body string
	}{
		{"empty object", `{}`},
		{"invalid json", `{not valid json`},
		{"null trigger", `{"trigger":null,"data":{}}`},
		{"huge payload", `{"trigger":"test","data":{"text":"` + strings.Repeat("X", 100000) + `"}}`},
	}

	for _, tc := range payloads {
		t.Run("Webhook_"+tc.desc, func(t *testing.T) {
			resp, err := http.Post(
				BaseURL+"/api/webhooks/cometchat",
				"application/json",
				strings.NewReader(tc.body),
			)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			// Should return 200 (always ack to CometChat) or 400, NOT 500
			if resp.StatusCode == http.StatusInternalServerError {
				t.Errorf("Server crashed on malformed webhook payload: %s", tc.desc)
			}
		})
	}
}

// ============================================================
// TEST 14: Path Traversal & Directory Enumeration
// ============================================================

func TestPathTraversal_Attempts(t *testing.T) {
	paths := []string{
		"/api/../.env",
		"/api/../../etc/passwd",
		"/api/hackathons/../../admin/metrics",
		"/.env",
		"/api/%2e%2e/%2e%2e/etc/passwd",
	}

	for _, path := range paths {
		t.Run("PathTraversal_"+path[:min(len(path), 30)], func(t *testing.T) {
			resp, err := http.Get(BaseURL + path)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			bodyBytes, _ := io.ReadAll(resp.Body)
			bodyStr := string(bodyBytes)

			// Should NOT return sensitive file contents
			if strings.Contains(bodyStr, "DB_URL") ||
				strings.Contains(bodyStr, "JWT_SECRET") ||
				strings.Contains(bodyStr, "root:") {
				t.Errorf("Path traversal exposed sensitive data: %s", path)
			}
		})
	}
}

// ============================================================
// TEST 15: HTTP Method Tampering
// ============================================================

func TestMethodTampering_LoginOnlyAcceptsPost(t *testing.T) {
	methods := []string{"GET", "PUT", "DELETE", "PATCH"}

	for _, method := range methods {
		t.Run("Method_"+method, func(t *testing.T) {
			req, _ := http.NewRequest(method, BaseURL+"/api/auth/login", nil)
			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			// Should return 405 Method Not Allowed or 404
			if resp.StatusCode == http.StatusOK || resp.StatusCode == http.StatusCreated {
				t.Errorf("Login endpoint accepted %s method — should only allow POST", method)
			}
		})
	}
}

// ============================================================
// TEST 16: Sensitive Data Exposure
// ============================================================

func TestSensitiveData_NoStackTraceInErrors(t *testing.T) {
	// Send malformed requests to trigger error paths
	bodies := []string{
		`{"email": 12345}`, // wrong type
		`null`,
		`[]`,
	}

	for i, body := range bodies {
		t.Run(fmt.Sprintf("StackTrace_%d", i), func(t *testing.T) {
			resp, err := http.Post(
				BaseURL+"/api/auth/login",
				"application/json",
				strings.NewReader(body),
			)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			bodyBytes, _ := io.ReadAll(resp.Body)
			bodyStr := string(bodyBytes)

			// Should NOT expose Go stack traces or internal paths
			if strings.Contains(bodyStr, "goroutine") ||
				strings.Contains(bodyStr, "panic") ||
				strings.Contains(bodyStr, "/internal/") ||
				strings.Contains(bodyStr, ".go:") {
				t.Errorf("Stack trace exposed in error response: %s", bodyStr[:min(len(bodyStr), 300)])
			}
		})
	}
}

func TestSensitiveData_NoInternalFieldsInUserResponse(t *testing.T) {
	token, err := loginAs(AdminEmail, AdminPassword)
	if err != nil {
		t.Skipf("Could not login: %v", err)
	}

	resp, err := authRequest("GET", BaseURL+"/api/users", token, nil)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()
	bodyBytes, _ := io.ReadAll(resp.Body)
	bodyStr := string(bodyBytes)

	sensitiveFields := []string{"password_hash", "PasswordHash", "password"}
	for _, field := range sensitiveFields {
		if strings.Contains(bodyStr, field) {
			t.Errorf("Sensitive field '%s' exposed in user list API", field)
		}
	}
}

// ============================================================
// TEST 17: Brute Force Login Protection
// ============================================================

func TestBruteForce_MultipleFailedLogins(t *testing.T) {
	// Attempt 15 rapid failed logins — rate limiter should kick in
	var lastStatus int
	for i := 0; i < 15; i++ {
		body := `{"email":"bruteforce@test.com","password":"wrong_password"}`
		resp, err := http.Post(
			BaseURL+"/api/auth/login",
			"application/json",
			strings.NewReader(body),
		)
		if err != nil {
			continue
		}
		lastStatus = resp.StatusCode
		resp.Body.Close()

		if resp.StatusCode == http.StatusTooManyRequests {
			t.Logf("Rate limiter triggered after %d attempts ✓", i+1)
			return
		}
	}
	t.Logf("INFO: Rate limiter did not trigger after 15 failed attempts (last status: %d). Check rate limit config.", lastStatus)
}

// ============================================================
// TEST 18: Content-Type Validation
// ============================================================

func TestContentType_RejectsNonJSON(t *testing.T) {
	bodies := []struct {
		contentType string
		body        string
	}{
		{"text/plain", `email=admin@matrix.com&password=test`},
		{"application/x-www-form-urlencoded", `email=admin@matrix.com&password=test`},
		{"multipart/form-data", `--boundary\r\nContent-Disposition: form-data; name="email"\r\n\r\nadmin@matrix.com`},
	}

	for _, tc := range bodies {
		t.Run("ContentType_"+tc.contentType, func(t *testing.T) {
			req, _ := http.NewRequest("POST", BaseURL+"/api/auth/login", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", tc.contentType)
			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()
			// Should return 400 (bad request) because JSON decode will fail
			if resp.StatusCode == http.StatusOK {
				t.Errorf("Server accepted non-JSON content type: %s", tc.contentType)
			}
		})
	}
}

// ============================================================
// TEST 19: Information Disclosure via Error Messages
// ============================================================

func TestInfoDisclosure_LoginErrorMessages(t *testing.T) {
	// Test that login errors don't reveal whether the email exists
	wrongEmailResp, _ := http.Post(
		BaseURL+"/api/auth/login",
		"application/json",
		strings.NewReader(`{"email":"definitely_not_real@fake.com","password":"Wrong123!"}`),
	)
	wrongPassResp, _ := http.Post(
		BaseURL+"/api/auth/login",
		"application/json",
		strings.NewReader(`{"email":"admin@matrix.com","password":"WrongPassword123!"}`),
	)

	if wrongEmailResp != nil && wrongPassResp != nil {
		defer wrongEmailResp.Body.Close()
		defer wrongPassResp.Body.Close()

		body1, _ := io.ReadAll(wrongEmailResp.Body)
		body2, _ := io.ReadAll(wrongPassResp.Body)

		// Both should give the same generic error to prevent email enumeration
		if string(body1) != string(body2) {
			t.Logf("Different error for wrong email vs wrong password:")
			t.Logf("  Wrong email: %s", strings.TrimSpace(string(body1)))
			t.Logf("  Wrong pass:  %s", strings.TrimSpace(string(body2)))
			// This is a finding but not necessarily critical
			t.Log("NOTE: Consider using identical error messages to prevent user enumeration")
		}
	}
}

// ============================================================
// HELPERS
// ============================================================

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Ensure unused imports don't cause compile errors
var _ = bytes.NewBuffer
var _ = time.Now
var _ = sync.WaitGroup{}
