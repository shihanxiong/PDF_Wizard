package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
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

// createMultiPageTestPDF creates a minimal PDF with specified number of pages
func createMultiPageTestPDF(path string, numPages int) error {
	// Use pdfcpu to create a multi-page PDF by merging single-page PDFs
	testDir := filepath.Dir(path)
	tempFiles := []string{}

	// Create temporary single-page PDFs with unique names
	for i := 0; i < numPages; i++ {
		tempFile := filepath.Join(testDir, fmt.Sprintf("temp_page_%d_%d.pdf", i, time.Now().UnixNano()))
		if err := createTestPDF(tempFile); err != nil {
			// Cleanup on error
			for _, f := range tempFiles {
				os.Remove(f)
			}
			return err
		}
		tempFiles = append(tempFiles, tempFile)
	}

	// Merge them into a multi-page PDF using pdfcpu
	config := model.NewDefaultConfiguration()
	err := api.MergeCreateFile(tempFiles, path, false, config)

	// Cleanup temp files
	for _, f := range tempFiles {
		os.Remove(f)
	}

	if err != nil {
		return err
	}

	return nil
}

func TestGetPDFPageCount(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a test PDF file
	testPDF := filepath.Join(testDir, "test.pdf")
	if err := createTestPDF(testPDF); err != nil {
		t.Fatalf("Failed to create test PDF: %v", err)
	}

	// Test GetPDFPageCount
	pageCount, err := app.GetPDFPageCount(testPDF)
	if err != nil {
		t.Fatalf("GetPDFPageCount failed: %v", err)
	}

	// The minimal test PDF has 1 page
	if pageCount != 1 {
		t.Errorf("Expected page count 1, got %d", pageCount)
	}
}

func TestGetPDFPageCount_MultiPage(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a multi-page PDF (3 pages)
	testPDF := filepath.Join(testDir, "multipage.pdf")
	if err := createMultiPageTestPDF(testPDF, 3); err != nil {
		t.Fatalf("Failed to create multi-page test PDF: %v", err)
	}

	// Test GetPDFPageCount
	pageCount, err := app.GetPDFPageCount(testPDF)
	if err != nil {
		t.Fatalf("GetPDFPageCount failed: %v", err)
	}

	if pageCount != 3 {
		t.Errorf("Expected page count 3, got %d", pageCount)
	}
}

func TestGetPDFPageCount_NonExistentFile(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	_, err := app.GetPDFPageCount("/nonexistent/file.pdf")
	if err == nil {
		t.Error("Expected error for non-existent file, got nil")
	}
}

func TestGetPDFPageCount_NonPDFFile(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a text file
	testFile := filepath.Join(testDir, "test.txt")
	if err := os.WriteFile(testFile, []byte("not a PDF"), 0644); err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}

	_, err := app.GetPDFPageCount(testFile)
	if err == nil {
		t.Error("Expected error for non-PDF file, got nil")
	}
}

func TestGetPDFMetadata(t *testing.T) {
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

	// Test GetPDFMetadata
	metadata, err := app.GetPDFMetadata(testPDF)
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
	if metadata.Size == 0 {
		t.Errorf("Expected non-zero size, got %d", metadata.Size)
	}
	if metadata.LastModified == "" {
		t.Errorf("Expected LastModified to be set, got empty string")
	}
	if !metadata.IsPDF {
		t.Errorf("Expected IsPDF to be true, got false")
	}
	if metadata.TotalPages != 1 {
		t.Errorf("Expected TotalPages to be 1, got %d", metadata.TotalPages)
	}
}

func TestGetPDFMetadata_MultiPage(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a multi-page PDF (5 pages)
	testPDF := filepath.Join(testDir, "multipage.pdf")
	if err := createMultiPageTestPDF(testPDF, 5); err != nil {
		t.Fatalf("Failed to create multi-page test PDF: %v", err)
	}

	// Test GetPDFMetadata
	metadata, err := app.GetPDFMetadata(testPDF)
	if err != nil {
		t.Fatalf("GetPDFMetadata failed: %v", err)
	}

	if metadata.TotalPages != 5 {
		t.Errorf("Expected TotalPages to be 5, got %d", metadata.TotalPages)
	}
}

