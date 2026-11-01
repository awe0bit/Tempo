package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestInvitationPayloadUsesVersionedOneTimeCode(t *testing.T) {
	code := strings.Repeat("a", 64)
	text, err := pairingPayload("https://sync.example.com/", code)
	if err != nil {
		t.Fatal(err)
	}
	var payload struct {
		Type    string `json:"type"`
		Version int    `json:"v"`
		Server  string `json:"server"`
		Code    string `json:"code"`
	}
	if err := json.Unmarshal([]byte(text), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Type != "tempo-sync-pair" || payload.Version != 1 || payload.Server != "https://sync.example.com" || payload.Code != code {
		t.Fatal("invalid pairing payload")
	}
	for _, invalid := range []string{"http://sync.example.com", "https://user:password@sync.example.com", "https://sync.example.com/extra", "https://sync.example.com?token=secret", "https://sync.example.com#secret", ""} {
		if _, err := pairingPayload(invalid, code); err == nil {
			t.Fatalf("accepted unsafe server URL %q", invalid)
		}
	}
}

func TestPairCommandUsesLocalCredentialButDoesNotPrintIt(t *testing.T) {
	token := strings.Repeat("b", 64)
	t.Setenv("SYNC_TOKEN", token)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/pairing/create" || r.Method != http.MethodPost || r.Header.Get("Authorization") != "Bearer "+token {
			t.Error("unexpected pairing request")
		}
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]any{"code": strings.Repeat("c", 64), "expiresAt": time.Now().Add(time.Minute)})
	}))
	defer server.Close()
	t.Setenv("SYNC_HEALTH_URL", server.URL+"/health")
	var output bytes.Buffer
	if err := runPair([]string{"--server", "https://sync.example.com"}, &output); err != nil {
		t.Fatal(err)
	}
	if strings.Contains(output.String(), token) || !strings.Contains(output.String(), "sync.example.com") || !strings.Contains(output.String(), "█") {
		t.Fatal("missing QR or leaked administrator token")
	}
}

func TestPairCommandRejectsRemoteAdminEndpointAndRedirects(t *testing.T) {
	t.Setenv("SYNC_TOKEN", strings.Repeat("b", 64))
	t.Setenv("SYNC_HEALTH_URL", "http://remote.example.com/health")
	if err := runPair([]string{"--server", "https://sync.example.com"}, &bytes.Buffer{}); err == nil {
		t.Fatal("administrator credential could be sent remotely")
	}
	redirect := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "https://remote.example.com", http.StatusTemporaryRedirect)
	}))
	defer redirect.Close()
	t.Setenv("SYNC_HEALTH_URL", redirect.URL+"/health")
	if err := runPair([]string{"--server", "https://sync.example.com"}, &bytes.Buffer{}); err == nil {
		t.Fatal("pair command followed an administrator credential redirect")
	}
}
