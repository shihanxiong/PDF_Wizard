package services

import (
	"bytes"
	"context"
	"fmt"
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

// createOpaqueCoverPagePDF writes a single-page PDF that fills the media box with an
// opaque white rectangle before painting body text "(OpaqueBody)". A watermark drawn
// under this content (pdfcpu onTop=false) is fully covered and invisible; stamp mode
// (onTop=true) must paint the watermark after this stream so tests can assert order.
func createOpaqueCoverPagePDF(path string) error {
	// Stream body: no trailing newline after ET; Length counts bytes inside the stream
	// (same convention as createTestPDF).
	streamInner := "1 1 1 rg\n0 0 612 792 re\nf\nBT\n/F1 12 Tf\n100 400 Td\n(OpaqueBody) Tj\nET"
	head := "%PDF-1.4\n"
	obj1 := "1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
	obj2 := "2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n"
	obj3 := "3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Resources <<\n/Font <<\n/F1 4 0 R\n>>\n>>\n/Contents 5 0 R\n>>\nendobj\n"
	obj4 := "4 0 obj\n<<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\nendobj\n"
	obj5 := fmt.Sprintf("5 0 obj\n<<\n/Length %d\n>>\nstream\n%s\nendstream\nendobj\n", len(streamInner), streamInner)

	var buf bytes.Buffer
	buf.WriteString(head)
	offsets := make([]int64, 6)
	offsets[1] = int64(buf.Len())
	buf.WriteString(obj1)
	offsets[2] = int64(buf.Len())
	buf.WriteString(obj2)
	offsets[3] = int64(buf.Len())
	buf.WriteString(obj3)
	offsets[4] = int64(buf.Len())
	buf.WriteString(obj4)
	offsets[5] = int64(buf.Len())
	buf.WriteString(obj5)

	xrefStart := buf.Len()
	buf.WriteString("xref\n0 6\n0000000000 65535 f \n")
	for i := 1; i <= 5; i++ {
		fmt.Fprintf(&buf, "%010d 00000 n \n", offsets[i])
	}
	// fmt: %%%% -> literal %% in output (required PDF end-of-file marker).
	fmt.Fprintf(&buf, "trailer\n<<\n/Size 6\n/Root 1 0 R\n>>\nstartxref\n%d\n%%%%EOF\n", xrefStart)

	return os.WriteFile(path, buf.Bytes(), 0644)
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

func TestFileService_GetFileMetadata_NonExistentFile(t *testing.T) {
	service := NewFileService(context.Background())

	_, err := service.GetFileMetadata("/nonexistent/file.pdf")
	if err == nil {
		t.Error("Expected error for non-existent file, got nil")
	}
}

func TestFileService_GetFileMetadata_NonPDFFile(t *testing.T) {
	service := NewFileService(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a text file
	testFile := filepath.Join(testDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("not a PDF"), 0644); err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	metadata, err := service.GetFileMetadata(testFile)
	if err != nil {
		t.Fatalf("GetFileMetadata failed: %v", err)
	}

	if metadata.IsPDF {
		t.Errorf("Expected IsPDF to be false for .txt file, got true")
	}
}

func TestFileService_GetPDFPageCount_NonExistentFile(t *testing.T) {
	service := NewFileService(context.Background())

	_, err := service.GetPDFPageCount("/nonexistent/file.pdf")
	if err == nil {
		t.Error("Expected error for non-existent file, got nil")
	}
}

func TestFileService_GetPDFPageCount_NonPDFFile(t *testing.T) {
	service := NewFileService(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a text file
	testFile := filepath.Join(testDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("not a PDF"), 0644); err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	_, err := service.GetPDFPageCount(testFile)
	if err == nil {
		t.Error("Expected error for non-PDF file, got nil")
	}
}

func TestFileService_GetPDFMetadata_NonExistentFile(t *testing.T) {
	service := NewFileService(context.Background())

	_, err := service.GetPDFMetadata("/nonexistent/file.pdf")
	if err == nil {
		t.Error("Expected error for non-existent file, got nil")
	}
}

func TestFileService_GetPDFMetadata_NonPDFFile(t *testing.T) {
	service := NewFileService(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a text file
	testFile := filepath.Join(testDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("not a PDF"), 0644); err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	_, err := service.GetPDFMetadata(testFile)
	if err == nil {
		t.Error("Expected error for non-PDF file, got nil")
	}
}
