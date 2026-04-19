package services

import (
	"fmt"
	"image/jpeg"
	"os"
	"path/filepath"
	"strings"

	"github.com/gen2brain/heic"
)

func isHEICOrHEIF(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".heic", ".heif":
		return true
	default:
		return false
	}
}

// heicToJPEGTempFile decodes one HEIC/HEIF file and writes a temporary JPEG.
// The caller must remove the returned path when done.
func heicToJPEGTempFile(srcPath string) (string, error) {
	f, err := os.Open(srcPath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	img, err := heic.Decode(f)
	if err != nil {
		return "", fmt.Errorf("decode HEIC: %w", err)
	}

	out, err := os.CreateTemp("", "pdfwizard-heic-*.jpg")
	if err != nil {
		return "", err
	}
	tmpPath := out.Name()

	if err := jpeg.Encode(out, img, &jpeg.Options{Quality: 88}); err != nil {
		out.Close()
		_ = os.Remove(tmpPath)
		return "", fmt.Errorf("encode JPEG: %w", err)
	}
	if err := out.Close(); err != nil {
		_ = os.Remove(tmpPath)
		return "", err
	}
	return tmpPath, nil
}

// resolveImagePathsForPDF returns paths suitable for pdfcpu ImportImagesFile.
// HEIC/HEIF inputs are converted to temporary JPEGs (faster pdfcpu path); temps must be removed via cleanup.
// JPEG/PNG/GIF/TIFF/BMP are passed through imaging with EXIF orientation applied so phone photos match
// on-screen orientation when imported into the PDF (pdfcpu does not apply EXIF alone).
func resolveImagePathsForPDF(imagePaths []string) (resolved []string, cleanup func(), err error) {
	var temps []string
	cleanup = func() {
		for _, p := range temps {
			_ = os.Remove(p)
		}
	}

	resolved = make([]string, 0, len(imagePaths))
	for _, p := range imagePaths {
		path := p
		if isHEICOrHEIF(path) {
			jpg, convErr := heicToJPEGTempFile(path)
			if convErr != nil {
				cleanup()
				return nil, nil, fmt.Errorf("%s: %w", filepath.Base(path), convErr)
			}
			temps = append(temps, jpg)
			path = jpg
		}
		out, created, normErr := normalizeRasterOrientation(path)
		if normErr != nil {
			cleanup()
			return nil, nil, normErr
		}
		if created {
			temps = append(temps, out)
		}
		resolved = append(resolved, out)
	}
	return resolved, cleanup, nil
}
