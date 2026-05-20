package models

import "encoding/json"

// PDFErrorCode represents a stable, machine-readable error category
// that the frontend can branch on without parsing message strings.
type PDFErrorCode string

const (
ErrCodeFontEncoding     PDFErrorCode = "FONT_ENCODING"
ErrCodePasswordRequired PDFErrorCode = "PASSWORD_REQUIRED"
ErrCodeFileCorrupted    PDFErrorCode = "FILE_CORRUPTED"
ErrCodeInvalidInput     PDFErrorCode = "INVALID_INPUT"
ErrCodeIOError          PDFErrorCode = "IO_ERROR"
ErrCodeUnknown          PDFErrorCode = "UNKNOWN"
)

// PDFError is a structured error that serializes as JSON over the Wails boundary.
type PDFError struct {
Code    PDFErrorCode `json:"code"`
Message string       `json:"message"`
Cause   error        `json:"-"`
}

// Error implements the error interface with JSON serialization.
func (e *PDFError) Error() string {
b, _ := json.Marshal(struct {
Code    PDFErrorCode `json:"code"`
Message string       `json:"message"`
}{
Code:    e.Code,
Message: e.Message,
})
return string(b)
}

// Unwrap supports errors.Is/As on the underlying cause.
func (e *PDFError) Unwrap() error {
return e.Cause
}

// NewPDFError creates a PDFError with the given code, message, and optional cause.
func NewPDFError(code PDFErrorCode, message string, cause error) *PDFError {
return &PDFError{
Code:    code,
Message: message,
Cause:   cause,
}
}
