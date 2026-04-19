package services

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/color"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types"

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
		if err := validatePDFFile(path); err != nil {
			return fmt.Errorf("input file %d: %w", i+1, err)
		}
	}

	// Validate output directory exists and is writable
	if err := validateOutputDirectory(outputDirectory); err != nil {
		return err
	}

	// outputFilename from frontend does not include .pdf extension
	// Always append .pdf extension
	outputPath := filepath.Join(outputDirectory, outputFilename+PDFExtension)

	// Remove existing output file if it exists (pdfcpu may have issues overwriting)
	if err := removeIfExists(outputPath); err != nil {
		return err
	}

	// Merge first: MergeCreateFile reads every input once. A separate ReadContextFile
	// pass per input would double I/O and parse work on success paths (#53).
	config := model.NewDefaultConfiguration()
	err := api.MergeCreateFile(inputPaths, outputPath, false, config)
	if err != nil {
		// If merge failed, try per-input read to pinpoint a broken file (same UX as before).
		if diagErr := mergeDiagnoseInputs(inputPaths); diagErr != nil {
			return diagErr
		}
		if strings.Contains(err.Error(), "validateFontEncoding") || strings.Contains(err.Error(), "Encoding") {
			return fmt.Errorf("failed to merge PDFs due to font encoding issues: %w. One or more PDFs may have invalid font encoding (e.g., NULL encoding). Please try repairing the problematic PDF(s) before merging", err)
		}
		return fmt.Errorf("failed to merge PDFs: %w", err)
	}

	// Validate the merged file was created
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return fmt.Errorf("merged file was not created at: %s", outputPath)
	}

	return nil
}

// ImagesToPDF creates one PDF with one page per image, in the given order.
func (s *PDFService) ImagesToPDF(imagePaths []string, outputDirectory string, outputFilename string) error {
	if len(imagePaths) == 0 {
		return fmt.Errorf("no input images provided")
	}
	for i, path := range imagePaths {
		if path == "" {
			return fmt.Errorf("empty file path at index %d", i)
		}
		if err := validateImageFile(path); err != nil {
			return fmt.Errorf("input image %d: %w", i+1, err)
		}
	}
	if err := validateOutputDirectory(outputDirectory); err != nil {
		return err
	}
	if strings.TrimSpace(outputFilename) == "" {
		return fmt.Errorf("output filename cannot be empty")
	}

	outputPath := filepath.Join(outputDirectory, strings.TrimSpace(outputFilename)+PDFExtension)
	if err := removeIfExists(outputPath); err != nil {
		return err
	}

	// HEIC/HEIF: decode once to temp JPEG so pdfcpu uses its fast JPEG import path
	// instead of repeated HEIC decode via image.Decode in the PDF pipeline.
	pathsForImport, cleanup, err := resolveImagePathsForPDF(imagePaths)
	if err != nil {
		return err
	}
	defer cleanup()

	config := model.NewDefaultConfiguration()
	imp := pdfcpu.DefaultImportConfig()
	if err := api.ImportImagesFile(pathsForImport, outputPath, imp, config); err != nil {
		return fmt.Errorf("failed to create PDF from images: %w", err)
	}
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return fmt.Errorf("output file was not created at: %s", outputPath)
	}
	return nil
}

