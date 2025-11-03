package services

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

func TestFileService_GetFileMetadata(t *testing.T) {
	service := NewFileService(context.Background())

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
	metadata, err := service.GetFileMetadata(testPDF)
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
	if metadata.TotalPages != 0 {
		t.Errorf("Expected TotalPages to be 0 for GetFileMetadata, got %d", metadata.TotalPages)
	}
}

func TestFileService_GetPDFPageCount(t *testing.T) {
	service := NewFileService(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a test PDF file
	testPDF := filepath.Join(testDir, "test.pdf")
	if err := createTestPDF(testPDF); err != nil {
		t.Fatalf("Failed to create test PDF: %v", err)
	}

	// Test GetPDFPageCount
	pageCount, err := service.GetPDFPageCount(testPDF)
	if err != nil {
		t.Fatalf("GetPDFPageCount failed: %v", err)
	}

	// The minimal test PDF has 1 page
	if pageCount != 1 {
		t.Errorf("Expected page count 1, got %d", pageCount)
	}
}

func TestFileService_GetPDFMetadata(t *testing.T) {
	service := NewFileService(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a test PDF file
	testPDF := filepath.Join(testDir, "test.pdf")
	if err := createTestPDF(testPDF); err != nil {
		t.Fatalf("Failed to create test PDF: %v", err)
	}

	// Wait a bit to ensure file system has updated timestamps
	time.Sleep(100 * time.Millisecond)

	// Test GetPDFMetadata
	metadata, err := service.GetPDFMetadata(testPDF)
	if err != nil {
		t.Fatalf("GetPDFMetadata failed: %v", err)
	}

	// Verify metadata
	if metadata.Path != testPDF {
		t.Errorf("Expected path %s, got %s", testPDF, metadata.Path)
	}
	if metadata.Name != "test.pdf" {
		t.Errorf("Expected name 'test.pdf', got '%s'", metadata.Name)
	}
	if !metadata.IsPDF {
		t.Errorf("Expected IsPDF to be true, got false")
	}
	if metadata.TotalPages != 1 {
		t.Errorf("Expected TotalPages to be 1, got %d", metadata.TotalPages)
	}
}
