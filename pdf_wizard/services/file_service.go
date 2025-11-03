package services

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/wailsapp/wails/v2/pkg/runtime"

	"pdf_wizard/models"
)

// FileService handles file operations and dialogs
type FileService struct {
	ctx context.Context
}

// NewFileService creates a new FileService instance
func NewFileService(ctx context.Context) *FileService {
	return &FileService{ctx: ctx}
}

// SelectPDFFiles opens a file dialog to select multiple PDF files
func (s *FileService) SelectPDFFiles() ([]string, error) {
	selection, err := runtime.OpenMultipleFilesDialog(s.ctx, runtime.OpenDialogOptions{
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

// SelectPDFFile opens a file dialog to select a single PDF file
func (s *FileService) SelectPDFFile() (string, error) {
	selection, err := runtime.OpenFileDialog(s.ctx, runtime.OpenDialogOptions{
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

// SelectOutputDirectory opens a directory dialog to select output directory
func (s *FileService) SelectOutputDirectory() (string, error) {
	selection, err := runtime.OpenDirectoryDialog(s.ctx, runtime.OpenDialogOptions{
		Title: "Select Output Directory",
	})
	if err != nil {
		return "", err
	}
	return selection, nil
}

// GetFileMetadata retrieves file metadata (TotalPages will be 0 unless needed)
func (s *FileService) GetFileMetadata(path string) (models.PDFMetadata, error) {
	info, err := os.Stat(path)
	if err != nil {
		return models.PDFMetadata{}, err
	}

	return models.PDFMetadata{
		Path:         path,
		Name:         filepath.Base(path),
		Size:         info.Size(),
		LastModified: info.ModTime().Format(time.RFC3339),
		IsPDF:        strings.ToLower(filepath.Ext(path)) == ".pdf",
		TotalPages:   0, // Not needed for merge operations
	}, nil
}

// GetPDFPageCount returns the total number of pages in a PDF file
func (s *FileService) GetPDFPageCount(path string) (int, error) {
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
func (s *FileService) GetPDFMetadata(path string) (models.PDFMetadata, error) {
	info, err := os.Stat(path)
	if err != nil {
		return models.PDFMetadata{}, err
	}

	// Get page count
	pageCount, err := s.GetPDFPageCount(path)
	if err != nil {
		return models.PDFMetadata{}, fmt.Errorf("failed to get page count: %w", err)
	}

	return models.PDFMetadata{
		Path:         path,
		Name:         filepath.Base(path),
		Size:         info.Size(),
		LastModified: info.ModTime().Format(time.RFC3339),
		IsPDF:        strings.ToLower(filepath.Ext(path)) == ".pdf",
		TotalPages:   pageCount,
	}, nil
}

