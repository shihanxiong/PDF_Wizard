package services

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"pdf_wizard/models"
)

func TestMergePDFs_CancelledContext(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	pdf1 := filepath.Join(testDir, "test1.pdf")
	pdf2 := filepath.Join(testDir, "test2.pdf")
	if err := createTestPDF(pdf1); err != nil {
		t.Fatalf("create test PDF: %v", err)
	}
	if err := createTestPDF(pdf2); err != nil {
		t.Fatalf("create test PDF: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := service.MergePDFs([]string{pdf1, pdf2}, testDir, "out", WithContext(ctx))
	if err == nil {
		t.Fatal("expected cancellation error")
	}
	if !strings.Contains(err.Error(), "cancelled") {
		t.Fatalf("expected 'cancelled' in error, got: %v", err)
	}

	outputPath := filepath.Join(testDir, "out.pdf")
	if _, statErr := os.Stat(outputPath); statErr == nil {
		t.Fatal("output file should not exist after cancellation")
	}
}

func TestSplitPDF_CancelledContext(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 5); err != nil {
		t.Fatalf("create multi-page PDF: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	splits := []models.SplitDefinition{
		{StartPage: 1, EndPage: 2, Filename: "split1"},
		{StartPage: 3, EndPage: 5, Filename: "split2"},
	}

	err := service.SplitPDF(inputPDF, splits, testDir, WithContext(ctx))
	if err == nil {
		t.Fatal("expected cancellation error")
	}
	if !strings.Contains(err.Error(), "cancelled") {
		t.Fatalf("expected 'cancelled' in error, got: %v", err)
	}
}

func TestRotatePDF_CancelledContext(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 5); err != nil {
		t.Fatalf("create multi-page PDF: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	rotations := []models.RotateDefinition{
		{StartPage: 1, EndPage: 2, Rotation: 90},
		{StartPage: 3, EndPage: 5, Rotation: 180},
	}

	err := service.RotatePDF(inputPDF, rotations, testDir, "rotated", WithContext(ctx))
	if err == nil {
		t.Fatal("expected cancellation error")
	}
	if !strings.Contains(err.Error(), "cancelled") {
		t.Fatalf("expected 'cancelled' in error, got: %v", err)
	}
}

func TestImagesToPDF_CancelledContext(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	img1 := filepath.Join(testDir, "img1.png")
	img2 := filepath.Join(testDir, "img2.png")
	writeTestPNG(t, img1)
	writeTestPNG(t, img2)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := service.ImagesToPDF([]string{img1, img2}, testDir, "out", WithContext(ctx))
	if err == nil {
		t.Fatal("expected cancellation error")
	}
	if !strings.Contains(err.Error(), "cancelled") {
		t.Fatalf("expected 'cancelled' in error, got: %v", err)
	}
}

func TestLockPDF_CancelledContext(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	input := filepath.Join(testDir, "plain.pdf")
	if err := createTestPDF(input); err != nil {
		t.Fatalf("create test PDF: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := service.LockPDF(input, "password", testDir, "locked", WithContext(ctx))
	if err == nil {
		t.Fatal("expected cancellation error")
	}
	if !strings.Contains(err.Error(), "cancelled") {
		t.Fatalf("expected 'cancelled' in error, got: %v", err)
	}
}

func TestUnlockPDF_CancelledContext(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	input := filepath.Join(testDir, "plain.pdf")
	if err := createTestPDF(input); err != nil {
		t.Fatalf("create test PDF: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := service.UnlockPDF(input, "password", testDir, "unlocked", WithContext(ctx))
	if err == nil {
		t.Fatal("expected cancellation error")
	}
	if !strings.Contains(err.Error(), "cancelled") {
		t.Fatalf("expected 'cancelled' in error, got: %v", err)
	}
}

func TestMergePDFs_ProgressCallback(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	pdf1 := filepath.Join(testDir, "test1.pdf")
	pdf2 := filepath.Join(testDir, "test2.pdf")
	if err := createTestPDF(pdf1); err != nil {
		t.Fatalf("create test PDF: %v", err)
	}
	if err := createTestPDF(pdf2); err != nil {
		t.Fatalf("create test PDF: %v", err)
	}

	var called bool
	var gotOp string
	var gotCur, gotTotal int

	err := service.MergePDFs([]string{pdf1, pdf2}, testDir, "merged",
		WithProgress(func(op string, cur, total int) {
			called = true
			gotOp = op
			gotCur = cur
			gotTotal = total
		}),
	)
	if err != nil {
		t.Fatalf("MergePDFs failed: %v", err)
	}
	if !called {
		t.Fatal("progress callback was not called")
	}
	if gotOp != "merge" {
		t.Fatalf("expected operation 'merge', got %q", gotOp)
	}
	if gotCur != 2 || gotTotal != 2 {
		t.Fatalf("expected progress 2/2, got %d/%d", gotCur, gotTotal)
	}
}

func TestSplitPDF_ProgressCallback(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 5); err != nil {
		t.Fatalf("create multi-page PDF: %v", err)
	}

	splits := []models.SplitDefinition{
		{StartPage: 1, EndPage: 2, Filename: "split1"},
		{StartPage: 3, EndPage: 5, Filename: "split2"},
	}

	var calls []int
	err := service.SplitPDF(inputPDF, splits, testDir,
		WithProgress(func(op string, cur, total int) {
			if op != "split" {
				t.Errorf("expected operation 'split', got %q", op)
			}
			calls = append(calls, cur)
			if total != 2 {
				t.Errorf("expected total 2, got %d", total)
			}
		}),
	)
	if err != nil {
		t.Fatalf("SplitPDF failed: %v", err)
	}
	if len(calls) != 2 {
		t.Fatalf("expected 2 progress calls, got %d", len(calls))
	}
	if calls[0] != 1 || calls[1] != 2 {
		t.Fatalf("expected progress [1,2], got %v", calls)
	}
}

func TestMergePDFs_NoOpts_BackwardCompatible(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	pdf1 := filepath.Join(testDir, "test1.pdf")
	if err := createTestPDF(pdf1); err != nil {
		t.Fatalf("create test PDF: %v", err)
	}

	err := service.MergePDFs([]string{pdf1}, testDir, "out")
	if err != nil {
		t.Fatalf("MergePDFs without options failed: %v", err)
	}

	outputPath := filepath.Join(testDir, "out.pdf")
	if _, statErr := os.Stat(outputPath); statErr != nil {
		t.Fatalf("output file was not created: %v", statErr)
	}
}
