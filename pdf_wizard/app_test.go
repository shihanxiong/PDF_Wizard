package main

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// createTestPDF creates a minimal valid PDF file for testing
func createTestPDF(path string) error {
	// Create a minimal valid PDF content
	pdfContent := `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000299 00000 n 
0000000417 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
520
%%EOF`

	return os.WriteFile(path, []byte(pdfContent), 0644)
}

// setupTestDir creates a temporary directory for tests
func setupTestDir(t *testing.T) string {
	dir, err := os.MkdirTemp("", "pdf_wizard_test_*")
	if err != nil {
		t.Fatalf("Failed to create temp dir: %v", err)
	}
	return dir
}

// cleanupTestDir removes the temporary directory
func cleanupTestDir(t *testing.T, dir string) {
	if err := os.RemoveAll(dir); err != nil {
		t.Errorf("Failed to cleanup temp dir: %v", err)
	}
}

func TestGetFileMetadata(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a test PDF file
	testPDF := filepath.Join(testDir, "test.pdf")
	if err := createTestPDF(testPDF); err != nil {
		t.Fatalf("Failed to create test PDF: %v", err)
	}

	// Wait a bit to ensure file system has updated timestamps
	time.Sleep(100 * time.Millisecond)

	// Test GetFileMetadata
	metadata, err := app.GetFileMetadata(testPDF)
	if err != nil {
		t.Fatalf("GetFileMetadata failed: %v", err)
	}

	// Verify metadata
	if metadata.Path != testPDF {
		t.Errorf("Expected path %s, got %s", testPDF, metadata.Path)
	}
	if metadata.Name != "test.pdf" {
		t.Errorf("Expected name 'test.pdf', got '%s'", metadata.Name)
	}
	if metadata.Size == 0 {
		t.Errorf("Expected non-zero size, got %d", metadata.Size)
	}
	if metadata.LastModified == "" {
		t.Errorf("Expected LastModified to be set, got empty string")
	}
	if !metadata.IsPDF {
		t.Errorf("Expected IsPDF to be true, got false")
	}
}

func TestGetFileMetadata_NonExistentFile(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	_, err := app.GetFileMetadata("/nonexistent/file.pdf")
	if err == nil {
		t.Error("Expected error for non-existent file, got nil")
	}
}

func TestGetFileMetadata_NonPDFFile(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a text file
	testFile := filepath.Join(testDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("not a PDF"), 0644); err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	metadata, err := app.GetFileMetadata(testFile)
	if err != nil {
		t.Fatalf("GetFileMetadata failed: %v", err)
	}

	if metadata.IsPDF {
		t.Errorf("Expected IsPDF to be false for .txt file, got true")
	}
}

func TestMergePDFs(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create test PDF files
	pdf1 := filepath.Join(testDir, "test1.pdf")
	pdf2 := filepath.Join(testDir, "test2.pdf")
	pdf3 := filepath.Join(testDir, "test3.pdf")

	if err := createTestPDF(pdf1); err != nil {
		t.Fatalf("Failed to create test PDF 1: %v", err)
	}
	if err := createTestPDF(pdf2); err != nil {
		t.Fatalf("Failed to create test PDF 2: %v", err)
	}
	if err := createTestPDF(pdf3); err != nil {
		t.Fatalf("Failed to create test PDF 3: %v", err)
	}

	outputDir := testDir
	outputFilename := "merged"

	// Test MergePDFs
	err := app.MergePDFs([]string{pdf1, pdf2, pdf3}, outputDir, outputFilename)
	if err != nil {
		t.Fatalf("MergePDFs failed: %v", err)
	}

	// Verify output file was created
	outputPath := filepath.Join(outputDir, outputFilename+".pdf")
	info, err := os.Stat(outputPath)
	if err != nil {
		t.Fatalf("Output file was not created: %v", err)
	}

	if info.Size() == 0 {
		t.Error("Output file is empty")
	}

	// Verify it's a valid PDF by checking for PDF header
	content, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatalf("Failed to read output file: %v", err)
	}

	if len(content) < 4 || string(content[0:4]) != "%PDF" {
		t.Error("Output file does not appear to be a valid PDF")
	}
}

func TestMergePDFs_EmptyInput(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	err := app.MergePDFs([]string{}, testDir, "output")
	if err == nil {
		t.Error("Expected error for empty input, got nil")
	}
	if err.Error() != "no input files provided" {
		t.Errorf("Expected 'no input files provided', got: %v", err)
	}
}

func TestMergePDFs_NonExistentFile(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	err := app.MergePDFs([]string{"/nonexistent/file.pdf"}, testDir, "output")
	if err == nil {
		t.Error("Expected error for non-existent file, got nil")
	}
}

func TestMergePDFs_NonPDFFile(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a text file
	testFile := filepath.Join(testDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("not a PDF"), 0644); err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	err := app.MergePDFs([]string{testFile}, testDir, "output")
	if err == nil {
		t.Error("Expected error for non-PDF file, got nil")
	}
}

func TestMergePDFs_NonExistentOutputDir(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a test PDF
	testPDF := filepath.Join(testDir, "test.pdf")
	if err := createTestPDF(testPDF); err != nil {
		t.Fatalf("Failed to create test PDF: %v", err)
	}

	nonExistentDir := filepath.Join(testDir, "nonexistent")
	err := app.MergePDFs([]string{testPDF}, nonExistentDir, "output")
	if err == nil {
		t.Error("Expected error for non-existent output directory, got nil")
	}
}

func TestMergePDFs_OverwriteExisting(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create test PDF files
	pdf1 := filepath.Join(testDir, "test1.pdf")
	pdf2 := filepath.Join(testDir, "test2.pdf")

	if err := createTestPDF(pdf1); err != nil {
		t.Fatalf("Failed to create test PDF 1: %v", err)
	}
	if err := createTestPDF(pdf2); err != nil {
		t.Fatalf("Failed to create test PDF 2: %v", err)
	}

	outputPath := filepath.Join(testDir, "merged.pdf")

	// Create an existing output file
	if err := os.WriteFile(outputPath, []byte("old content"), 0644); err != nil {
		t.Fatalf("Failed to create existing output file: %v", err)
	}

	// Test that merge overwrites the existing file
	err := app.MergePDFs([]string{pdf1, pdf2}, testDir, "merged")
	if err != nil {
		t.Fatalf("MergePDFs failed: %v", err)
	}

	// Verify the file was overwritten with a valid PDF
	content, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatalf("Failed to read output file: %v", err)
	}

	if string(content) == "old content" {
		t.Error("Output file was not overwritten")
	}

	if len(content) < 4 || string(content[0:4]) != "%PDF" {
		t.Error("Output file does not appear to be a valid PDF after overwrite")
	}
}
