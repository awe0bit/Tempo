package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/FelixZoe/TEMPO/services/sync/internal/store"
)

func pairingServer(t *testing.T) *Server {
	t.Helper()
	data, err := store.Open(filepath.Join(t.TempDir(), "store.json"))
	if err != nil {
		t.Fatal(err)
	}
	s, err := New(Config{Token: testToken, MaxBodyBytes: 2048}, data)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func createCode(t *testing.T, s *Server) string {
	t.Helper()
	r := httptest.NewRequest(http.MethodPost, "/v1/pairing/create", nil)
	r.RemoteAddr = "127.0.0.1:8000"
	r.Header.Set("Authorization", "Bearer "+testToken)
	w := httptest.NewRecorder()
	s.Handler().ServeHTTP(w, r)
	if w.Code != http.StatusCreated {
		t.Fatalf("create status=%d", w.Code)
	}
	if strings.Contains(w.Body.String(), testToken) {
		t.Fatal("invitation exposed sync credential")
	}
	var result struct {
		Code      string    `json:"code"`
		ExpiresAt time.Time `json:"expiresAt"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatal(err)
	}
	if len(result.Code) != 64 || result.ExpiresAt.IsZero() {
		t.Fatal("invalid invitation")
	}
	return result.Code
}

func redeemCode(s *Server, code string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(http.MethodPost, "/v1/pairing/redeem", strings.NewReader(`{"code":"`+code+`"}`))
	w := httptest.NewRecorder()
	s.Handler().ServeHTTP(w, r)
	return w
}

func TestPairingCreationRequiresLocalAuthenticatedTerminal(t *testing.T) {
	s := pairingServer(t)
	for _, tc := range []struct {
		address, token, forwarded string
		status                    int
	}{
		{"127.0.0.1:80", "", "", http.StatusUnauthorized},
		{"192.0.2.1:80", testToken, "", http.StatusForbidden},
		{"127.0.0.1:80", testToken, "192.0.2.1", http.StatusForbidden},
		{"127.0.0.1:80", testToken, "", http.StatusCreated},
		{"[::1]:80", testToken, "", http.StatusCreated},
	} {
		r := httptest.NewRequest(http.MethodPost, "/v1/pairing/create", nil)
		r.RemoteAddr = tc.address
		if tc.token != "" {
			r.Header.Set("Authorization", "Bearer "+tc.token)
		}
		if tc.forwarded != "" {
			r.Header.Set("X-Forwarded-For", tc.forwarded)
		}
		w := httptest.NewRecorder()
		s.Handler().ServeHTTP(w, r)
		if w.Code != tc.status {
			t.Fatalf("create status=%d want=%d", w.Code, tc.status)
		}
	}
}

func TestPairingIsOneTimeAndDoesNotChangeSyncData(t *testing.T) {
	s := pairingServer(t)
	revision := s.store.Revision()
	code := createCode(t, s)
	w := redeemCode(s, code)
	if w.Code != http.StatusOK {
		t.Fatalf("redeem status=%d", w.Code)
	}
	var result struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil || result.Token != testToken {
		t.Fatal("invalid redeemed credential")
	}
	if w.Header().Get("Cache-Control") != "no-store" {
		t.Fatal("credential response must not be cached")
	}
	if redeemCode(s, code).Code != http.StatusUnauthorized {
		t.Fatal("replayed invitation accepted")
	}
	if s.store.Revision() != revision {
		t.Fatal("pairing mutated sync documents")
	}
}

func TestPairingExpiresAndGeneratingAnotherRevokesPrevious(t *testing.T) {
	s := pairingServer(t)
	now := time.Now()
	s.pairing.now = func() time.Time { return now }
	first := createCode(t, s)
	second := createCode(t, s)
	if redeemCode(s, first).Code != http.StatusUnauthorized {
		t.Fatal("old invitation remained valid")
	}
	now = now.Add(pairingLifetime)
	if redeemCode(s, second).Code != http.StatusUnauthorized {
		t.Fatal("expired invitation accepted")
	}
}

func TestPairingConcurrentRedemptionOnlyOneSucceeds(t *testing.T) {
	s := pairingServer(t)
	code := createCode(t, s)
	var successes atomic.Int32
	var group sync.WaitGroup
	for i := 0; i < 24; i++ {
		group.Add(1)
		go func() {
			defer group.Done()
			if redeemCode(s, code).Code == http.StatusOK {
				successes.Add(1)
			}
		}()
	}
	group.Wait()
	if successes.Load() != 1 {
		t.Fatalf("successful redemptions=%d", successes.Load())
	}
}

func TestPairingRejectsMalformedAndOversizedRequests(t *testing.T) {
	s := pairingServer(t)
	for _, body := range []string{`{}`, `{"code":"short"}`, `{"code":"","extra":1}`, `{} {}`, strings.Repeat("x", 2048)} {
		r := httptest.NewRequest(http.MethodPost, "/v1/pairing/redeem", strings.NewReader(body))
		w := httptest.NewRecorder()
		s.Handler().ServeHTTP(w, r)
		if w.Code == http.StatusOK {
			t.Fatal("invalid pairing payload accepted")
		}
		if strings.Contains(w.Body.String(), testToken) {
			t.Fatal("error exposed sync credential")
		}
	}
	for _, endpoint := range []string{"create", "redeem"} {
		w := httptest.NewRecorder()
		s.Handler().ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/pairing/"+endpoint, nil))
		if w.Code != http.StatusMethodNotAllowed {
			t.Fatal("pairing must use POST")
		}
	}
}
