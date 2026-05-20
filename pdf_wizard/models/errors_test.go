package models

import (
	"encoding/json"
	"errors"
	"testing"
)

func TestPDFError_Error_ReturnsJSON(t *testing.T) {
	pe := NewPDFError(ErrCodeFontEncoding, "bad font", nil)
	raw := pe.Error()

	var parsed struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}
	if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
		t.Fatalf("Error() did not return valid JSON: %v", err)
	}
	if parsed.Code != string(ErrCodeFontEncoding) {
		t.Errorf("code = %q; want %q", parsed.Code, ErrCodeFontEncoding)
	}
	if parsed.Message != "bad font" {
		t.Errorf("message = %q; want %q", parsed.Message, "bad font")
	}
}

func TestPDFError_Unwrap(t *testing.T) {
	cause := errors.New("root cause")
	pe := NewPDFError(ErrCodeIOError, "io failed", cause)
	if !errors.Is(pe, cause) {
		t.Error("errors.Is should find the wrapped cause")
	}
}

func TestPDFError_Unwrap_NilCause(t *testing.T) {
	pe := NewPDFError(ErrCodeUnknown, "no cause", nil)
	if pe.Unwrap() != nil {
		t.Error("Unwrap should return nil when cause is nil")
	}
}

func TestPDFError_ImplementsError(t *testing.T) {
	var err error = NewPDFError(ErrCodePasswordRequired, "need pw", nil)
	if err == nil {
		t.Fatal("PDFError should satisfy error interface")
	}
}

func TestPDFError_AllCodes(t *testing.T) {
	codes := []PDFErrorCode{
		ErrCodeFontEncoding,
		ErrCodePasswordRequired,
		ErrCodeFileCorrupted,
		ErrCodeInvalidInput,
		ErrCodeIOError,
		ErrCodeUnknown,
	}
	for _, code := range codes {
		pe := NewPDFError(code, "test", nil)
		var parsed struct {
			Code string `json:"code"`
		}
		if err := json.Unmarshal([]byte(pe.Error()), &parsed); err != nil {
			t.Errorf("code %s: invalid JSON: %v", code, err)
			continue
		}
		if parsed.Code != string(code) {
			t.Errorf("code = %q; want %q", parsed.Code, code)
		}
	}
}

func TestPDFError_ErrorsAs(t *testing.T) {
	pe := NewPDFError(ErrCodeFileCorrupted, "corrupt", errors.New("inner"))
	var target *PDFError
	if !errors.As(pe, &target) {
		t.Fatal("errors.As should find *PDFError")
	}
	if target.Code != ErrCodeFileCorrupted {
		t.Errorf("code = %q; want %q", target.Code, ErrCodeFileCorrupted)
	}
}