func TestGetPDFMetadata_NonExistentFile(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	_, err := app.GetPDFMetadata("/nonexistent/file.pdf")
	if err == nil {
		t.Error("Expected error for non-existent file, got nil")
	}
}

func TestSplitPDF(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a multi-page PDF (10 pages)
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 10); err != nil {
		t.Fatalf("Failed to create multi-page test PDF: %v", err)
	}

	outputDir := filepath.Join(testDir, "output")
	if err := os.Mkdir(outputDir, 0755); err != nil {
		t.Fatalf("Failed to create output directory: %v", err)
	}

	// Define splits
	splits := []SplitDefinition{
		{StartPage: 1, EndPage: 3, Filename: "split1"},
		{StartPage: 4, EndPage: 7, Filename: "split2"},
		{StartPage: 8, EndPage: 10, Filename: "split3"},
	}

	// Test SplitPDF
	err := app.SplitPDF(inputPDF, splits, outputDir)
	if err != nil {
		t.Fatalf("SplitPDF failed: %v", err)
	}

	// Verify all split files were created
	expectedFiles := []string{"split1.pdf", "split2.pdf", "split3.pdf"}
	for _, filename := range expectedFiles {
		filePath := filepath.Join(outputDir, filename)
		info, err := os.Stat(filePath)
		if err != nil {
			t.Errorf("Split file %s was not created: %v", filename, err)
			continue
		}

		if info.Size() == 0 {
			t.Errorf("Split file %s is empty", filename)
		}

		// Verify it's a valid PDF
		content, err := os.ReadFile(filePath)
		if err != nil {
			t.Errorf("Failed to read split file %s: %v", filename, err)
			continue
		}

		if len(content) < 4 || string(content[0:4]) != "%PDF" {
			t.Errorf("Split file %s does not appear to be a valid PDF", filename)
		}
	}
}

func TestSplitPDF_SinglePageSplit(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a multi-page PDF (5 pages)
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 5); err != nil {
		t.Fatalf("Failed to create multi-page test PDF: %v", err)
	}

	outputDir := filepath.Join(testDir, "output")
	if err := os.Mkdir(outputDir, 0755); err != nil {
		t.Fatalf("Failed to create output directory: %v", err)
	}

	// Define single page split
	splits := []SplitDefinition{
		{StartPage: 3, EndPage: 3, Filename: "single_page"},
	}

	// Test SplitPDF
	err := app.SplitPDF(inputPDF, splits, outputDir)
	if err != nil {
		t.Fatalf("SplitPDF failed: %v", err)
	}

	// Verify file was created
	outputPath := filepath.Join(outputDir, "single_page.pdf")
	info, err := os.Stat(outputPath)
	if err != nil {
		t.Fatalf("Split file was not created: %v", err)
	}

	if info.Size() == 0 {
		t.Error("Split file is empty")
	}
}

func TestSplitPDF_InvalidPageRange(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a test PDF (1 page)
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createTestPDF(inputPDF); err != nil {
		t.Fatalf("Failed to create test PDF: %v", err)
	}

	outputDir := filepath.Join(testDir, "output")
	if err := os.Mkdir(outputDir, 0755); err != nil {
		t.Fatalf("Failed to create output directory: %v", err)
	}

	// Define split with invalid page range (page 2 doesn't exist)
	splits := []SplitDefinition{
		{StartPage: 2, EndPage: 2, Filename: "invalid"},
	}

	// Test SplitPDF should fail
	err := app.SplitPDF(inputPDF, splits, outputDir)
	if err == nil {
		t.Error("Expected error for invalid page range, got nil")
	}
}

func TestSplitPDF_EndPageLessThanStartPage(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a multi-page PDF (5 pages)
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 5); err != nil {
		t.Fatalf("Failed to create multi-page test PDF: %v", err)
	}

	outputDir := filepath.Join(testDir, "output")
	if err := os.Mkdir(outputDir, 0755); err != nil {
		t.Fatalf("Failed to create output directory: %v", err)
	}

	// Define split with end page less than start page
	splits := []SplitDefinition{
		{StartPage: 3, EndPage: 1, Filename: "invalid"},
	}

	// Test SplitPDF should fail
	err := app.SplitPDF(inputPDF, splits, outputDir)
	if err == nil {
		t.Error("Expected error for end page less than start page, got nil")
	}
}

