package services

import (
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/ledongthuc/pdf"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
)

// ExtractPDFText extracts human-readable text from a PDF file path.
// password is optional; when the PDF is encrypted, it is tried after an empty owner password attempt.
// Strong encryption (for example AES-256 from Lock PDF) is handled by decrypting via pdfcpu to a
// temporary file, then extracting with the text parser.
// Layout is approximated using row grouping when the underlying parser succeeds; otherwise plain text per page is used.
func (s *PDFService) ExtractPDFText(path string, password string) (string, error) {
	if err := validatePDFFile(path); err != nil {
		return "", err
	}

	pw := strings.TrimSpace(password)
	text, err := extractPDFTextWithLedongFile(path, pw)
	if err == nil {
		return text, nil
	}

	tmp, derr := writeDecryptedPDFTempCopy(path, pw)
	if derr != nil {
		if strings.Contains(strings.ToLower(derr.Error()), "not encrypted") {
			return "", mapLedongExtractError(err)
		}
		return "", mapDecryptExtractError(derr)
	}
	defer func() { _ = os.Remove(tmp) }()

	text2, err2 := extractPDFTextWithLedongFile(tmp, "")
	if err2 != nil {
		return "", mapLedongExtractError(err2)
	}
	return text2, nil
}

func mapLedongExtractError(err error) error {
	if errors.Is(err, pdf.ErrInvalidPassword) {
		return fmt.Errorf("incorrect or missing PDF password")
	}
	return fmt.Errorf("read PDF: %w", err)
}

func mapDecryptExtractError(err error) error {
	// pdfcpu returns decryption / permission failures when the password is wrong.
	return fmt.Errorf("could not decrypt PDF for text extraction: %w", err)
}

func writeDecryptedPDFTempCopy(path, password string) (tmpPath string, err error) {
	f, err := os.CreateTemp("", "pdfwiz-decrypt-*.pdf")
	if err != nil {
		return "", err
	}
	tmpPath = f.Name()
	if err := f.Close(); err != nil {
		return "", err
	}

	conf := model.NewDefaultConfiguration()
	conf.UserPW = password
	conf.OwnerPW = password
	if err := api.DecryptFile(path, tmpPath, conf); err != nil {
		_ = os.Remove(tmpPath)
		return "", err
	}
	return tmpPath, nil
}

func extractPDFTextWithLedongFile(path, password string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open PDF: %w", err)
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		return "", fmt.Errorf("stat PDF: %w", err)
	}

	attempts := 0
	r, err := pdf.NewReaderEncrypted(f, fi.Size(), func() string {
		attempts++
		if attempts == 1 {
			return password
		}
		return ""
	})
	if err != nil {
		if errors.Is(err, pdf.ErrInvalidPassword) {
			return "", pdf.ErrInvalidPassword
		}
		return "", err
	}

	return extractTextFromLedongReader(r)
}

func extractTextFromLedongReader(r *pdf.Reader) (string, error) {
	var out strings.Builder
	n := r.NumPage()
	for i := 1; i <= n; i++ {
		if i > 1 {
			out.WriteString("\n\n")
		}
		p := r.Page(i)
		if p.V.IsNull() || p.V.Key("Contents").Kind() == pdf.Null {
			continue
		}

		chunk, chunkErr := extractPageTextPreferRows(p)
		if chunkErr != nil {
			return "", fmt.Errorf("extract text page %d: %w", i, chunkErr)
		}
		out.WriteString(strings.TrimRight(chunk, "\n"))
	}

	return strings.TrimSpace(out.String()), nil
}

func extractPageTextPreferRows(p pdf.Page) (string, error) {
	rows, rowErr := p.GetTextByRow()
	if rowErr == nil && len(rows) > 0 {
		var page strings.Builder
		for ri, row := range rows {
			if ri > 0 {
				page.WriteByte('\n')
			}
			parts := make([]string, 0, len(row.Content))
			for _, word := range row.Content {
				if s := strings.TrimSpace(word.S); s != "" {
					parts = append(parts, s)
				}
			}
			page.WriteString(strings.Join(parts, " "))
		}
		return page.String(), nil
	}

	fonts := make(map[string]*pdf.Font)
	for _, name := range p.Fonts() {
		ff := p.Font(name)
		fonts[name] = &ff
	}
	text, err2 := p.GetPlainText(fonts)
	if err2 != nil {
		if rowErr != nil {
			return "", rowErr
		}
		return "", err2
	}
	return text, nil
}
