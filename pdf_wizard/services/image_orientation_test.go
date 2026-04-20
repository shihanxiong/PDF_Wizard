package services

import (
	"image"
	"image/color"
	"image/draw"
	"os"
	"path/filepath"
	"testing"

	"github.com/disintegration/imaging"
)

func TestNormalizeRasterOrientation_webPUnchanged(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "x.webp")
	if err := os.WriteFile(p, []byte("RIFF"), 0o644); err != nil {
		t.Fatal(err)
	}
	out, created, err := normalizeRasterOrientation(p)
	if err != nil {
		t.Fatal(err)
	}
	if created || out != p {
		t.Fatalf("webp should pass through unchanged: created=%v out=%q", created, out)
	}
}

func TestNormalizeRasterOrientation_jpegEXIF1_skipsReencode(t *testing.T) {
	src := filepath.Join("testdata", "jpeg_exif_orientation_1.jpg")
	out, created, err := normalizeRasterOrientation(src)
	if err != nil {
		t.Fatal(err)
	}
	if created || out != src {
		t.Fatalf("orientation 1 JPEG should stay in place: created=%v out=%q", created, out)
	}
}

func TestNormalizeRasterOrientation_jpegEXIF6_reencodes(t *testing.T) {
	src := filepath.Join("testdata", "jpeg_exif_orientation_6.jpg")
	out, created, err := normalizeRasterOrientation(src)
	if err != nil {
		t.Fatal(err)
	}
	if !created || out == src {
		t.Fatalf("orientation 6 JPEG should produce temp: created=%v out=%q", created, out)
	}
	defer func() { _ = os.Remove(out) }()

	img, err := imaging.Open(out)
	if err != nil {
		t.Fatal(err)
	}
	if img.Bounds().Dx() >= img.Bounds().Dy() {
		t.Fatalf("expected portrait output after rotate (height > width), got bounds %v", img.Bounds())
	}
}

func TestNormalizeRasterOrientation_jpegNoEXIF_skipsReencode(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "plain.jpg")
	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	draw.Draw(img, img.Bounds(), &image.Uniform{color.RGBA{R: 10, G: 20, B: 30, A: 255}}, image.Point{}, draw.Src)
	if err := imaging.Save(img, p); err != nil {
		t.Fatal(err)
	}
	out, created, err := normalizeRasterOrientation(p)
	if err != nil {
		t.Fatal(err)
	}
	if created || out != p {
		t.Fatalf("JPEG without EXIF orientation should skip temp: created=%v out=%q", created, out)
	}
}
