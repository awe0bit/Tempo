package main

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	qrcode "github.com/skip2/go-qrcode"
)

func pairingPayload(server, code string) (string, error) {
	u, err := url.Parse(server)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || (u.Path != "" && u.Path != "/") {
		return "", errors.New("--server must be an HTTPS base URL without credentials, path, query or fragment")
	}
	if port := u.Port(); port != "" {
		value, err := strconv.Atoi(port)
		if err != nil || value < 1 || value > 65535 {
			return "", errors.New("invalid server port")
		}
	}
	decoded, err := hex.DecodeString(code)
	if err != nil || len(decoded) != 32 {
		return "", errors.New("invalid server pairing response")
	}
	u.Path = ""
	payload, err := json.Marshal(struct {
		Type    string `json:"type"`
		Version int    `json:"v"`
		Server  string `json:"server"`
		Code    string `json:"code"`
	}{"tempo-sync-pair", 1, u.String(), code})
	return string(payload), err
}

func runPair(arguments []string, output io.Writer) error {
	flags := flag.NewFlagSet("pair", flag.ContinueOnError)
	flags.SetOutput(io.Discard)
	server := flags.String("server", "", "public HTTPS sync-server base URL")
	if err := flags.Parse(arguments); err != nil {
		return errors.New("usage: /tempo-sync pair --server https://your-sync-domain")
	}
	if flags.NArg() != 0 {
		return errors.New("unexpected arguments; use --server with the public HTTPS address")
	}
	if _, err := pairingPayload(*server, strings.Repeat("0", 64)); err != nil {
		return err
	}
	token := strings.TrimSpace(os.Getenv("SYNC_TOKEN"))
	if token == "" {
		return errors.New("run pair inside the sync container with its existing SYNC_TOKEN environment")
	}
	// Never send the administrator credential to the QR's public URL.
	endpoint, err := url.Parse(envOrDefault("SYNC_HEALTH_URL", "http://127.0.0.1:8080/health"))
	if err != nil || endpoint.Scheme != "http" || endpoint.User != nil || endpoint.RawQuery != "" || endpoint.Fragment != "" || net.ParseIP(endpoint.Hostname()) == nil || !net.ParseIP(endpoint.Hostname()).IsLoopback() {
		return errors.New("SYNC_HEALTH_URL must use the local loopback listener for pairing")
	}
	endpoint.Path = "/v1/pairing/create"
	request, err := http.NewRequest(http.MethodPost, endpoint.String(), nil)
	if err != nil {
		return errors.New("invalid local pairing endpoint")
	}
	request.Header.Set("Authorization", "Bearer "+token)
	client := &http.Client{Timeout: 8 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	response, err := client.Do(request)
	if err != nil {
		return errors.New("cannot reach the running local sync service; start it before generating a code")
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusCreated {
		return fmt.Errorf("local pairing service returned HTTP %d; update the server and check its token", response.StatusCode)
	}
	var invitation struct {
		Code      string    `json:"code"`
		ExpiresAt time.Time `json:"expiresAt"`
	}
	if err := json.NewDecoder(io.LimitReader(response.Body, 2048)).Decode(&invitation); err != nil {
		return errors.New("invalid local pairing response")
	}
	if !invitation.ExpiresAt.After(time.Now()) {
		return errors.New("pairing invitation already expired; check the server clock")
	}
	payload, err := pairingPayload(*server, invitation.Code)
	if err != nil {
		return err
	}
	qr, err := qrcode.New(payload, qrcode.Medium)
	if err != nil {
		return errors.New("could not encode pairing QR code")
	}
	fmt.Fprintf(output, "Tempo — 扫码配对 / Scan to pair\n服务器 / Server: %s\n有效期至 / Expires: %s\n", *server, invitation.ExpiresAt.Local().Format(time.RFC3339))
	fmt.Fprint(output, "\x1b[30;47m"+qr.ToSmallString(true)+"\x1b[0m\n")
	fmt.Fprintln(output, "5 分钟内有效，仅可使用一次；生成新码会让旧码失效。\nValid for 5 minutes, one use only. Generating a new code revokes the previous one.")
	return nil
}
