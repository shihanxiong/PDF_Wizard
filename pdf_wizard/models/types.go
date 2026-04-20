package models

// FileDialogLabels carries user-visible strings for native file/folder dialogs.
// The frontend sets these from i18n; empty fields fall back to English defaults in FileService.
type FileDialogLabels struct {
	Title             string `json:"title"`
	FilterDisplayName string `json:"filterDisplayName"` // file pickers only; optional
}

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

// PhoneUploadPageCopy is translated text for the LAN phone upload HTML pages.
// The frontend fills this from useI18n so the phone browser matches the app language.
type PhoneUploadPageCopy struct {
	Lang        string `json:"lang"`        // BCP 47 tag, e.g. en, zh, zh-TW
	Dir         string `json:"dir"`         // "ltr" or "rtl"
	Title       string `json:"title"`       // document <title>
	Heading     string `json:"heading"`     // main heading (usually app title)
	Intro       string `json:"intro"`       // paragraph under heading
	PhotosLabel string `json:"photosLabel"` // label above file input
	ChooseFiles string `json:"chooseFiles"` // label for file picker (styled as primary button)
	Upload      string `json:"upload"`      // submit button
	DoneTitle   string `json:"doneTitle"`   // success primary line
	DoneBody    string `json:"doneBody"`    // success secondary line
	NoFiles     string `json:"noFiles"`     // error when POST has no files
	Retry       string `json:"retry"`       // link label to return to upload form
	// SelectedCountLine must contain "__COUNT__"; phone JS replaces it with the number of files chosen.
	SelectedCountLine string `json:"selectedCountLine"`
	// TooManyFiles is the full message (frontend replaces "__MAX__" with the session limit, e.g. 25).
	TooManyFiles string `json:"tooManyFiles"`
	// SessionClosedTitle/Body are shown if the user opens the upload URL again after a successful upload (e.g. back button).
	SessionClosedTitle string `json:"sessionClosedTitle"`
	SessionClosedBody  string `json:"sessionClosedBody"`
}
