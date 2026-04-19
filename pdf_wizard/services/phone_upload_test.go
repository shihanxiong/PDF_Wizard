package services

import (
	"bytes"
	"mime/multipart"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
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
	h := newPhoneUploadHandler(token, dir, func(paths []string) { got = paths })

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
	req.Header.Set("Content-Type", w.FormDataContentType())
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rr.Code, rr.Body.String())
	}
	if len(got) != 1 {
		t.Fatalf("expected 1 saved path, got %d", len(got))
	}
	if _, err := os.Stat(got[0]); err != nil {
		t.Fatal(err)
	}
}

func TestPhoneUploadHandler_wrongToken(t *testing.T) {
	h := newPhoneUploadHandler("aaa", t.TempDir(), func([]string) {})
	req := httptest.NewRequest(http.MethodGet, "/u/bbb/", nil)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("got %d", rr.Code)
	}
}

func TestSanitizeImageExt(t *testing.T) {
	if !IsImageFile("x.heic") {
		t.Fatal("heic should be image")
	}
}
