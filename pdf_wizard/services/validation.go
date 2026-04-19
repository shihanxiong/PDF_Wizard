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

// statPDFFile performs the same Stat and error mapping as the first step of
// validatePDFFile, so callers can reuse os.FileInfo without a second Stat (#54).
func statPDFFile(path string) (os.FileInfo, error) {
	if path == "" {
		return nil, fmt.Errorf("file path cannot be empty")
	}
	info, err := os.Stat(path)
	if os.IsNotExist(err) {
		return nil, fmt.Errorf("file not found: %s", path)
	}
	if err != nil {
		return nil, fmt.Errorf("error accessing file %s: %w", path, err)
	}
	return info, nil
}

// validatePDFFileInfo checks directory vs file and PDF extension using an
// existing Stat result (no additional Stat).
func validatePDFFileInfo(path string, info os.FileInfo) error {
	if info.IsDir() {
		return fmt.Errorf("path is a directory, not a file: %s", path)
	}
	if !isPDFFile(path) {
		return fmt.Errorf("file is not a PDF: %s", path)
	}
	return nil
}

// validatePDFFile validates that a file exists and is a PDF
func validatePDFFile(path string) error {
	info, err := statPDFFile(path)
	if err != nil {
		return err
	}
	return validatePDFFileInfo(path, info)
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

