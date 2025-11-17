package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// isPDFFile checks if a file path has a PDF extension
func isPDFFile(path string) bool {
	return strings.ToLower(filepath.Ext(path)) == PDFExtension
}

// validatePDFFile validates that a file exists and is a PDF
func validatePDFFile(path string) error {
	if path == "" {
		return fmt.Errorf("file path cannot be empty")
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
	if !isPDFFile(path) {
		return fmt.Errorf("file is not a PDF: %s", path)
	}
	return nil
}

// validateOutputDirectory validates that an output directory exists and is writable
func validateOutputDirectory(path string) error {
	info, err := os.Stat(path)
	if os.IsNotExist(err) {
		return fmt.Errorf("output directory does not exist: %s", path)
	}
	if err != nil {
		return fmt.Errorf("error accessing output directory: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("output path is not a directory: %s", path)
	}
	return nil
}

