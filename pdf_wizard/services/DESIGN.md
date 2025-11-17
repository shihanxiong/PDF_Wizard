# PDF Wizard Services Design

This document describes the backend service layer architecture and implementation for PDF Wizard.

## Overview

The backend uses a service-based architecture with clear separation of concerns:

- **FileService** (`file_service.go`): Handles file selection, directory selection, and file metadata operations
- **PDFService** (`pdf_service.go`): Handles all PDF processing operations (merge, split, rotate)

The App struct in `app.go` acts as a thin wrapper that delegates to these services and provides Wails bindings for the frontend.

## FileService

### Purpose

FileService handles all file system operations including:

- Opening native file dialogs (single and multiple file selection)
- Opening native directory dialogs
- Retrieving file metadata
- Getting PDF page counts

### Structure

```go
type FileService struct {
    ctx context.Context
}

func NewFileService(ctx context.Context) *FileService {
    return &FileService{ctx: ctx}
}
```

### Methods

#### `SelectPDFFiles() ([]string, error)`

Opens a native file dialog to select multiple PDF files.

- Uses `runtime.OpenMultipleFilesDialog()` with PDF filter
- Returns array of selected file paths
- Returns error if dialog is cancelled or fails

#### `SelectPDFFile() (string, error)`

Opens a native file dialog to select a single PDF file.

- Uses `runtime.OpenFileDialog()` with PDF filter
- Returns selected file path
- Returns error if no file selected or dialog fails

#### `SelectOutputDirectory() (string, error)`

Opens a native directory dialog to select an output directory.

- Uses `runtime.OpenDirectoryDialog()`
- Returns selected directory path
- Returns error if dialog is cancelled or fails

#### `GetFileMetadata(path string) (models.PDFMetadata, error)`

Retrieves basic file metadata without page count.

- Uses `os.Stat()` to get file information
- Returns `PDFMetadata` with `TotalPages` set to 0
- Used for merge operations where page count is not needed
- Formats `LastModified` as ISO 8601 (RFC3339)

#### `GetPDFMetadata(path string) (models.PDFMetadata, error)`

Retrieves PDF file metadata including page count.

- Uses `os.Stat()` to get file information
- Calls `GetPDFPageCount()` to get total pages
- Returns complete `PDFMetadata` with page count
- Used for split and rotate operations where page count is required

#### `GetPDFPageCount(path string) (int, error)`

Returns the total number of pages in a PDF file.

- Validates file exists and has `.pdf` extension
- Uses `pdfcpu` library (`api.ReadContextFile()`) to read PDF
- Returns `PageCount` from PDF context
- Returns error if file is not a valid PDF

## PDFService

### Purpose

PDFService handles all PDF processing operations:

- Merging multiple PDFs into one
- Splitting a PDF into multiple files
- Rotating specific page ranges in a PDF

### Structure

```go
type PDFService struct {
    fileService *FileService
}

func NewPDFService(fileService *FileService) *PDFService {
    return &PDFService{fileService: fileService}
}
```

PDFService depends on FileService to access file metadata and page counts.

### Methods

#### `MergePDFs(inputPaths []string, outputDirectory string, outputFilename string) error`

Merges multiple PDF files in order into a single PDF.

**Validation:**

- Validates input files array is not empty
- Validates all input files exist and are readable
- Validates all input files have `.pdf` extension
- Validates output directory exists and is writable
- Removes existing output file if it exists

**Implementation:**

- Uses `pdfcpu` library (`api.MergeCreateFile()`)
- `dividerPage: false` means no divider pages between merged PDFs
- Creates output file at `outputDirectory/outputFilename.pdf`
- Validates merged file was created successfully

**Error Handling:**

- Returns descriptive errors for each validation failure
- Wraps pdfcpu errors with context

#### `SplitPDF(inputPath string, splits []models.SplitDefinition, outputDirectory string) error`

Splits a PDF into multiple files according to split definitions.

**Validation:**

- Validates input file exists and is a PDF
- Validates output directory exists and is writable
- Gets PDF page count for validation
- Validates all splits:
  - Start page >= 1 and <= totalPages
  - End page >= startPage and <= totalPages
  - Filename is non-empty
- Checks for duplicate filenames to prevent overwriting

**Implementation:**

- Uses `pdfcpu` library (`api.TrimFile()`) to extract page ranges
- Processes each split sequentially
- For each split:
  - Creates output path: `outputDirectory/filename.pdf`
  - Removes existing output file if it exists
  - Uses `TrimFile()` with page range string (e.g., "1-10")
  - Validates split file was created
- pdfcpu uses 1-based page numbers

**Error Handling:**

- Returns descriptive errors for each validation failure
- Includes split index in error messages for clarity
- Wraps pdfcpu errors with context

#### `RotatePDF(inputPath string, rotations []models.RotateDefinition, outputDirectory string, outputFilename string) error`

Rotates specified page ranges in a PDF file.

**Validation:**

