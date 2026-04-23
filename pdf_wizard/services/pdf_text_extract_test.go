package services

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/ledongthuc/pdf"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// createExtractFriendlyPDF writes a single-page PDF that both pdfcpu and ledongthuc/pdf can open
// (hand-written xref PDFs used elsewhere are not reliably readable by ledongthuc).
func createExtractFriendlyPDF(t *testing.T, path string) {
	t.Helper()
	dir := filepath.Dir(path)
	pre := filepath.Join(dir, filepath.Base(path)+".premerge.pdf")
	if err := createTestPDF(pre); err != nil {
		t.Fatalf("create premerge pdf: %v", err)
	}
	t.Cleanup(func() { _ = os.Remove(pre) })
	cfg := model.NewDefaultConfiguration()
	if err := api.MergeCreateFile([]string{pre}, path, false, cfg); err != nil {
		t.Fatalf("merge to extract-friendly pdf: %v", err)
	}
}

func TestPDFService_ExtractPDFText(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	pdfPath := filepath.Join(testDir, "hello.pdf")
	createExtractFriendlyPDF(t, pdfPath)

	out, err := service.ExtractPDFText(pdfPath, "")
	if err != nil {
		t.Fatalf("ExtractPDFText: %v", err)
	}
	if !strings.Contains(out, "Test PDF") {
		t.Fatalf("expected 'Test PDF' in output, got: %q", out)
	}
}

func TestPDFService_ExtractPDFText_invalidPath(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	_, err := service.ExtractPDFText("", "")
	if err == nil {
		t.Fatal("expected error for empty path")
	}
}

func TestPDFService_ExtractPDFText_wrongPassword(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	plain := filepath.Join(testDir, "plain.pdf")
	locked := filepath.Join(testDir, "locked.pdf")
	createExtractFriendlyPDF(t, plain)
	if err := service.LockPDF(plain, "secret123", testDir, "locked"); err != nil {
		t.Fatalf("LockPDF: %v", err)
	}

	_, err := service.ExtractPDFText(locked, "wrong")
	if err == nil {
		t.Fatal("expected error for wrong password")
	}
	msg := strings.ToLower(err.Error())
	if !strings.Contains(msg, "password") && !strings.Contains(msg, "decrypt") {
		t.Fatalf("expected password/decrypt-related error, got: %v", err)
	}
}

func TestPDFService_ExtractPDFText_encryptedOK(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	plain := filepath.Join(testDir, "plain2.pdf")
	locked := filepath.Join(testDir, "locked2.pdf")
	createExtractFriendlyPDF(t, plain)
	if err := service.LockPDF(plain, "secret123", testDir, "locked2"); err != nil {
		t.Fatalf("LockPDF: %v", err)
	}

	out, err := service.ExtractPDFText(locked, "secret123")
	if err != nil {
		t.Fatalf("ExtractPDFText: %v", err)
	}
	if !strings.Contains(out, "Test PDF") {
		t.Fatalf("expected 'Test PDF' in output, got: %q", out)
	}
}

func TestExtractPageTextPreferRows_fallbackStillReadsText(t *testing.T) {
	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)
	pdfPath := filepath.Join(testDir, "row.pdf")
	createExtractFriendlyPDF(t, pdfPath)

	f, err := os.Open(pdfPath)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	fi, err := f.Stat()
	if err != nil {
		t.Fatal(err)
	}
	r, err := pdf.NewReader(f, fi.Size())
	if err != nil {
		t.Fatal(err)
	}
	p := r.Page(1)
	s, err := extractPageTextPreferRows(p)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(s, "Test PDF") {
		t.Fatalf("expected text, got %q", s)
	}
}

func TestWriteDecryptedPDFTempCopy_rejectsPlainFile(t *testing.T) {
	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)
	p := filepath.Join(testDir, "plain3.pdf")
	createExtractFriendlyPDF(t, p)
	_, err := writeDecryptedPDFTempCopy(p, "")
	if err == nil {
		t.Fatal("expected error decrypting non-encrypted file")
	}
	if !strings.Contains(strings.ToLower(err.Error()), "not encrypted") {
		t.Fatalf("expected not encrypted, got: %v", err)
	}
}
