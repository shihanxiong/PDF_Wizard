package main

import (
	"context"

	"pdf_wizard/models"
	"pdf_wizard/services"
)

// App struct acts as a thin wrapper around services for Wails binding
type App struct {
	fileService *services.FileService
	pdfService  *services.PDFService
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	// Initialize services with context
	fileService := services.NewFileService(ctx)
	pdfService := services.NewPDFService(fileService)

	a.fileService = fileService
	a.pdfService = pdfService
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

// SplitPDF splits the given PDF according to split definitions
func (a *App) SplitPDF(inputPath string, splits []models.SplitDefinition, outputDirectory string) error {
	return a.pdfService.SplitPDF(inputPath, splits, outputDirectory)
}
