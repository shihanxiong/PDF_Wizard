package services

import (
	"fmt"
	"os"
	"strings"

	"github.com/ledongthuc/pdf"
)

// ExtractPDFText extracts human-readable text from a PDF file path.
// Password-protected PDFs are not supported; unlock the file first (Lock / Unlock tab).
// Layout is approximated using row grouping when the underlying parser succeeds; otherwise plain text per page is used.
func (s *PDFService) ExtractPDFText(path string) (string, error) {
	if err := validatePDFFile(path); err != nil {
		return "", err
	}
	return extractPDFTextWithLedongFile(path)
}

func extractPDFTextWithLedongFile(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", fmt.Errorf("open PDF: %w", err)
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		return "", fmt.Errorf("stat PDF: %w", err)
	}

	r, err := pdf.NewReader(f, fi.Size())
	if err != nil {
		return "", fmt.Errorf("read PDF: %w", err)
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
