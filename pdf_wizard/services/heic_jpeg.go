package services

import (
	"context"
	"fmt"
	"image/jpeg"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/gen2brain/heic"
	"golang.org/x/sync/errgroup"
)

// defaultImagePrepMaxWorkers bounds concurrent HEIC decode + orientation normalization.
// Each worker may hold one decoded image in memory (HEIC → RGB, then JPEG encode).
const defaultImagePrepMaxWorkers = 4

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

func imagePrepWorkerLimit(n, maxWorkers int) int {
	if n < 1 {
		return 1
	}
	if maxWorkers < 1 {
		maxWorkers = 1
	}
	if n < maxWorkers {
		return n
	}
	return maxWorkers
}

// resolveImagePathsForPDF returns paths suitable for pdfcpu ImportImagesFile.
// HEIC/HEIF inputs are converted to temporary JPEGs (faster pdfcpu path); temps must be removed via cleanup.
// JPEG/PNG/GIF/TIFF/BMP are passed through imaging with EXIF orientation applied so phone photos match
// on-screen orientation when imported into the PDF (pdfcpu does not apply EXIF alone).
// Up to defaultImagePrepMaxWorkers goroutines process inputs in parallel while preserving input order in resolved.
func resolveImagePathsForPDF(imagePaths []string) (resolved []string, cleanup func(), err error) {
	return resolveImagePathsForPDFWithWorkerCap(imagePaths, defaultImagePrepMaxWorkers)
}

// resolveImagePathsForPDFWithWorkerCap is like resolveImagePathsForPDF but caps errgroup concurrency (tests/benchmarks).
func resolveImagePathsForPDFWithWorkerCap(imagePaths []string, maxWorkers int) (resolved []string, cleanup func(), err error) {
	n := len(imagePaths)
	var allTemps []string
	var tempsMu sync.Mutex
	addTemp := func(p string) {
		tempsMu.Lock()
		allTemps = append(allTemps, p)
		tempsMu.Unlock()
	}
	cleanup = func() {
		tempsMu.Lock()
		defer tempsMu.Unlock()
		for _, p := range allTemps {
			_ = os.Remove(p)
		}
	}

	if n == 0 {
		return []string{}, cleanup, nil
	}

	resolved = make([]string, n)
	g, _ := errgroup.WithContext(context.Background())
	g.SetLimit(imagePrepWorkerLimit(n, maxWorkers))

	for i, p := range imagePaths {
		i, p := i, p
		g.Go(func() error {
			path := p
			if isHEICOrHEIF(path) {
				jpg, convErr := heicToJPEGTempFile(path)
				if convErr != nil {
					return fmt.Errorf("%s: %w", filepath.Base(path), convErr)
				}
				addTemp(jpg)
				path = jpg
			}
			out, created, normErr := normalizeRasterOrientation(path)
			if normErr != nil {
				return normErr
			}
			if created {
				addTemp(out)
			}
			resolved[i] = out
			return nil
		})
	}

	if err := g.Wait(); err != nil {
		cleanup()
		return nil, nil, err
	}
	return resolved, cleanup, nil
}
