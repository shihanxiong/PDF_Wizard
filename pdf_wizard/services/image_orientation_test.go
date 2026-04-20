package services

import (
	"os"
	"path/filepath"
	"testing"
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
