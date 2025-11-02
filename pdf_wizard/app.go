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

// FileMetadata represents file information
type FileMetadata struct {
	Path         string `json:"path"`
	Name         string `json:"name"`
	Size         int64  `json:"size"`         // bytes
	LastModified string `json:"lastModified"` // ISO 8601 format
	IsPDF        bool   `json:"isPDF"`
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

// GetFileMetadata retrieves file metadata
func (a *App) GetFileMetadata(path string) (FileMetadata, error) {
	info, err := os.Stat(path)
	if err != nil {
		return FileMetadata{}, err
	}

	return FileMetadata{
		Path:         path,
		Name:         filepath.Base(path),
		Size:         info.Size(),
		LastModified: info.ModTime().Format(time.RFC3339),
		IsPDF:        strings.ToLower(filepath.Ext(path)) == ".pdf",
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