// SplitPDF splits the given PDF according to split definitions
func (s *PDFService) SplitPDF(inputPath string, splits []models.SplitDefinition, outputDirectory string) error {
	// Validate input file exists and is a PDF
	if err := validatePDFFile(inputPath); err != nil {
		return fmt.Errorf("input file: %w", err)
	}

	// Validate output directory exists and is writable
	if err := validateOutputDirectory(outputDirectory); err != nil {
		return err
	}

	// Single read+validate+optimize of the source (#57): reuse ctx for every segment
	// instead of calling api.TrimFile per split (each TrimFile reopens and reparses).
	config := model.NewDefaultConfiguration()
	config.Cmd = model.TRIM

	f, err := os.Open(inputPath)
	if err != nil {
		return fmt.Errorf("failed to open input PDF: %w", err)
	}
	defer f.Close()

	ctx, err := api.ReadValidateAndOptimize(f, config)
	if err != nil {
		return fmt.Errorf("failed to read PDF for split: %w", err)
	}
	totalPages := ctx.PageCount

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
		filename := strings.TrimSpace(split.Filename) + PDFExtension
		if filenameMap[filename] {
			return fmt.Errorf("duplicate filename: %s", filename)
		}
		filenameMap[filename] = true
	}

	// Process each split: extract from the shared in-memory context (same as api.Trim).
	for i, split := range splits {
		outputPath := filepath.Join(outputDirectory, strings.TrimSpace(split.Filename)+PDFExtension)

		if err := removeIfExists(outputPath); err != nil {
			return err
		}

		pageRange := fmt.Sprintf("%d-%d", split.StartPage, split.EndPage)
		pages, err := api.PagesForPageSelection(ctx.PageCount, []string{pageRange}, false, true)
		if err != nil {
			return fmt.Errorf("failed to trim pages for split %d (pages %d-%d): %w", i+1, split.StartPage, split.EndPage, err)
		}

		pageNrs := intSetToSortedPages(pages)
		if len(pageNrs) == 0 {
			return fmt.Errorf("split %d: no pages selected for range %s", i+1, pageRange)
		}

		ctxDest, err := pdfcpu.ExtractPages(ctx, pageNrs, false)
		if err != nil {
			return fmt.Errorf("failed to trim pages for split %d (pages %d-%d): %w", i+1, split.StartPage, split.EndPage, err)
		}

		if config.PostProcessValidate {
			if err := api.ValidateContext(ctxDest); err != nil {
				return fmt.Errorf("failed to trim pages for split %d (pages %d-%d): %w", i+1, split.StartPage, split.EndPage, err)
			}
		}

		if err := api.WriteContextFile(ctxDest, outputPath); err != nil {
			return fmt.Errorf("failed to write split %d (pages %d-%d): %w", i+1, split.StartPage, split.EndPage, err)
		}

		if _, err := os.Stat(outputPath); os.IsNotExist(err) {
			return fmt.Errorf("split file was not created at: %s", outputPath)
		}
	}

	return nil
}

// intSetToSortedPages converts pdfcpu's page selection set to sorted 1-based page numbers (same as api.Trim).
func intSetToSortedPages(pages types.IntSet) []int {
	var pageNrs []int
	for k, v := range pages {
		if v {
			pageNrs = append(pageNrs, k)
		}
	}
	sort.Ints(pageNrs)
	return pageNrs
}

