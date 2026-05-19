package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestValidLanguagesMatchesSupportedLanguagesJSON(t *testing.T) {
	t.Parallel()

	path := filepath.Join("i18n", "supported-languages.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	var cfg struct {
		Languages []string `json:"languages"`
	}
	if err := json.Unmarshal(data, &cfg); err != nil {
		t.Fatal(err)
	}

	if len(validLanguages) != len(cfg.Languages) {
		t.Fatalf("validLanguages has %d entries, json has %d", len(validLanguages), len(cfg.Languages))
	}
	for _, code := range cfg.Languages {
		if !validLanguages[code] {
			t.Fatalf("validLanguages missing %q from json", code)
		}
	}
	if len(SupportedLanguageCodes) != len(cfg.Languages) {
		t.Fatalf("SupportedLanguageCodes length %d != json %d", len(SupportedLanguageCodes), len(cfg.Languages))
	}
}
