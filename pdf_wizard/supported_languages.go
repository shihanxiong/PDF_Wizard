package main

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
)

//go:embed i18n/supported-languages.json
var supportedLanguagesJSON []byte

type supportedLanguagesConfig struct {
	Default   string   `json:"default"`
	Languages []string `json:"languages"`
}

// SupportedLanguageCodes is the ordered list of locale codes from i18n/supported-languages.json.
var SupportedLanguageCodes []string

// validLanguages is the set of supported locale codes for config validation.
var validLanguages map[string]bool

// defaultLanguage is the fallback locale when config is missing or invalid.
var defaultLanguage string

func init() {
	cfg, err := parseSupportedLanguagesConfig(supportedLanguagesJSON)
	if err != nil {
		panic(fmt.Sprintf("supported languages: %v", err))
	}
	SupportedLanguageCodes = cfg.Languages
	defaultLanguage = cfg.Default
	validLanguages = make(map[string]bool, len(cfg.Languages))
	for _, code := range cfg.Languages {
		validLanguages[code] = true
	}
}

func parseSupportedLanguagesConfig(data []byte) (*supportedLanguagesConfig, error) {
	var cfg supportedLanguagesConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	if len(cfg.Languages) == 0 {
		return nil, fmt.Errorf("languages list is empty")
	}
	seen := make(map[string]bool, len(cfg.Languages))
	for _, code := range cfg.Languages {
		code = strings.TrimSpace(code)
		if code == "" {
			return nil, fmt.Errorf("language code cannot be empty")
		}
		if seen[code] {
			return nil, fmt.Errorf("duplicate language code: %s", code)
		}
		seen[code] = true
	}
	if strings.TrimSpace(cfg.Default) == "" {
		return nil, fmt.Errorf("default language is required")
	}
	if !seen[cfg.Default] {
		return nil, fmt.Errorf("default language %q is not in languages list", cfg.Default)
	}
	return &cfg, nil
}