// RotatePDF rotates specified page ranges in a PDF file
func (s *PDFService) RotatePDF(inputPath string, rotations []models.RotateDefinition, outputDirectory string, outputFilename string) error {
	// Validate input file exists and is a PDF
	if err := validatePDFFile(inputPath); err != nil {
		return fmt.Errorf("input file: %w", err)
	}

	// Validate output directory exists and is writable
	if err := validateOutputDirectory(outputDirectory); err != nil {
		return err
	}

	// Validate output filename
	if strings.TrimSpace(outputFilename) == "" {
		return fmt.Errorf("output filename cannot be empty")
	}

	// Get PDF page count for validation
	totalPages, err := s.fileService.GetPDFPageCount(inputPath)
	if err != nil {
		return fmt.Errorf("failed to get page count: %w", err)
	}

	// Validate all rotations
	for i, rotation := range rotations {
		if rotation.StartPage < 1 || rotation.StartPage > totalPages {
			return fmt.Errorf("rotation %d: start page %d is out of range (1-%d)", i+1, rotation.StartPage, totalPages)
		}
		if rotation.EndPage < rotation.StartPage || rotation.EndPage > totalPages {
			return fmt.Errorf("rotation %d: end page %d is invalid (must be >= start page and <= %d)", i+1, rotation.EndPage, totalPages)
		}
		// Validate rotation angle: 90, -90, or 180
		if rotation.Rotation != 90 && rotation.Rotation != -90 && rotation.Rotation != 180 {
			return fmt.Errorf("rotation %d: invalid rotation angle %d (must be 90, -90, or 180)", i+1, rotation.Rotation)
		}
	}

	// outputFilename from frontend does not include .pdf extension
	// Always append .pdf extension
	outputPath := filepath.Join(outputDirectory, outputFilename+PDFExtension)

	// Create a temporary copy of the input file for rotation operations
	// pdfcpu RotatePages modifies the file in place, so we need to work with a copy
	tempPath := outputPath + ".tmp"
	if err := copyFile(inputPath, tempPath); err != nil {
		return fmt.Errorf("failed to create temporary copy: %w", err)
	}
	defer os.Remove(tempPath) // Clean up temp file

	// Use pdfcpu to rotate pages
	config := model.NewDefaultConfiguration()

	// Process each rotation
	for i, rotation := range rotations {
		// Build page selection string (e.g., "1-5" for pages 1 to 5)
		pageSelection := fmt.Sprintf("%d-%d", rotation.StartPage, rotation.EndPage)

		// Rotate the pages
		// pdfcpu uses degrees, and RotateFile rotates the selected pages
		err := api.RotateFile(tempPath, "", rotation.Rotation, []string{pageSelection}, config)
		if err != nil {
			return fmt.Errorf("failed to rotate pages for rotation %d (pages %d-%d, angle %d): %w", i+1, rotation.StartPage, rotation.EndPage, rotation.Rotation, err)
		}
	}

	// Remove existing output file if it exists
	if err := removeIfExists(outputPath); err != nil {
		return err
	}

	// Move the temporary file to the final output location
	if err := os.Rename(tempPath, outputPath); err != nil {
		return fmt.Errorf("failed to move rotated file to output location: %w", err)
	}

	// Validate the rotated file was created
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return fmt.Errorf("rotated file was not created at: %s", outputPath)
	}

	return nil
}

