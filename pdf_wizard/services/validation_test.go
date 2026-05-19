package services

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestSanitizeOutputBasename(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "simple", input: "merged", want: "merged"},
		{name: "trim space", input: "  report  ", want: "report"},
		{name: "empty", input: "", wantErr: true},
		{name: "whitespace only", input: "   ", wantErr: true},
		{name: "dot", input: ".", wantErr: true},
		{name: "dotdot", input: "..", wantErr: true},
		{name: "unix traversal", input: "../../etc/passwd", wantErr: true},
		{name: "unix subpath", input: "foo/bar", wantErr: true},
		{name: "backslash", input: "foo\\bar", wantErr: true},
		{name: "leading dot segment", input: "./out", wantErr: true},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := sanitizeOutputBasename(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("sanitizeOutputBasename(%q) expected error", tt.input)
				}
				return
			}
			if err != nil {
				t.Fatalf("sanitizeOutputBasename(%q): %v", tt.input, err)
			}
			if got != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestResolveOutputPDFPath_staysInDirectory(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	sub := filepath.Join(dir, "out")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatal(err)
	}

	out, err := resolveOutputPDFPath(sub, "report")
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(sub, "report"+PDFExtension)
	if out != want {
		t.Fatalf("got %q, want %q", out, want)
	}

	absDir, _ := filepath.Abs(sub)
	absOut, _ := filepath.Abs(out)
	if !strings.HasPrefix(absOut, absDir+string(filepath.Separator)) {
		t.Fatalf("output %q not under %q", absOut, absDir)
	}
}

func TestResolveOutputPDFPath_rejectsUnsafeNames(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	_, err := resolveOutputPDFPath(dir, "../escape")
	if err == nil {
		t.Fatal("expected error for path traversal basename")
	}
}
