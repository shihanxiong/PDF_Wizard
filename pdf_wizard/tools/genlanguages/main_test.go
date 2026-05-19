package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoadConfig(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "supported-languages.json")
	if err := os.WriteFile(path, []byte(`{"default":"en","languages":["en","de"]}`), 0o644); err != nil {
		t.Fatal(err)
	}

	cfg, err := loadConfig(path)
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Default != "en" || len(cfg.Languages) != 2 {
		t.Fatalf("unexpected config: %+v", cfg)
	}
}

func TestLoadConfig_rejectsDuplicate(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "dup.json")
	if err := os.WriteFile(path, []byte(`{"default":"en","languages":["en","en"]}`), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := loadConfig(path); err == nil {
		t.Fatal("expected duplicate error")
	}
}

func TestRenderTS_containsUnion(t *testing.T) {
	t.Parallel()

	out := renderTS(&config{Default: "en", Languages: []string{"en", "zh-TW"}})
	if !strings.Contains(out, `"zh-TW"`) || !strings.Contains(out, "SupportedLanguageCode") {
		t.Fatalf("unexpected ts output: %s", out)
	}
}
