package services

import (
	"bytes"
	"mime/multipart"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"

	"pdf_wizard/models"
)

func TestPrimaryLANIPv4(t *testing.T) {
	ip, err := PrimaryLANIPv4()
	if err != nil {
		t.Skip("no IPv4 in test environment:", err)
	}
	if net.ParseIP(ip) == nil {
		t.Fatalf("invalid ip: %q", ip)
	}
}

func TestPhoneUploadHandler_POST(t *testing.T) {
	dir := t.TempDir()
	var got []string
	var token = "deadbeefdeadbeefdeadbeefdeadbeef"
	page := normalizePhoneCopy(models.PhoneUploadPageCopy{})
	var sessionDone atomic.Bool
	h := newPhoneUploadHandler(token, dir, func(paths []string) { got = paths }, &page, &sessionDone)

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile("files", "a.png")
	if err != nil {
		t.Fatal(err)
	}
	png1x1 := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
		0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
		0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
		0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
		0x42, 0x60, 0x82,
	}
	if _, err := part.Write(png1x1); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodPost, "/u/"+token+"/", &body)
	req.Host = "192.168.1.1:8765"
	req.Header.Set("Content-Type", w.FormDataContentType())
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusSeeOther {
		t.Fatalf("status %d want %d body %s", rr.Code, http.StatusSeeOther, rr.Body.String())
	}
	loc := rr.Header().Get("Location")
	if loc != "http://192.168.1.1:8765/u/"+token+"/ok" {
		t.Fatalf("Location %q", loc)
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 saved path, got %d", len(got))
	}
	if _, err := os.Stat(got[0]); err != nil {
		t.Fatal(err)
	}
}

func TestPhoneUploadHandler_GET_form_after_upload_shows_session_closed(t *testing.T) {
	dir := t.TempDir()
	token := "deadbeefdeadbeefdeadbeefdeadbeef"
	page := normalizePhoneCopy(models.PhoneUploadPageCopy{})
	var sessionDone atomic.Bool
	h := newPhoneUploadHandler(token, dir, func([]string) {}, &page, &sessionDone)

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	part, err := w.CreateFormFile("files", "a.png")
	if err != nil {
		t.Fatal(err)
	}
	png1x1 := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
		0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
		0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
		0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
		0x42, 0x60, 0x82,
	}
	if _, err := part.Write(png1x1); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	postReq := httptest.NewRequest(http.MethodPost, "/u/"+token+"/", &body)
	postReq.Header.Set("Content-Type", w.FormDataContentType())
	postRR := httptest.NewRecorder()
	h.ServeHTTP(postRR, postReq)
	if postRR.Code != http.StatusSeeOther {
		t.Fatalf("POST status %d", postRR.Code)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/u/"+token+"/", nil)
	getRR := httptest.NewRecorder()
	h.ServeHTTP(getRR, getReq)
	if getRR.Code != http.StatusOK {
		t.Fatalf("GET status %d", getRR.Code)
	}
	if !bytes.Contains(getRR.Body.Bytes(), []byte("This session has ended")) {
		t.Fatalf("expected session closed page")
	}
}

func TestPhoneUploadHandler_wrongToken(t *testing.T) {
	page := normalizePhoneCopy(models.PhoneUploadPageCopy{})
	var sessionDone atomic.Bool
	h := newPhoneUploadHandler("aaa", t.TempDir(), func([]string) {}, &page, &sessionDone)
	req := httptest.NewRequest(http.MethodGet, "/u/bbb/", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("got %d", rr.Code)
	}
}

func TestPhoneUploadHandler_GET_logoPNG(t *testing.T) {
	token := "deadbeefdeadbeefdeadbeefdeadbeef"
	page := normalizePhoneCopy(models.PhoneUploadPageCopy{})
	var sessionDone atomic.Bool
	h := newPhoneUploadHandler(token, t.TempDir(), func([]string) {}, &page, &sessionDone)
	req := httptest.NewRequest(http.MethodGet, "/u/"+token+"/logo.png", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status %d", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); ct != "image/png" {
		t.Fatalf("Content-Type %q", ct)
	}
	body := rr.Body.Bytes()
	if len(body) < 8 || string(body[:8]) != "\x89PNG\r\n\x1a\n" {
		t.Fatal("response is not PNG")
	}
}

func TestPhoneUploadHandler_GET_ok(t *testing.T) {
	token := "deadbeefdeadbeefdeadbeefdeadbeef"
	page := normalizePhoneCopy(models.PhoneUploadPageCopy{})
	var sessionDone atomic.Bool
	h := newPhoneUploadHandler(token, t.TempDir(), func([]string) {}, &page, &sessionDone)
	req := httptest.NewRequest(http.MethodGet, "/u/"+token+"/ok", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status %d", rr.Code)
	}
	if !bytes.Contains(rr.Body.Bytes(), []byte("Upload complete")) {
		t.Fatalf("expected success body")
	}
}

func TestSanitizeImageExt(t *testing.T) {
	if !IsImageFile("x.heic") {
		t.Fatal("heic should be image")
	}
}

func TestCloneUploadedImagesForApp(t *testing.T) {
	dir := t.TempDir()
	sessionPath := filepath.Join(dir, "a.png")
	png1x1 := []byte{
		0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
		0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
		0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
		0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
		0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
		0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
		0x42, 0x60, 0x82,
	}
	if err := os.WriteFile(sessionPath, png1x1, 0o644); err != nil {
		t.Fatal(err)
	}
	out, err := cloneUploadedImagesForApp([]string{sessionPath})
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 1 {
		t.Fatalf("got %d paths", len(out))
	}
	if _, err := os.Stat(sessionPath); !os.IsNotExist(err) {
		t.Fatal("session file should be removed after clone")
	}
	if _, err := os.Stat(out[0]); err != nil {
		t.Fatal(err)
	}
	_ = os.Remove(out[0])
}
