package httpapi

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"net"
	"net/http"
	"sync"
	"time"
)

const pairingLifetime = 5 * time.Minute

// Only one invitation is live. Generating another code revokes its predecessor.
// Invitations are memory-only; a restart invalidates them without touching data.
type pairingState struct {
	mu      sync.Mutex
	hash    [sha256.Size]byte
	expires time.Time
	token   string
	now     func() time.Time
}

func newPairingState(token string) *pairingState {
	return &pairingState{token: token, now: time.Now}
}

func (s *Server) createPairing(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only POST is allowed")
		return
	}
	if !s.requireAuthorization(w, r) {
		return
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	ip := net.ParseIP(host)
	// This endpoint is for the server CLI, never an app or reverse-proxied client.
	if err != nil || ip == nil || !ip.IsLoopback() || r.Header.Get("Forwarded") != "" || r.Header.Get("X-Forwarded-For") != "" || r.Header.Get("X-Real-IP") != "" {
		writeError(w, http.StatusForbidden, "server_only", "generate pairing codes from the server terminal")
		return
	}
	var code [32]byte
	if _, err := rand.Read(code[:]); err != nil {
		writeError(w, http.StatusInternalServerError, "pairing_unavailable", "could not create pairing invitation")
		return
	}
	p := s.pairing
	p.mu.Lock()
	p.hash = sha256.Sum256(code[:])
	p.expires = p.now().UTC().Add(pairingLifetime)
	expires := p.expires
	p.mu.Unlock()
	writeJSON(w, http.StatusCreated, map[string]string{
		"code": hex.EncodeToString(code[:]), "expiresAt": expires.Format(time.RFC3339),
	})
}

func (s *Server) redeemPairing(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeError(w, http.StatusMethodNotAllowed, "method_not_allowed", "only POST is allowed")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1024)
	defer r.Body.Close()
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var input struct {
		Code string `json:"code"`
	}
	if err := decoder.Decode(&input); err != nil {
		s.writeDecodeError(w, err)
		return
	}
	if err := requireEOF(decoder); err != nil {
		s.writeDecodeError(w, err)
		return
	}
	code, err := hex.DecodeString(input.Code)
	if err != nil || len(code) != 32 {
		writeError(w, http.StatusUnauthorized, "invalid_pairing", "pairing code is invalid or expired")
		return
	}
	hash := sha256.Sum256(code)
	p := s.pairing
	p.mu.Lock()
	valid := p.now().Before(p.expires) && subtle.ConstantTimeCompare(hash[:], p.hash[:]) == 1
	if valid {
		p.expires = time.Time{}
		p.hash = [sha256.Size]byte{}
	}
	p.mu.Unlock()
	if !valid {
		writeError(w, http.StatusUnauthorized, "invalid_pairing", "pairing code is invalid or expired")
		return
	}
	// The long-lived credential is exchanged only after explicit confirmation,
	// over HTTPS; it never appears in the invitation, URL, QR code or logs.
	writeJSON(w, http.StatusOK, map[string]string{"token": p.token})
}
