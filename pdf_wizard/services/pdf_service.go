package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	"pdf_wizard/models"
)

// PDFService handles PDF operations (merge, split)
type PDFService struct {
	fileService *FileService
}

// NewPDFService creates a new PDFService instance
func NewPDFService(fileService *FileService) *PDFService {
	return &PDFService{fileService: fileService}
}

// MergePDFs merges the given PDF files in order and saves to output directory
func (s *PDFService) MergePDFs(inputPaths []string, outputDirectory string, outputFilename string) error {
	// Validate input files
	if len(inputPaths) == 0 {
		return fmt.Errorf("no input files provided")
	}

	// Validate all input files exist and are readable
	for i, path := range inputPaths {
		if path == "" {
			return fmt.Errorf("empty file path at index %d", i)
		}
		info, err := os.Stat(path)
		if os.IsNotExist(err) {
			return fmt.Errorf("file not found: %s", path)
		}
		if err != nil {
			return fmt.Errorf("error accessing file %s: %w", path, err)
		}
		if info.IsDir() {
			return fmt.Errorf("path is a directory, not a file: %s", path)
		}
		// Check if file has .pdf extension
		if strings.ToLower(filepath.Ext(path)) != ".pdf" {
			return fmt.Errorf("file is not a PDF: %s", path)
		}
	}

	// Validate output directory exists and is writable
	info, err := os.Stat(outputDirectory)
	if os.IsNotExist(err) {
		return fmt.Errorf("output directory does not exist: %s", outputDirectory)
	}
	if err != nil {
		return fmt.Errorf("error accessing output directory: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("output path is not a directory: %s", outputDirectory)
	}

	// outputFilename from frontend does not include .pdf extension
	// Always append .pdf extension
	outputPath := filepath.Join(outputDirectory, outputFilename+".pdf")

	// Remove existing output file if it exists (pdfcpu may have issues overwriting)
	if _, err := os.Stat(outputPath); err == nil {
		if err := os.Remove(outputPath); err != nil {
			return fmt.Errorf("failed to remove existing output file: %w", err)
		}
	}

	// Use pdfcpu to merge PDFs
	config := model.NewDefaultConfiguration()

	// Merge the PDF files
	// dividerPage: false means no divider pages between merged PDFs
	err = api.MergeCreateFile(inputPaths, outputPath, false, config)
	if err != nil {
		return fmt.Errorf("failed to merge PDFs: %w", err)
	}

	// Validate the merged file was created
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return fmt.Errorf("merged file was not created at: %s", outputPath)
	}

	return nil
}

// SplitPDF splits the given PDF according to split definitions
func (s *PDFService) SplitPDF(inputPath string, splits []models.SplitDefinition, outputDirectory string) error {
	// Validate input file exists
	if _, err := os.Stat(inputPath); os.IsNotExist(err) {
		return fmt.Errorf("input file not found: %s", inputPath)
	}

	// Check if file has .pdf extension
	if strings.ToLower(filepath.Ext(inputPath)) != ".pdf" {
		return fmt.Errorf("input file is not a PDF: %s", inputPath)
	}

	// Validate output directory exists and is writable
	info, err := os.Stat(outputDirectory)
	if os.IsNotExist(err) {
		return fmt.Errorf("output directory does not exist: %s", outputDirectory)
	}
	if err != nil {
		return fmt.Errorf("error accessing output directory: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("output path is not a directory: %s", outputDirectory)
	}

	// Get PDF page count for validation
	totalPages, err := s.fileService.GetPDFPageCount(inputPath)
	if err != nil {
		return fmt.Errorf("failed to get page count: %w", err)
	}

	// Validate all splits
	for i, split := range splits {
		if split.StartPage < 1 || split.StartPage > totalPages {
			return fmt.Errorf("split %d: start page %d is out of range (1-%d)", i+1, split.StartPage, totalPages)
		}
		if split.EndPage < split.StartPage || split.EndPage > totalPages {
			return fmt.Errorf("split %d: end page %d is invalid (must be >= start page and <= %d)", i+1, split.EndPage, totalPages)
		}
		if strings.TrimSpace(split.Filename) == "" {
			return fmt.Errorf("split %d: filename cannot be empty", i+1)
		}
	}

	// Check for duplicate filenames
	filenameMap := make(map[string]bool)
	for _, split := range splits {
		filename := strings.TrimSpace(split.Filename) + ".pdf"
		if filenameMap[filename] {
			return fmt.Errorf("duplicate filename: %s", filename)
		}
		filenameMap[filename] = true
	}

	// Use pdfcpu to split the PDF
	config := model.NewDefaultConfiguration()

	// Process each split
	for i, split := range splits {
		// Create output path
		outputPath := filepath.Join(outputDirectory, strings.TrimSpace(split.Filename)+".pdf")

		// Remove existing output file if it exists
		if _, err := os.Stat(outputPath); err == nil {
			if err := os.Remove(outputPath); err != nil {
				return fmt.Errorf("failed to remove existing output file: %w", err)
			}
		}

		// Use TrimFile to extract the page range
		// pdfcpu uses 1-based page numbers and TrimFile keeps only the specified pages
		pageRange := fmt.Sprintf("%d-%d", split.StartPage, split.EndPage)
		err := api.TrimFile(inputPath, outputPath, []string{pageRange}, config)
		if err != nil {
			return fmt.Errorf("failed to trim pages for split %d (pages %d-%d): %w", i+1, split.StartPage, split.EndPage, err)
		}

		// Validate the split file was created
		if _, err := os.Stat(outputPath); os.IsNotExist(err) {
			return fmt.Errorf("split file was not created at: %s", outputPath)
		}
	}

	return nil
}
