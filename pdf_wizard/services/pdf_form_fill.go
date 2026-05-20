package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/pdfcpu/pdfcpu/pkg/api"
	pdfcpuform "github.com/pdfcpu/pdfcpu/pkg/pdfcpu/form"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"

	"pdf_wizard/models"
)

// ListPDFFormFields returns editable AcroForm fields for a PDF.
func (s *PDFService) ListPDFFormFields(inputPath string) ([]models.PDFFormField, error) {
	if err := validatePDFFile(inputPath); err != nil {
		return nil, fmt.Errorf("input file: %w", err)
	}

	f, err := os.Open(inputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open PDF: %w", err)
	}
	defer f.Close()

	fields, err := api.FormFields(f, model.NewDefaultConfiguration())
	if err != nil {
		return nil, fmt.Errorf("failed to read PDF form fields: %w", err)
	}
	if len(fields) == 0 {
		return nil, fmt.Errorf("no editable form fields found in PDF")
	}

	out := make([]models.PDFFormField, 0, len(fields))
	for _, field := range fields {
		out = append(out, models.PDFFormField{
			ID:      field.ID,
			Name:    field.Name,
			Type:    formFieldType(field.Typ),
			Value:   field.V,
			Locked:  field.Locked,
			Options: splitFieldOptions(field.Opts),
		})
	}

	return out, nil
}

// FillPDFForm fills editable AcroForm fields and writes a new output PDF.
func (s *PDFService) FillPDFForm(inputPath string, fieldValues []models.PDFFormFieldValue, outputDirectory string, outputFilename string) error {
	if err := validatePDFFile(inputPath); err != nil {
		return fmt.Errorf("input file: %w", err)
	}
	if err := validateOutputDirectory(outputDirectory); err != nil {
		return err
	}
	if strings.TrimSpace(outputFilename) == "" {
		return fmt.Errorf("output filename cannot be empty")
	}
	if len(fieldValues) == 0 {
		return fmt.Errorf("no form values provided")
	}

	byID := make(map[string]string, len(fieldValues))
	for _, fv := range fieldValues {
		id := strings.TrimSpace(fv.ID)
		if id == "" {
			continue
		}
		byID[id] = fv.Value
	}
	if len(byID) == 0 {
		return fmt.Errorf("no valid form values provided")
	}

	formGroup, err := exportFormGroup(inputPath)
	if err != nil {
		return err
	}

	updated := applyFormValues(formGroup, byID)
	if updated == 0 {
		return fmt.Errorf("none of the submitted form fields matched this PDF")
	}

	outputPath := filepath.Join(outputDirectory, strings.TrimSpace(outputFilename)+PDFExtension)
	if err := removeIfExists(outputPath); err != nil {
		return err
	}

	fillJSONPath := outputPath + ".formfill.json"
	data, err := json.Marshal(formGroup)
	if err != nil {
		return fmt.Errorf("failed to encode form payload: %w", err)
	}
	if err := os.WriteFile(fillJSONPath, data, DefaultFilePerm); err != nil {
		return fmt.Errorf("failed to write form payload: %w", err)
	}
	defer os.Remove(fillJSONPath)

	if err := api.FillFormFile(inputPath, fillJSONPath, outputPath, model.NewDefaultConfiguration()); err != nil {
		return fmt.Errorf("failed to fill PDF form: %w", err)
	}
	if _, err := os.Stat(outputPath); os.IsNotExist(err) {
		return fmt.Errorf("filled file was not created at: %s", outputPath)
	}

	return nil
}

func exportFormGroup(inputPath string) (*pdfcpuform.FormGroup, error) {
	f, err := os.Open(inputPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open PDF: %w", err)
	}
	defer f.Close()

	formGroup, err := api.ExportForm(f, filepath.Base(inputPath), model.NewDefaultConfiguration())
	if err != nil {
		return nil, fmt.Errorf("failed to export PDF form: %w", err)
	}
	if formGroup == nil || len(formGroup.Forms) == 0 {
		return nil, fmt.Errorf("no editable form fields found in PDF")
	}
	return formGroup, nil
}

func applyFormValues(formGroup *pdfcpuform.FormGroup, byID map[string]string) int {
	updated := 0
	for _, form := range formGroup.Forms {
		for _, field := range form.TextFields {
			if v, ok := byID[field.ID]; ok && !field.Locked {
				field.Value = v
				updated++
			}
		}
		for _, field := range form.DateFields {
			if v, ok := byID[field.ID]; ok && !field.Locked {
				field.Value = v
				updated++
			}
		}
		for _, field := range form.CheckBoxes {
			if v, ok := byID[field.ID]; ok && !field.Locked {
				field.Value = parseBoolValue(v)
				updated++
			}
		}
		for _, field := range form.RadioButtonGroups {
			if v, ok := byID[field.ID]; ok && !field.Locked {
				field.Value = v
				updated++
			}
		}
		for _, field := range form.ComboBoxes {
			if v, ok := byID[field.ID]; ok && !field.Locked {
				field.Value = v
				updated++
			}
		}
		for _, field := range form.ListBoxes {
			if v, ok := byID[field.ID]; ok && !field.Locked {
				field.Values = []string{v}
				updated++
			}
		}
	}
	return updated
}

func formFieldType(t pdfcpuform.FieldType) string {
	switch t {
	case pdfcpuform.FTText:
		return "text"
	case pdfcpuform.FTDate:
		return "date"
	case pdfcpuform.FTCheckBox:
		return "checkbox"
	case pdfcpuform.FTRadioButtonGroup:
		return "radio"
	case pdfcpuform.FTComboBox:
		return "combo"
	case pdfcpuform.FTListBox:
		return "list"
	default:
		return "unknown"
	}
}

func splitFieldOptions(opts string) []string {
	if strings.TrimSpace(opts) == "" {
		return nil
	}
	parts := strings.Split(opts, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		p := strings.TrimSpace(part)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func parseBoolValue(v string) bool {
	switch strings.ToLower(strings.TrimSpace(v)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}
