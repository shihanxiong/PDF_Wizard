package services

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

// BenchmarkNormalizeRasterOrientation_identityJPEGs measures normalize on many
// EXIF orientation=1 JPEGs (fast path: no temp re-encode).
func BenchmarkNormalizeRasterOrientation_identityJPEGs(b *testing.B) {
	src := filepath.Join("testdata", "jpeg_exif_orientation_1.jpg")
	body, err := os.ReadFile(src)
	if err != nil {
		b.Fatal(err)
	}
	dir := b.TempDir()
	const n = 32
	paths := make([]string, n)
	for i := 0; i < n; i++ {
		p := filepath.Join(dir, fmt.Sprintf("id_%02d.jpg", i))
		if err := os.WriteFile(p, body, 0o644); err != nil {
			b.Fatal(err)
		}
		paths[i] = p
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for _, p := range paths {
			out, created, err := normalizeRasterOrientation(p)
			if err != nil {
				b.Fatal(err)
			}
			if created || out != p {
				b.Fatalf("expected fast path: created=%v path=%q", created, p)
			}
		}
	}
}
