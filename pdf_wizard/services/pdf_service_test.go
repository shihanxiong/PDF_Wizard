package services

import (
	"context"
	"embed"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	"pdf_wizard/models"
)

//go:embed testdata/sample.heic
var heicTestFS embed.FS

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

func TestPDFService_MergePDFs_InvalidInputDiagnosed(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	good := filepath.Join(testDir, "good.pdf")
	bad := filepath.Join(testDir, "bad.pdf")
	if err := createTestPDF(good); err != nil {
		t.Fatalf("Failed to create good PDF: %v", err)
	}
	if err := os.WriteFile(bad, []byte("not a valid pdf"), 0644); err != nil {
		t.Fatalf("Failed to write bad PDF: %v", err)
	}

	err := service.MergePDFs([]string{good, bad}, testDir, "merged-invalid")
	if err == nil {
		t.Fatal("expected merge to fail for invalid PDF input")
	}
	// Diagnosis path should mention the bad file index/name
	if !strings.Contains(err.Error(), "bad.pdf") {
		t.Errorf("expected error to reference bad.pdf, got: %v", err)
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

// ApplyWatermark integration: service returns success and writes a non-empty PDF.
// Stamp-on-top (visible over opaque content) is enforced in ApplyWatermark via
// api.TextWatermark(..., onTop=true); we do not assert on pdfcpu’s internal output here.
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

func TestPDFService_ImagesToPDF(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	img1 := filepath.Join(testDir, "first.png")
	img2 := filepath.Join(testDir, "second.png")
	writeTestPNG(t, img1)
	writeTestPNG(t, img2)

	err := service.ImagesToPDF([]string{img1, img2}, testDir, "from_images")
	if err != nil {
		t.Fatalf("ImagesToPDF: %v", err)
	}

	out := filepath.Join(testDir, "from_images.pdf")
	content, err := os.ReadFile(out)
	if err != nil {
		t.Fatalf("read output: %v", err)
	}
	if len(content) < 4 || string(content[0:4]) != "%PDF" {
		t.Fatal("output is not a valid PDF")
	}

	n, err := fileService.GetPDFPageCount(out)
	if err != nil {
		t.Fatalf("GetPDFPageCount: %v", err)
	}
	if n != 2 {
		t.Fatalf("expected 2 pages, got %d", n)
	}
}

func TestPDFService_ImagesToPDF_HEIC(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)
	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	heicBytes, err := heicTestFS.ReadFile("testdata/sample.heic")
	if err != nil {
		t.Fatalf("read embedded HEIC: %v", err)
	}

	heicPath := filepath.Join(testDir, "sample.heic")
	if err := os.WriteFile(heicPath, heicBytes, 0644); err != nil {
		t.Fatal(err)
	}

	err = service.ImagesToPDF([]string{heicPath}, testDir, "from_heic")
	if err != nil {
		t.Fatalf("ImagesToPDF HEIC: %v", err)
	}

	out := filepath.Join(testDir, "from_heic.pdf")
	var content []byte
	content, err = os.ReadFile(out)
	if err != nil {
		t.Fatalf("read output: %v", err)
	}
	if len(content) < 4 || string(content[0:4]) != "%PDF" {
		t.Fatal("output is not a valid PDF")
	}
	var n int
	n, err = fileService.GetPDFPageCount(out)
	if err != nil {
		t.Fatalf("GetPDFPageCount: %v", err)
	}
	if n != 1 {
		t.Fatalf("expected 1 page, got %d", n)
	}
}

func TestPDFService_LockAndUnlockPDF(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	input := filepath.Join(testDir, "plain.pdf")
	if err := createTestPDF(input); err != nil {
		t.Fatalf("create test PDF: %v", err)
	}

	lockPassword := "s3cret-pass"
	if err := service.LockPDF(input, lockPassword, testDir, "locked"); err != nil {
		t.Fatalf("LockPDF failed: %v", err)
	}

	lockedPath := filepath.Join(testDir, "locked.pdf")
	if _, err := api.ReadContextFile(lockedPath); err == nil {
		t.Fatal("expected locked PDF to require a password")
	}

	if err := service.UnlockPDF(lockedPath, lockPassword, testDir, "unlocked"); err != nil {
		t.Fatalf("UnlockPDF failed: %v", err)
	}

	unlockedPath := filepath.Join(testDir, "unlocked.pdf")
	if _, err := api.ReadContextFile(unlockedPath); err != nil {
		t.Fatalf("expected unlocked PDF to be readable without password: %v", err)
	}
}

func TestPDFService_UnlockPDF_WrongPassword(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	input := filepath.Join(testDir, "plain.pdf")
	if err := createTestPDF(input); err != nil {
		t.Fatalf("create test PDF: %v", err)
	}

	conf := model.NewAESConfiguration("correct-password", "correct-password", 256)
	lockedPath := filepath.Join(testDir, "locked.pdf")
	if err := api.EncryptFile(input, lockedPath, conf); err != nil {
		t.Fatalf("api.EncryptFile failed: %v", err)
	}

	err := service.UnlockPDF(lockedPath, "wrong-password", testDir, "should_fail")
	if err == nil {
		t.Fatal("expected UnlockPDF to fail with wrong password")
	}
}

func TestPDFService_ListAndFillPDFForm(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	input := filepath.Join(testDir, "form_input.pdf")
	createSampleFormPDF(t, input)

	fields, err := service.ListPDFFormFields(input)
	if err != nil {
		t.Fatalf("ListPDFFormFields failed: %v", err)
	}
	if len(fields) == 0 {
		t.Fatal("expected at least one form field")
	}

	var targetID string
	for _, field := range fields {
		if !field.Locked && field.Type == "text" {
			targetID = field.ID
			break
		}
	}
	if targetID == "" {
		t.Fatal("expected at least one editable text field")
	}

	if err := service.FillPDFForm(input, []models.PDFFormFieldValue{{ID: targetID, Value: "Updated By Test"}}, testDir, "filled"); err != nil {
		t.Fatalf("FillPDFForm failed: %v", err)
	}

	out := filepath.Join(testDir, "filled.pdf")
	if _, err := os.Stat(out); err != nil {
		t.Fatalf("expected filled output file: %v", err)
	}

	updatedFields, err := service.ListPDFFormFields(out)
	if err != nil {
		t.Fatalf("ListPDFFormFields output failed: %v", err)
	}
	foundUpdated := false
	for _, field := range updatedFields {
		if field.ID == targetID && field.Value == "Updated By Test" {
			foundUpdated = true
			break
		}
	}
	if !foundUpdated {
		t.Fatalf("expected field %s to be updated", targetID)
	}
}

func TestPDFService_FillPDFForm_Validation(t *testing.T) {
	fileService := NewFileService(context.Background())
	service := NewPDFService(fileService)

	testDir := setupTestDir(t)
	defer cleanupTestDir(t, testDir)

	plain := filepath.Join(testDir, "plain.pdf")
	if err := createTestPDF(plain); err != nil {
		t.Fatalf("create plain PDF: %v", err)
	}

	if _, err := service.ListPDFFormFields(plain); err == nil {
		t.Fatal("expected ListPDFFormFields to fail for non-form PDF")
	}

	err := service.FillPDFForm(plain, nil, testDir, "no_values")
	if err == nil {
		t.Fatal("expected FillPDFForm to fail with no values")
	}
}

func createSampleFormPDF(t *testing.T, outPath string) {
	t.Helper()

	cmd := exec.Command("go", "list", "-m", "-f", "{{.Dir}}", "github.com/pdfcpu/pdfcpu")
	out, err := cmd.Output()
	if err != nil {
		t.Fatalf("resolve pdfcpu module dir: %v", err)
	}
	moduleDir := strings.TrimSpace(string(out))
	inJSON := filepath.Join(moduleDir, "pkg", "testdata", "json", "form", "textfieldGroupSingle.json")

	if err := api.CreateFile("", inJSON, outPath, model.NewDefaultConfiguration()); err != nil {
		t.Fatalf("create sample form PDF: %v", err)
	}
}
