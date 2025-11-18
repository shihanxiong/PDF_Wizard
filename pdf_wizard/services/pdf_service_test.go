package services

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	"pdf_wizard/models"
)

func TestPDFService_MergePDFs(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

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
	err := service.MergePDFs([]string{pdf1, pdf2, pdf3}, outputDir, outputFilename)
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

func TestPDFService_SplitPDF(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

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
	splits := []models.SplitDefinition{
		{StartPage: 1, EndPage: 3, Filename: "split1"},
		{StartPage: 4, EndPage: 7, Filename: "split2"},
		{StartPage: 8, EndPage: 10, Filename: "split3"},
	}

	// Test SplitPDF
	err := service.SplitPDF(inputPDF, splits, outputDir)
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

func TestPDFService_RotatePDF(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a multi-page PDF (5 pages)
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 5); err != nil {
		t.Fatalf("Failed to create multi-page test PDF: %v", err)
	}

	outputDir := testDir
	outputFilename := "rotated"

	// Define rotations
	rotations := []models.RotateDefinition{
		{StartPage: 1, EndPage: 2, Rotation: 90},
		{StartPage: 3, EndPage: 4, Rotation: -90},
		{StartPage: 5, EndPage: 5, Rotation: 180},
	}

	// Test RotatePDF
	err := service.RotatePDF(inputPDF, rotations, outputDir, outputFilename)
	if err != nil {
		t.Fatalf("RotatePDF failed: %v", err)
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

func TestPDFService_ApplyWatermark(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a multi-page PDF (5 pages)
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 5); err != nil {
		t.Fatalf("Failed to create multi-page test PDF: %v", err)
	}

	outputDir := testDir
	outputFilename := "watermarked"

	// Define watermark configuration
	watermark := models.WatermarkDefinition{
		TextConfig: models.TextWatermarkConfig{
			Text:       "CONFIDENTIAL",
			FontSize:   24,
			FontColor:  "#808080",
			Opacity:    0.5,
			Rotation:   45,
			Position:   "center",
			FontFamily: "Helvetica",
		},
		PageRange: "all",
	}

	// Test ApplyWatermark
	err := service.ApplyWatermark(inputPDF, watermark, outputDir, outputFilename)
	if err != nil {
		t.Fatalf("ApplyWatermark failed: %v", err)
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

func TestPDFService_ApplyWatermark_SpecificPages(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a multi-page PDF (10 pages)
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createMultiPageTestPDF(inputPDF, 10); err != nil {
		t.Fatalf("Failed to create multi-page test PDF: %v", err)
	}

	outputDir := testDir
	outputFilename := "watermarked_specific"

	// Define watermark configuration for specific pages
	watermark := models.WatermarkDefinition{
		TextConfig: models.TextWatermarkConfig{
			Text:       "DRAFT",
			FontSize:   18,
			FontColor:  "#FF0000",
			Opacity:    0.7,
			Rotation:   0,
			Position:   "top-right",
			FontFamily: "Helvetica",
		},
		PageRange: "1,3,5-7",
	}

	// Test ApplyWatermark
	err := service.ApplyWatermark(inputPDF, watermark, outputDir, outputFilename)
	if err != nil {
		t.Fatalf("ApplyWatermark failed: %v", err)
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

	// Verify it's a valid PDF
	content, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatalf("Failed to read output file: %v", err)
	}

	if len(content) < 4 || string(content[0:4]) != "%PDF" {
		t.Error("Output file does not appear to be a valid PDF")
	}
}

func TestPDFService_ApplyWatermark_Validation(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	// Create a test PDF
	inputPDF := filepath.Join(testDir, "input.pdf")
	if err := createTestPDF(inputPDF); err != nil {
		t.Fatalf("Failed to create test PDF: %v", err)
	}

	outputDir := testDir
	outputFilename := "watermarked"

	// Test with empty text
	watermark := models.WatermarkDefinition{
		TextConfig: models.TextWatermarkConfig{
			Text:       "",
			FontSize:   24,
			FontColor:  "#000000",
			Opacity:    0.5,
			Rotation:   0,
			Position:   "center",
			FontFamily: "Helvetica",
		},
		PageRange: "all",
	}

	err := service.ApplyWatermark(inputPDF, watermark, outputDir, outputFilename)
	if err == nil {
		t.Error("Expected error for empty watermark text, got nil")
	}

	// Test with invalid page range
	watermark.TextConfig.Text = "TEST"
	watermark.PageRange = "999"
	err = service.ApplyWatermark(inputPDF, watermark, outputDir, outputFilename)
	if err == nil {
		t.Error("Expected error for invalid page range, got nil")
	}

	// Test with invalid opacity
	watermark.PageRange = "all"
	watermark.TextConfig.Opacity = 1.5
	err = service.ApplyWatermark(inputPDF, watermark, outputDir, outputFilename)
	if err == nil {
		t.Error("Expected error for invalid opacity, got nil")
	}
}
