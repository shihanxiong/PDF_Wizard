package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// PDFMetadata represents file information including PDF metadata
type PDFMetadata struct {
	Path         string `json:"path"`
	Name         string `json:"name"`
	Size         int64  `json:"size"`         // bytes
	LastModified string `json:"lastModified"` // ISO 8601 format
	IsPDF        bool   `json:"isPDF"`
	TotalPages   int    `json:"totalPages"` // Total number of pages (0 for non-PDF files or when not needed)
}

// SplitDefinition represents a split configuration
type SplitDefinition struct {
	StartPage int    `json:"startPage"` // 1-based page number
	EndPage   int    `json:"endPage"`   // 1-based page number (inclusive)
	Filename  string `json:"filename"`  // Filename without .pdf extension
}

// SelectPDFFiles opens a file dialog to select multiple PDF files
func (a *App) SelectPDFFiles() ([]string, error) {
	selection, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select PDF Files",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "PDF files",
				Pattern:     "*.pdf",
			},
		},
	})
	if err != nil {
		return nil, err
	}
	return selection, nil
}

// SelectOutputDirectory opens a directory dialog to select output directory
func (a *App) SelectOutputDirectory() (string, error) {
	selection, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Output Directory",
	})
	if err != nil {
		return "", err
	}
	return selection, nil
}

// GetFileMetadata retrieves file metadata (TotalPages will be 0 unless needed)
func (a *App) GetFileMetadata(path string) (PDFMetadata, error) {
	info, err := os.Stat(path)
	if err != nil {
		return PDFMetadata{}, err
	}

	return PDFMetadata{
		Path:         path,
		Name:         filepath.Base(path),
		Size:         info.Size(),
		LastModified: info.ModTime().Format(time.RFC3339),
		IsPDF:        strings.ToLower(filepath.Ext(path)) == ".pdf",
		TotalPages:   0, // Not needed for merge operations
	}, nil
}

// MergePDFs merges the given PDF files in order and saves to output directory
func (a *App) MergePDFs(inputPaths []string, outputDirectory string, outputFilename string) error {
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

// SelectPDFFile opens a file dialog to select a single PDF file
func (a *App) SelectPDFFile() (string, error) {
	selection, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select PDF File",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "PDF files",
				Pattern:     "*.pdf",
			},
		},
	})
	if err != nil {
		return "", err
	}
	if selection == "" {
		return "", fmt.Errorf("no file selected")
	}
	return selection, nil
}

// GetPDFPageCount returns the total number of pages in a PDF file
func (a *App) GetPDFPageCount(path string) (int, error) {
	// Validate file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return 0, fmt.Errorf("file not found: %s", path)
	}

	// Check if file has .pdf extension
	if strings.ToLower(filepath.Ext(path)) != ".pdf" {
		return 0, fmt.Errorf("file is not a PDF: %s", path)
	}

	// Use pdfcpu to read the PDF and get page count
	ctx, err := api.ReadContextFile(path)
	if err != nil {
		return 0, fmt.Errorf("failed to read PDF: %w", err)
	}

	pageCount := ctx.PageCount
	return pageCount, nil
}

// GetPDFMetadata retrieves PDF file metadata including page count
func (a *App) GetPDFMetadata(path string) (PDFMetadata, error) {
	info, err := os.Stat(path)
	if err != nil {
		return PDFMetadata{}, err
	}

	// Get page count
	pageCount, err := a.GetPDFPageCount(path)
	if err != nil {
		return PDFMetadata{}, fmt.Errorf("failed to get page count: %w", err)
	}

	return PDFMetadata{
		Path:         path,
		Name:         filepath.Base(path),
		Size:         info.Size(),
		LastModified: info.ModTime().Format(time.RFC3339),
		IsPDF:        strings.ToLower(filepath.Ext(path)) == ".pdf",
		TotalPages:   pageCount,
	}, nil
}

// SplitPDF splits the given PDF according to split definitions
func (a *App) SplitPDF(inputPath string, splits []SplitDefinition, outputDirectory string) error {
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
	totalPages, err := a.GetPDFPageCount(inputPath)
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
