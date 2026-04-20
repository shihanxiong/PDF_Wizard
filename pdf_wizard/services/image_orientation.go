package services

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/disintegration/imaging"
)

// normalizeRasterOrientation decodes the image with EXIF orientation applied (so pixels match
// how the photo appears on a phone). WebP and formats not handled by imaging are returned unchanged.
// If a new temp file is created, ok is true and the caller must delete outPath.
func normalizeRasterOrientation(path string) (outPath string, ok bool, err error) {
	ext := strings.ToLower(filepath.Ext(path))
	if ext == ".webp" {
		return path, false, nil
	}
	if _, ferr := imaging.FormatFromFilename(path); ferr != nil {
		return path, false, nil
	}

	// JPEG fast path: skip decode/re-encode when EXIF orientation is missing or 1 (normal),
	// matching imaging.AutoOrientation behavior for “already upright” pixels.
	if ext == ".jpg" || ext == ".jpeg" {
		f, err := os.Open(path)
		if err == nil {
			o, isJPEG := readJPEGExifOrientation(f)
			_ = f.Close()
			if isJPEG && (o == 0 || o == 1) {
				return path, false, nil
			}
		}
	}

	img, err := imaging.Open(path, imaging.AutoOrientation(true))
	if err != nil {
		return path, false, nil
	}

	f, err := os.CreateTemp("", "pdfwizard-oriented-*"+ext)
	if err != nil {
		return "", false, err
	}
	tmpPath := f.Name()
	if err := f.Close(); err != nil {
		return "", false, err
	}

	var saveOpts []imaging.EncodeOption
	if ext == ".jpg" || ext == ".jpeg" {
		saveOpts = append(saveOpts, imaging.JPEGQuality(92))
	}
	if saveErr := imaging.Save(img, tmpPath, saveOpts...); saveErr != nil {
		_ = os.Remove(tmpPath)
		return "", false, fmt.Errorf("save oriented image: %w", saveErr)
	}
	return tmpPath, true, nil
}
