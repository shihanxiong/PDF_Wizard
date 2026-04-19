package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"pdf_wizard/models"
	"pdf_wizard/services"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct acts as a thin wrapper around services for Wails binding
type App struct {
	ctx         context.Context
	fileService *services.FileService
	pdfService  *services.PDFService

	phoneMu   sync.Mutex
	phoneStop func() error
}

const (
	configFileName  = "pdf_wizard_config.json"
	defaultLanguage = "en"
)

// validLanguages is the single source of truth for supported languages
var validLanguages = map[string]bool{
	"en":    true,
	"zh":    true,
	"zh-TW": true,
	"ar":    true,
	"fr":    true,
	"ja":    true,
	"hi":    true,
	"es":    true,
	"pt":    true,
	"ru":    true,
	"ko":    true,
	"de":    true,
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	// Save context for runtime operations
	a.ctx = ctx

	// Initialize services with context
	fileService := services.NewFileService(ctx)
	pdfService := services.NewPDFService(fileService)

	a.fileService = fileService
	a.pdfService = pdfService
}

// shutdown stops background work before the app exits.
func (a *App) shutdown(_ context.Context) {
	_ = a.StopImagesPhoneUpload()
}

// EmitSettingsEvent emits an event to show the settings dialog
func (a *App) EmitSettingsEvent() {
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "show-settings")
	}
}

// getConfigPath returns the path to the config file
func (a *App) getConfigPath() (string, error) {
	userConfigDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	configDir := filepath.Join(userConfigDir, "PDF Wizard")
	// Create directory if it doesn't exist
	if err := os.MkdirAll(configDir, services.DefaultDirPerm); err != nil {
		return "", err
	}
	return filepath.Join(configDir, configFileName), nil
}

// Config represents the application configuration
type Config struct {
	Language string `json:"language"`
}

// GetLanguage returns the current language setting (default: "en")
func (a *App) GetLanguage() (string, error) {
	configPath, err := a.getConfigPath()
	if err != nil {
		return defaultLanguage, nil // Return default on error
	}

	// Read config file
	data, err := os.ReadFile(configPath)
	if err != nil {
		// File doesn't exist, return default
		return defaultLanguage, nil
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return defaultLanguage, nil
	}

	if config.Language == "" {
		return defaultLanguage, nil
	}

	// Validate language code
	if !validLanguages[config.Language] {
		return defaultLanguage, nil
	}

	return config.Language, nil
}

// SetLanguage saves the language preference
func (a *App) SetLanguage(language string) error {
	// Validate language code
	if !validLanguages[language] {
		return fmt.Errorf("invalid language code: %s", language)
	}

	configPath, err := a.getConfigPath()
	if err != nil {
		return err
	}

	config := Config{
		Language: language,
	}

	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, services.DefaultFilePerm)
}

// SelectPDFFiles opens a file dialog to select multiple PDF files
func (a *App) SelectPDFFiles() ([]string, error) {
	return a.fileService.SelectPDFFiles()
}

// SelectPDFFile opens a file dialog to select a single PDF file
func (a *App) SelectPDFFile() (string, error) {
	return a.fileService.SelectPDFFile()
}

// SelectOutputDirectory opens a directory dialog to select output directory
func (a *App) SelectOutputDirectory() (string, error) {
	return a.fileService.SelectOutputDirectory()
}

// GetFileMetadata retrieves file metadata (TotalPages will be 0 unless needed)
func (a *App) GetFileMetadata(path string) (models.PDFMetadata, error) {
	return a.fileService.GetFileMetadata(path)
}

// GetPDFPageCount returns the total number of pages in a PDF file
func (a *App) GetPDFPageCount(path string) (int, error) {
	return a.fileService.GetPDFPageCount(path)
}

// GetPDFMetadata retrieves PDF file metadata including page count
func (a *App) GetPDFMetadata(path string) (models.PDFMetadata, error) {
	return a.fileService.GetPDFMetadata(path)
}

// MergePDFs merges the given PDF files in order and saves to output directory
func (a *App) MergePDFs(inputPaths []string, outputDirectory string, outputFilename string) error {
	return a.pdfService.MergePDFs(inputPaths, outputDirectory, outputFilename)
}

// SelectImageFiles opens a dialog to select multiple image files.
func (a *App) SelectImageFiles() ([]string, error) {
	return a.fileService.SelectImageFiles()
}

// ImagesToPDF writes a PDF with one page per image in the given order.
func (a *App) ImagesToPDF(imagePaths []string, outputDirectory string, outputFilename string) error {
	return a.pdfService.ImagesToPDF(imagePaths, outputDirectory, outputFilename)
}

// StartImagesPhoneUpload starts an HTTP server on the LAN and returns the upload page URL for QR codes.
// pageCopy must match the current UI language (typically from useI18n on the Images to PDF tab).
// Uploaded images are emitted to the frontend as event "images-phone-upload" with a JSON array of file paths.
func (a *App) StartImagesPhoneUpload(pageCopy models.PhoneUploadPageCopy) (string, error) {
	if a.ctx == nil {
		return "", fmt.Errorf("application not ready")
	}
	a.phoneMu.Lock()
	defer a.phoneMu.Unlock()
	if a.phoneStop != nil {
		_ = a.phoneStop()
		a.phoneStop = nil
	}
	url, stop, err := services.StartLANImageUploadServer(func(paths []string) {
		data, err := json.Marshal(paths)
		if err != nil {
			return
		}
		runtime.EventsEmit(a.ctx, "images-phone-upload", string(data))
		// End the receive session after a successful upload so the phone must scan a new QR for more images.
		if len(paths) > 0 {
			go func() {
				_ = a.StopImagesPhoneUpload()
			}()
		}
	}, pageCopy)
	if err != nil {
		return "", err
	}
	a.phoneStop = stop
	return url, nil
}

// StopImagesPhoneUpload stops the LAN upload server and removes temporary files.
func (a *App) StopImagesPhoneUpload() error {
	a.phoneMu.Lock()
	defer a.phoneMu.Unlock()
	if a.phoneStop == nil {
		return nil
	}
	err := a.phoneStop()
	a.phoneStop = nil
	return err
}

// SplitPDF splits the given PDF according to split definitions
func (a *App) SplitPDF(inputPath string, splits []models.SplitDefinition, outputDirectory string) error {
	return a.pdfService.SplitPDF(inputPath, splits, outputDirectory)
}

// RotatePDF rotates specified page ranges in a PDF file
func (a *App) RotatePDF(inputPath string, rotations []models.RotateDefinition, outputDirectory string, outputFilename string) error {
	return a.pdfService.RotatePDF(inputPath, rotations, outputDirectory, outputFilename)
}

// ApplyWatermark applies a text watermark to the specified PDF file
func (a *App) ApplyWatermark(inputPath string, watermark models.WatermarkDefinition, outputDirectory string, outputFilename string) error {
	return a.pdfService.ApplyWatermark(inputPath, watermark, outputDirectory, outputFilename)
}
