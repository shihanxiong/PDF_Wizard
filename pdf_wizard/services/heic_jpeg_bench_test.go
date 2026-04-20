package services

import (
	_ "embed"
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

//go:embed testdata/sample.heic
var benchSampleHEIC []byte

// BenchmarkResolveImagePathsForPDF_workers1 simulates sequential prep (concurrency cap 1).
func BenchmarkResolveImagePathsForPDF_workers1(b *testing.B) {
	benchmarkResolveImagePathsWorkers(b, 1)
}

// BenchmarkResolveImagePathsForPDF_workers4 uses up to four concurrent HEIC→JPEG+normalize steps.
func BenchmarkResolveImagePathsForPDF_workers4(b *testing.B) {
	benchmarkResolveImagePathsWorkers(b, 4)
}

func benchmarkResolveImagePathsWorkers(b *testing.B, workers int) {
	b.Helper()
	if len(benchSampleHEIC) == 0 {
		b.Skip("no embedded HEIC sample")
	}
	dir := b.TempDir()
	const n = 8
	paths := make([]string, n)
	for i := 0; i < n; i++ {
		p := filepath.Join(dir, fmt.Sprintf("copy%d.heic", i))
		if err := os.WriteFile(p, benchSampleHEIC, 0o644); err != nil {
			b.Fatal(err)
		}
		paths[i] = p
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		resolved, cleanup, err := resolveImagePathsForPDFWithWorkerCap(paths, workers)
		if err != nil {
			b.Fatal(err)
		}
		cleanup()
		_ = resolved
	}
}