// ApplyWatermark applies a text watermark to the specified PDF file
func (s *PDFService) ApplyWatermark(inputPath string, watermark models.WatermarkDefinition, outputDirectory string, outputFilename string) error {
	// Validate input file exists and is a PDF
	if err := validatePDFFile(inputPath); err != nil {
		return fmt.Errorf("input file: %w", err)
	}

	// Validate output directory exists and is writable
	if err := validateOutputDirectory(outputDirectory); err != nil {
		return err
	}

	// Validate output filename
	if strings.TrimSpace(outputFilename) == "" {
		return fmt.Errorf("output filename cannot be empty")
	}

	// Validate text watermark configuration
	if strings.TrimSpace(watermark.TextConfig.Text) == "" {
		return fmt.Errorf("watermark text cannot be empty")
	}
	if watermark.TextConfig.FontSize < 1 {
		return fmt.Errorf("font size must be at least 1")
	}
	if watermark.TextConfig.Opacity < 0.0 || watermark.TextConfig.Opacity > 1.0 {
		return fmt.Errorf("opacity must be between 0.0 and 1.0")
	}

	// Get PDF page count for validation
	totalPages, err := s.fileService.GetPDFPageCount(inputPath)
	if err != nil {
		return fmt.Errorf("failed to get page count: %w", err)
	}

	// Parse page range
	var pageSelection []string
	if watermark.PageRange == "all" {
		// Apply to all pages
		pageSelection = []string{"1-"}
	} else {
		// Parse specific page range (e.g., "1,3,5-10,15")
		pageSelection, err = parsePageRange(watermark.PageRange, totalPages)
		if err != nil {
			return fmt.Errorf("invalid page range: %w", err)
		}
	}

	// outputFilename from frontend does not include .pdf extension
	// Always append .pdf extension
	outputPath := filepath.Join(outputDirectory, outputFilename+PDFExtension)

	// Create a temporary copy of the input file for watermark operations
	tempPath := outputPath + ".tmp"
	if err := copyFile(inputPath, tempPath); err != nil {
		return fmt.Errorf("failed to create temporary copy: %w", err)
	}
	defer os.Remove(tempPath) // Clean up temp file

	// Use pdfcpu to add watermark
	config := model.NewDefaultConfiguration()

	// Convert position to pdfcpu anchor format
	anchor := convertPositionToAnchor(watermark.TextConfig.Position)

	// Parse color from hex string
	fillColor, err := parseColor(watermark.TextConfig.FontColor)
	if err != nil {
		return fmt.Errorf("invalid font color: %w", err)
	}

	// onTop=true => pdfcpu "stamp": paint after page content. onTop=false is a true under-content
	// watermark; opaque page backgrounds then hide the text entirely (looks like a no-op).
	wm, err := api.TextWatermark(watermark.TextConfig.Text, "", true, false, types.POINTS)
	if err != nil {
		return fmt.Errorf("failed to create watermark: %w", err)
	}

	// Default TextWatermark config forces diagonal layout and overrides rotation; UI exposes explicit rotation.
	wm.Diagonal = model.NoDiagonal

	// Default relative Scale (0.5) makes model.scaleFontSize derive an effective size from
	// page width × scale × FontSize / textWidth; text width scales with FontSize, so the
	// ratio largely cancels and the stamp looks the same for different UI font sizes.
	// Absolute scale 1 honors FontSize as points (see pdfcpu examples: "scale:1 abs").
	wm.ScaleAbs = true
	wm.Scale = 1.0

	// Customize the watermark with user settings
	wm.Pos = anchor
	wm.FontName = watermark.TextConfig.FontFamily
	wm.FontSize = watermark.TextConfig.FontSize
	wm.FillColor = fillColor
	wm.StrokeColor = fillColor
	wm.Color = fillColor
	wm.Rotation = float64(watermark.TextConfig.Rotation)
	wm.Opacity = watermark.TextConfig.Opacity

	// Apply watermark using pdfcpu's AddWatermarksFile
	err = api.AddWatermarksFile(tempPath, "", pageSelection, wm, config)
	if err != nil {
		return fmt.Errorf("failed to apply watermark: %w", err)
	}

	// Remove existing output file if it exists
	if err := removeIfExists(outputPath); err != nil {
		return err
	}

	// Move the temporary file to the final output location
	if err := os.Rename(tempPath, outputPath); err != nil {
		return fmt.Errorf("failed to move watermarked file to output location: %w", err)
	}

	// Validate the watermarked file was created
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return fmt.Errorf("watermarked file was not created at: %s", outputPath)
	}

	return nil
}

// parsePageRange parses a page range string like "1,3,5-10,15" into pdfcpu page selection format
func parsePageRange(pageRange string, totalPages int) ([]string, error) {
	if strings.TrimSpace(pageRange) == "" {
		return nil, fmt.Errorf("page range cannot be empty")
	}

	// Split by comma
	parts := strings.Split(pageRange, ",")
	var selections []string

	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		// Check if it's a range (contains "-")
		if strings.Contains(part, "-") {
			rangeParts := strings.Split(part, "-")
			if len(rangeParts) != 2 {
				return nil, fmt.Errorf("invalid page range format: %s", part)
			}

			startStr := strings.TrimSpace(rangeParts[0])
			endStr := strings.TrimSpace(rangeParts[1])

			var start, end int
			var err error

			if startStr == "" {
				return nil, fmt.Errorf("invalid page range: start page is empty")
			}
			start, err = parseInt(startStr)
			if err != nil {
				return nil, fmt.Errorf("invalid start page in range %s: %w", part, err)
			}

			if endStr == "" {
				// Open-ended range (e.g., "5-")
				end = totalPages
			} else {
				end, err = parseInt(endStr)
				if err != nil {
					return nil, fmt.Errorf("invalid end page in range %s: %w", part, err)
				}
			}

			// Validate range
			if start < 1 || start > totalPages {
				return nil, fmt.Errorf("start page %d is out of range (1-%d)", start, totalPages)
			}
			if end < start || end > totalPages {
				return nil, fmt.Errorf("end page %d is invalid (must be >= start page and <= %d)", end, totalPages)
			}

			selections = append(selections, fmt.Sprintf("%d-%d", start, end))
		} else {
			// Single page
			page, err := parseInt(part)
			if err != nil {
				return nil, fmt.Errorf("invalid page number %s: %w", part, err)
			}

			if page < 1 || page > totalPages {
				return nil, fmt.Errorf("page %d is out of range (1-%d)", page, totalPages)
			}

			selections = append(selections, fmt.Sprintf("%d", page))
		}
	}

	if len(selections) == 0 {
		return nil, fmt.Errorf("no valid pages in range")
	}

	return selections, nil
}

