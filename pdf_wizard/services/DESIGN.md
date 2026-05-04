# PDF Wizard Services Design

This document describes the backend service layer architecture and implementation for PDF Wizard.

## Overview

The backend uses a service-based architecture with clear separation of concerns:

- **FileService** (`file_service.go`): Handles file selection, directory selection, and file metadata operations
- **PDFService** (`pdf_service.go`): Handles all PDF processing operations (merge, split, rotate, watermark, images→PDF, lock, unlock)
- **HEIC helpers** (`heic_jpeg.go`): Decode HEIC/HEIF to temporary JPEG for `api.ImportImagesFile`
- **LAN phone upload** (`phone_upload.go`, `phone_upload_logo.go`): Optional HTTP server for sending images from a phone on the same LAN (see [§ LAN phone image upload](#lan-phone-image-upload))

The App struct in `app.go` acts as a thin wrapper that delegates to these services and provides Wails bindings for the frontend (including starting/stopping the phone upload server).

## LAN phone image upload

**Files:** `phone_upload.go`, `phone_upload_logo.go`, embedded `app_logo.png` (canonical source: repository root **`assets/img/app_logo.png`**; run **`scripts/update-app-icons.sh`** from the repo root after logo changes).

**Entry:** `StartLANImageUploadServer(onUploaded func([]string), pageCopy models.PhoneUploadPageCopy) (pageURL string, stop func() error, err error)` — listens on `0.0.0.0:random port`, serves token-scoped routes under `/u/{token}/`.

**Behavior:**

- **GET** `/u/{token}/` — Upload form (or **session closed** HTML after a successful upload); **`writePhoneFormHTML`** injects `MaxFiles`, JS for selected-count (`__COUNT__`), and bfcache **`pageshow`** reload.
- **GET** `/u/{token}/ok` — Success page after **POST** + redirect (PRG).
- **GET** `/u/{token}/logo.png` — PNG bytes (`go:embed`), used as `src="logo.png"` in templates (avoids large `data:` URIs in HTML).
- **POST** — Multipart field `files`; saves valid images to a session temp dir; **`cloneUploadedImagesForApp`** copies into `os.TempDir` paths for the app; **`onUploaded`** receives durable paths; **`PhoneUploadMaxFilesPerSession`** (25) enforced.
- **HTML** — `html/template`, **`setPhonePageNoStore`** on responses; localized copy from **`normalizePhoneCopy`** defaults merged with **`PhoneUploadPageCopy`** from the frontend.
- **`IsImageFile`** / **`validateImageFile`** from `validation.go` for accepted types.

**App wiring:** `StartImagesPhoneUpload` / `StopImagesPhoneUpload` in `app.go`; **`runtime.EventsEmit(ctx, "images-phone-upload", json)`**; tests in `phone_upload_test.go`.

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

#### `SelectPDFFiles(labels models.FileDialogLabels) ([]string, error)`

Opens a native file dialog to select multiple PDF files.

- Uses `runtime.OpenMultipleFilesDialog()` with PDF filter; dialog title and filter display name come from `labels` (empty strings fall back to English defaults)
- Returns array of selected file paths
- Returns error if dialog is cancelled or fails

#### `SelectPDFFile(labels models.FileDialogLabels) (string, error)`

Opens a native file dialog to select a single PDF file.

- Uses `runtime.OpenFileDialog()` with PDF filter; `labels` supplies localized title and filter label (empty → English defaults)
- Returns selected file path
- Returns error if no file selected or dialog fails

#### `SelectImageFiles(labels models.FileDialogLabels) ([]string, error)`

Opens a native file dialog to select multiple image files.

- Uses `runtime.OpenMultipleFilesDialog()` with an image filter (JPEG, PNG, WebP, TIFF, GIF, BMP, HEIC, HEIF); `labels` for title and filter display name
- Returns array of selected paths
- Returns error if dialog is cancelled or fails

#### `SelectOutputDirectory(labels models.FileDialogLabels) (string, error)`

Opens a native directory dialog to select an output directory.

- Uses `runtime.OpenDirectoryDialog()`; `labels.Title` is the dialog title (`filterDisplayName` is unused for directories)
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
- Applying text watermarks (`ApplyWatermark`)
- Building one PDF from ordered images (`ImagesToPDF`)
- Locking PDFs with password-based encryption (`LockPDF`)
- Unlocking password-protected PDFs (`UnlockPDF`)
- Extracting plain text for the PDF-to-Text tab (`ExtractPDFText` in `pdf_text_extract.go`; uses `github.com/ledongthuc/pdf`; **password-protected PDFs are not supported**)

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
- Reads the PDF once (`api.ReadValidateAndOptimize` with trim command); uses `ctx.PageCount` for range checks
- Validates all splits:
  - Start page >= 1 and <= totalPages
  - End page >= startPage and <= totalPages
  - Filename is non-empty
- Checks for duplicate filenames to prevent overwriting

**Implementation:**

- Opens the input once and builds a shared context via `api.ReadValidateAndOptimize` (same pipeline as `api.Trim` / `api.TrimFile`, issue #57)
- For each split: `api.PagesForPageSelection` → `pdfcpu.ExtractPages` from that context → `api.WriteContextFile` to `outputDirectory/filename.pdf`
- Avoids per-segment `api.TrimFile` calls, which each reopen and reparse the source
- Removes existing output files before writing; pdfcpu uses 1-based page numbers

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

#### `ApplyWatermark(inputPath string, watermark models.WatermarkDefinition, outputDirectory string, outputFilename string) error`

Adds a text watermark to the selected pages of a PDF (see [SYSTEM_DESIGN.md § Watermark PDF Tab](../../SYSTEM_DESIGN.md#watermark-pdf-tab) for product behavior).

- Validates input PDF and output directory; uses a temporary working copy where pdfcpu would otherwise modify in place
- Delegates to pdfcpu watermark APIs with configuration derived from `WatermarkDefinition`

#### `ImagesToPDF(imagePaths []string, outputDirectory string, outputFilename string) error`

Creates one PDF with one page per image, preserving order.

**Validation:**

- Non-empty `imagePaths`; each path validated with `validateImageFile()` (supported extensions include HEIC/HEIF)
- Output directory writable; non-empty trimmed `outputFilename`

**Implementation:**

- `resolveImagePathsForPDF()` (`heic_jpeg.go`) prepares each input **in parallel** with a bounded **`errgroup`** (up to **4** workers, capped by input count): HEIC/HEIF → temporary JPEG, then **`normalizeRasterOrientation`** (`image_orientation.go`) for **JPEG/PNG/GIF/TIFF/BMP**. **JPEG only:** a lightweight EXIF scan (same rules as `imaging`’s internal reader) skips decode/re-encode when orientation is **missing or 1** (already upright). Other JPEG orientations and non-JPEG rasters still use **`imaging.AutoOrientation(true)`** (decode + save to temp when needed). WebP passes through unchanged. pdfcpu imports raw pixels otherwise. Output order matches `imagePaths`; `defer` cleanup removes all temps. Memory: at most a few full decoded images at once (HEIC decode + encode).
- `api.ImportImagesFile` with `pdfcpu.DefaultImportConfig()` and `model.NewDefaultConfiguration()`
- Removes existing output file before write; verifies output exists after import

### ExtractPDFText (PDF to Text tab)

#### `ExtractPDFText(path string) (string, error)`

Returns human-readable text from an existing PDF for the **PDF to Text** tab.

**Validation:**

- `validatePDFFile(path)`

**Implementation:**

- Opens the file with `github.com/ledongthuc/pdf` (`NewReader`). Encrypted PDFs are rejected by the reader; users should unlock the file first (**Lock / Unlock** tab).
- Per-page extraction prefers **row-grouped** text (`GetTextByRow`) for rough reading order; falls back to `GetPlainText` when rows are empty or row grouping errors.

**Limitations:**

- Image-only or scanned pages typically yield little or no text (no OCR in this feature).
- **No password support** for this feature.

## Validation (`validation.go`)

Shared helpers used by services:

- **`validatePDFFile` / `isPDFFile`** — PDF inputs
- **`validateImageFile` / `isImageFile`** — Raster inputs for `ImagesToPDF` (including `.heic` / `.heif`)
- **`validateOutputDirectory`** — Output directory exists and is writable

## Data Models

### PhoneUploadPageCopy

Defined in **`models/types.go`**. Passed from React when starting the LAN server so phone HTML matches UI language. Fields include `lang`, `dir`, form/success/error/session-closed strings, `selectedCountLine` (`__COUNT__`), `tooManyFiles` (with `__MAX__` substituted on the frontend). See **`frontend/src/utils/i18n/types.ts`** (`imagesPhonePage*` keys).

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

App-wide Go and npm dependencies are summarized in [SYSTEM_DESIGN.md § Technical considerations](../SYSTEM_DESIGN.md#technical-considerations). This section lists only what **services** import directly.

### Go Libraries

- `github.com/pdfcpu/pdfcpu/pkg/api` - PDF processing library

  - `ReadContextFile()` - Read PDF and get context
  - `MergeCreateFile()` - Merge multiple PDFs
  - `ReadValidateAndOptimize()`, `PagesForPageSelection()`, `WriteContextFile()`, `ValidateContext()` — split uses one optimized read then per-output writes (#57)
  - `ImportImagesFile()` — images→PDF (one page per image)

- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu` - Page extraction (`ExtractPages` for split segments)

- `github.com/ledongthuc/pdf` — text extraction for `ExtractPDFText` (`pdf_text_extract.go`)

- `github.com/gen2brain/heic` — decode HEIC/HEIF for `heic_jpeg.go` (combined with standard library `image/jpeg` encode)

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
