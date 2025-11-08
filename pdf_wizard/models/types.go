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