// parseInt parses a string to int.
func parseInt(s string) (int, error) {
	return strconv.Atoi(s)
}

// convertPositionToAnchor converts position string to pdfcpu anchor format
// pdfcpu anchors: tl, tc, tr, l, c, r, bl, bc, br
func convertPositionToAnchor(position string) types.Anchor {
	switch strings.ToLower(position) {
	case "center", "c":
		return types.Center
	case "top-left", "upper-left", "ul", "tl":
		return types.TopLeft
	case "top-right", "upper-right", "ur", "tr":
		return types.TopRight
	case "bottom-left", "lower-left", "ll", "bl":
		return types.BottomLeft
	case "bottom-right", "lower-right", "lr", "br":
		return types.BottomRight
	case "top-center", "upper-center", "tc":
		return types.TopCenter
	case "bottom-center", "lower-center", "bc":
		return types.BottomCenter
	case "middle-left", "l":
		return types.Left
	case "middle-right", "r":
		return types.Right
	default:
		return types.Center // Default to center
	}
}

// parseColor parses a hex color string (e.g., "#FF0000" or "FF0000") to color.SimpleColor
func parseColor(hexColor string) (color.SimpleColor, error) {
	// Remove # if present and trim
	hexColor = strings.TrimPrefix(hexColor, "#")
	hexColor = strings.TrimSpace(hexColor)

	// Default to black if empty
	if hexColor == "" {
		return color.Black, nil
	}

	// Use pdfcpu's built-in hex color parser
	// It expects format like "#RRGGBB" or "RRGGBB"
	if !strings.HasPrefix(hexColor, "#") {
		hexColor = "#" + hexColor
	}

	c, err := color.NewSimpleColorForHexCode(hexColor)
	if err != nil {
		return color.Black, fmt.Errorf("invalid hex color format: %w", err)
	}

	return c, nil
}

// mergeDiagnoseInputs runs ReadContextFile on each merge input to find the first
// file that fails to parse. Used only after MergeCreateFile fails so the common
// success path does not pay for a second full read of every input.
func mergeDiagnoseInputs(inputPaths []string) error {
	for i, path := range inputPaths {
		_, err := api.ReadContextFile(path)
		if err != nil {
			filename := filepath.Base(path)
			return fmt.Errorf("PDF file %d (%s) has issues and cannot be processed: %w. This file may have invalid font encoding or be corrupted. Please try repairing the PDF or use a different file", i+1, filename, err)
		}
	}
	return nil
}

// removeIfExists removes a file if it exists, returning an error only if removal fails
// (#56) Use Remove directly; skip the extra Stat syscall when the file is absent.
func removeIfExists(path string) error {
	if err := os.Remove(path); err != nil && !errors.Is(err, fs.ErrNotExist) {
		return fmt.Errorf("failed to remove existing file: %w", err)
	}
	return nil
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	sourceFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	destFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destFile.Close()

	_, err = destFile.ReadFrom(sourceFile)
	return err
}