func TestSplitPDF_EmptyFilename(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a test PDF
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createTestPDF(inputPDF); err != nil {
		t.Fatalf("Failed to create test PDF: %v", err)
	}

	outputDir := filepath.Join(testDir, "output")
	if err := os.Mkdir(outputDir, 0755); err != nil {
		t.Fatalf("Failed to create output directory: %v", err)
	}

	// Define split with empty filename
	splits := []SplitDefinition{
		{StartPage: 1, EndPage: 1, Filename: ""},
	}

	// Test SplitPDF should fail
	err := app.SplitPDF(inputPDF, splits, outputDir)
	if err == nil {
		t.Error("Expected error for empty filename, got nil")
	}
}

func TestSplitPDF_DuplicateFilenames(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a multi-page PDF (5 pages)
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 5); err != nil {
		t.Fatalf("Failed to create multi-page test PDF: %v", err)
	}

	outputDir := filepath.Join(testDir, "output")
	if err := os.Mkdir(outputDir, 0755); err != nil {
		t.Fatalf("Failed to create output directory: %v", err)
	}

	// Define splits with duplicate filenames
	splits := []SplitDefinition{
		{StartPage: 1, EndPage: 2, Filename: "duplicate"},
		{StartPage: 3, EndPage: 4, Filename: "duplicate"},
	}

	// Test SplitPDF should fail
	err := app.SplitPDF(inputPDF, splits, outputDir)
	if err == nil {
		t.Error("Expected error for duplicate filenames, got nil")
	}
}

func TestSplitPDF_NonExistentInputFile(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	outputDir := filepath.Join(testDir, "output")
	if err := os.Mkdir(outputDir, 0755); err != nil {
		t.Fatalf("Failed to create output directory: %v", err)
	}

	splits := []SplitDefinition{
		{StartPage: 1, EndPage: 1, Filename: "test"},
	}

	// Test SplitPDF should fail
	err := app.SplitPDF("/nonexistent/file.pdf", splits, outputDir)
	if err == nil {
		t.Error("Expected error for non-existent input file, got nil")
	}
}

func TestSplitPDF_NonExistentOutputDir(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a test PDF
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createTestPDF(inputPDF); err != nil {
		t.Fatalf("Failed to create test PDF: %v", err)
	}

	nonExistentDir := filepath.Join(testDir, "nonexistent")
	splits := []SplitDefinition{
		{StartPage: 1, EndPage: 1, Filename: "test"},
	}

	// Test SplitPDF should fail
	err := app.SplitPDF(inputPDF, splits, nonExistentDir)
	if err == nil {
		t.Error("Expected error for non-existent output directory, got nil")
	}
}

func TestSplitPDF_OverwriteExisting(t *testing.T) {
	app := NewApp()
	app.startup(context.Background())

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a multi-page PDF (5 pages)
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 5); err != nil {
		t.Fatalf("Failed to create multi-page test PDF: %v", err)
	}

	outputDir := filepath.Join(testDir, "output")
	if err := os.Mkdir(outputDir, 0755); err != nil {
		t.Fatalf("Failed to create output directory: %v", err)
	}

	// Create an existing output file
	existingFile := filepath.Join(outputDir, "split1.pdf")
	if err := os.WriteFile(existingFile, []byte("old content"), 0644); err != nil {
		t.Fatalf("Failed to create existing output file: %v", err)
	}

	splits := []SplitDefinition{
		{StartPage: 1, EndPage: 3, Filename: "split1"},
	}

	// Test SplitPDF should overwrite existing file
	err := app.SplitPDF(inputPDF, splits, outputDir)
	if err != nil {
		t.Fatalf("SplitPDF failed: %v", err)
	}

	// Verify the file was overwritten with a valid PDF
	content, err := os.ReadFile(existingFile)
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
