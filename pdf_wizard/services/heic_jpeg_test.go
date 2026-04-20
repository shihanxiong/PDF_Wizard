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

func writeSolidBMP(t *testing.T, path string, c color.RGBA) {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 8, 8))
	draw.Draw(img, img.Bounds(), &image.Uniform{c}, image.Point{}, draw.Src)
	if err := imaging.Save(img, path); err != nil {
		t.Fatal(err)
	}
}

func assertTopLeftPixel(t *testing.T, path string, want color.RGBA) {
	t.Helper()
	img, err := imaging.Open(path)
	if err != nil {
		t.Fatalf("open %q: %v", path, err)
	}
	got := color.NRGBAModel.Convert(img.At(0, 0)).(color.NRGBA)
	wantN := color.NRGBAModel.Convert(want).(color.NRGBA)
	if got != wantN {
		t.Fatalf("pixel mismatch for %q: got %+v want %+v", path, got, wantN)
	}
}

func TestResolveImagePathsForPDF_preservesInputOrder(t *testing.T) {
	dir := t.TempDir()
	p0 := filepath.Join(dir, "a.bmp")
	p1 := filepath.Join(dir, "b.bmp")
	p2 := filepath.Join(dir, "c.bmp")
	writeSolidBMP(t, p0, color.RGBA{R: 255, G: 0, B: 0, A: 255})
	writeSolidBMP(t, p1, color.RGBA{R: 0, G: 255, B: 0, A: 255})
	writeSolidBMP(t, p2, color.RGBA{R: 0, G: 0, B: 255, A: 255})

	out, cleanup, err := resolveImagePathsForPDF([]string{p0, p1, p2})
	if err != nil {
		t.Fatal(err)
	}
	defer cleanup()
	if len(out) != 3 {
		t.Fatalf("len out: %d", len(out))
	}
	assertTopLeftPixel(t, out[0], color.RGBA{R: 255, G: 0, B: 0, A: 255})
	assertTopLeftPixel(t, out[1], color.RGBA{R: 0, G: 255, B: 0, A: 255})
	assertTopLeftPixel(t, out[2], color.RGBA{R: 0, G: 0, B: 255, A: 255})
}

func TestResolveImagePathsForPDF_cleanupOnHEICDecodeError(t *testing.T) {
	dir := t.TempDir()
	badHEIC := filepath.Join(dir, "bad.heic")
	if err := os.WriteFile(badHEIC, []byte("not a heic"), 0o644); err != nil {
		t.Fatal(err)
	}
	goodPNG := filepath.Join(dir, "ok.png")
	writeTestPNG(t, goodPNG)

	_, cleanup, err := resolveImagePathsForPDF([]string{goodPNG, badHEIC})
	if err == nil {
		t.Fatal("expected error from invalid HEIC")
	}
	if cleanup != nil {
		t.Fatal("expected nil cleanup on error (internal cleanup already ran)")
	}
}
