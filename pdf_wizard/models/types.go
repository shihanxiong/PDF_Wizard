package models

// PDFMetadata represents file information including PDF metadata
type PDFMetadata struct {
	Path         string `json:"path"`
	Name         string `json:"name"`
	Size         int64  `json:"size"`         // bytes
	LastModified string `json:"lastModified"` // ISO 8601 format
	IsPDF        bool   `json:"isPDF"`
	TotalPages   int    `json:"totalPages"` // Total number of pages (0 for non-PDF files or when not needed)
}

// SplitDefinition represents a split configuration
type SplitDefinition struct {
	StartPage int    `json:"startPage"` // 1-based page number
	EndPage   int    `json:"endPage"`   // 1-based page number (inclusive)
	Filename  string `json:"filename"`  // Filename without .pdf extension
}

// RotateDefinition represents a rotation configuration for a page range
type RotateDefinition struct {
	StartPage int `json:"startPage"` // 1-based page number
	EndPage   int `json:"endPage"`   // 1-based page number (inclusive)
	Rotation  int `json:"rotation"`  // Rotation angle: 90, -90, or 180
}

// WatermarkDefinition represents a watermark configuration
type WatermarkDefinition struct {
	TextConfig TextWatermarkConfig `json:"textConfig"`
	PageRange  string              `json:"pageRange"` // "all" or page range string like "1,3,5-10"
}

// TextWatermarkConfig represents text watermark configuration
type TextWatermarkConfig struct {
	Text       string  `json:"text"`
	FontSize   int     `json:"fontSize"`
	FontColor  string  `json:"fontColor"` // Hex color code
	Opacity    float64 `json:"opacity"`   // 0.0-1.0
	Rotation   int     `json:"rotation"`  // Degrees
	Position   string  `json:"position"`  // "center", "top-left", etc.
	FontFamily string  `json:"fontFamily"`
}