- Validates input file exists and is a PDF
- Validates output directory exists and is writable
- Validates output filename is non-empty
- Gets PDF page count for validation
- Validates all rotations:
  - Start page >= 1 and <= totalPages
  - End page >= startPage and <= totalPages
  - Rotation angle is 90, -90, or 180

**Implementation:**

- Creates temporary copy of input file (pdfcpu modifies files in place)
- Uses `pdfcpu` library (`api.RotateFile()`) to rotate pages
- Processes each rotation sequentially on the temporary file
- For each rotation:
  - Builds page selection string (e.g., "1-5" for pages 1 to 5)
  - Calls `RotateFile()` with rotation angle and page selection
- Removes existing output file if it exists
- Moves temporary file to final output location
- Validates rotated file was created
- Cleans up temporary file on error (defer)

**Key Implementation Notes:**

- Uses temporary file copy because pdfcpu's `RotateFile` modifies files in place
- Multiple rotations are applied sequentially to the same temporary file
- Final output file is created by renaming the temporary file after all rotations are applied
- All rotations are validated before processing begins

**Helper Function:**

- `copyFile(src, dst string) error`: Copies a file from source to destination using `os.Open()` and `ReadFrom()`

## Data Models

### PDFMetadata

```go
type PDFMetadata struct {
    Path         string `json:"path"`
    Name         string `json:"name"`
    Size         int64  `json:"size"`         // bytes
    LastModified string `json:"lastModified"` // ISO 8601 format (RFC3339)
    IsPDF        bool   `json:"isPDF"`
    TotalPages   int    `json:"totalPages"`   // Total number of pages (0 when not needed)
}
```

**Usage:**

- `TotalPages` is set to 0 for merge operations (not needed)
- `TotalPages` includes actual page count for split and rotate operations
- Frontend converts `LastModified` from ISO string to `Date` object

### SplitDefinition

```go
type SplitDefinition struct {
    StartPage int    `json:"startPage"` // 1-based page number
    EndPage   int    `json:"endPage"`   // 1-based page number (inclusive)
    Filename  string `json:"filename"`  // Filename without .pdf extension
}
```

**Usage:**

- Used in `SplitPDF()` to define page ranges and output filenames
- Page numbers are 1-based (first page is 1, not 0)
- End page is inclusive (pages 1-10 includes both 1 and 10)

### RotateDefinition

```go
type RotateDefinition struct {
    StartPage int `json:"startPage"` // 1-based page number
    EndPage   int `json:"endPage"`   // 1-based page number (inclusive)
    Rotation  int `json:"rotation"`  // Rotation angle: 90, -90, or 180
}
```

**Usage:**

- Used in `RotatePDF()` to define page ranges and rotation angles
- Page numbers are 1-based (first page is 1, not 0)
- End page is inclusive
- Rotation angles: 90 (clockwise), -90 (counter-clockwise), 180 (upside down)

## Dependencies

### Go Libraries

- `github.com/pdfcpu/pdfcpu/pkg/api` - PDF processing library

  - `ReadContextFile()` - Read PDF and get context
  - `MergeCreateFile()` - Merge multiple PDFs
  - `TrimFile()` - Extract page ranges (used for splitting)
  - `RotateFile()` - Rotate pages in PDF

- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model` - Configuration models

  - `NewDefaultConfiguration()` - Create default pdfcpu configuration

- `github.com/wailsapp/wails/v2/pkg/runtime` - File dialogs and runtime operations
  - `OpenMultipleFilesDialog()` - Multi-file selection dialog
  - `OpenFileDialog()` - Single file selection dialog
  - `OpenDirectoryDialog()` - Directory selection dialog

### Standard Library

- `os` - File operations (`Stat()`, `Open()`, `Create()`, `Remove()`, `Rename()`)
- `path/filepath` - Path manipulation (`Join()`, `Base()`, `Ext()`)
- `strings` - String operations (`ToLower()`, `TrimSpace()`)
- `time` - Time formatting (`Format()`)

## Error Handling

All service methods follow consistent error handling patterns:

1. **Validation First**: Validate all inputs before processing
2. **Descriptive Errors**: Return clear, actionable error messages
3. **Context Wrapping**: Wrap underlying errors with context using `fmt.Errorf()` and `%w` verb
4. **Error Propagation**: Return errors immediately when validation fails
5. **Resource Cleanup**: Use `defer` for cleanup operations (e.g., temporary file removal)

## Service Initialization

Services are initialized in `app.go` during the `startup()` callback:

```go
func (a *App) startup(ctx context.Context) {
    // Save context for runtime operations
    a.ctx = ctx

    // Initialize services with context
    fileService := services.NewFileService(ctx)
    pdfService := services.NewPDFService(fileService)

    a.fileService = fileService
    a.pdfService = pdfService
}
```

The context is required for FileService to use Wails runtime dialogs.

## Testing

Service methods are designed to be testable:

- FileService can be tested with mock contexts
- PDFService can be tested with mock FileService
- All methods return errors that can be checked in tests

See `file_service_test.go` and `pdf_service_test.go` for test implementations.
