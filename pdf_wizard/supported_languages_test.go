package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSupportedLanguagesFromEmbeddedJSON(t *testing.T) {
	t.Parallel()

	data, err := os.ReadFile(filepath.Join("i18n", "supported-languages.json"))
	if err != nil {
		t.Fatal(err)
	}
	cfg, err := parseSupportedLanguagesConfig(data)
	if err != nil {
		t.Fatal(err)
	}

	if defaultLanguage != cfg.Default {
		t.Fatalf("defaultLanguage %q != json %q", defaultLanguage, cfg.Default)
	}
	if len(validLanguages) != len(cfg.Languages) {
		t.Fatalf("validLanguages has %d entries, json has %d", len(validLanguages), len(cfg.Languages))
	}
	for _, code := range cfg.Languages {
		if !validLanguages[code] {
			t.Fatalf("validLanguages missing %q", code)
		}
	}
	if len(SupportedLanguageCodes) != len(cfg.Languages) {
		t.Fatalf("SupportedLanguageCodes length %d != json %d", len(SupportedLanguageCodes), len(cfg.Languages))
	}
}

func TestParseSupportedLanguagesConfig_rejectsDuplicate(t *testing.T) {
	t.Parallel()

	_, err := parseSupportedLanguagesConfig([]byte(`{"default":"en","languages":["en","en"]}`))
	if err == nil {
		t.Fatal("expected duplicate error")
	}
}
