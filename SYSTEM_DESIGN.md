# PDF Wizard System Design Document

## Overview

PDF Wizard is a cross-platform desktop application built with Wails v2 that provides PDF manipulation capabilities, including merging, splitting, rotating, and watermarking PDF files, and building a multi-page PDF from ordered images. The application uses a Go backend for file operations and a React/TypeScript frontend with Material-UI for the user interface.

## Documentation map

Avoid duplicating long procedures across files. Use this table to find the **single** place each topic is maintained:

| Topic | Canonical document |
| --- | --- |
| Product overview, downloads, install, troubleshooting | [README.md](README.md) |
| Release builds (DMG, ZIP, `build-dist.sh`) | [pdf_wizard/DISTRIBUTION.md](pdf_wizard/DISTRIBUTION.md) |
| Commands from `pdf_wizard/` (`wails dev`, quick test entry points) | [pdf_wizard/README.md](pdf_wizard/README.md) |
| Native menu, `app.go`, config file, models, Wails `options.App` | [pdf_wizard/DESIGN.md](pdf_wizard/DESIGN.md) |
| Tab components and Settings dialog UI | [pdf_wizard/frontend/src/components/DESIGN.md](pdf_wizard/frontend/src/components/DESIGN.md) |
| File/PDF services (`FileService`, `PDFService`) and **LAN phone upload** (`phone_upload.go`) | [pdf_wizard/services/DESIGN.md](pdf_wizard/services/DESIGN.md) |
| i18n layout, `useI18n`, adding a language | [pdf_wizard/frontend/src/utils/i18n/DESIGN.md](pdf_wizard/frontend/src/utils/i18n/DESIGN.md) |
| **This file** | End-to-end architecture, UI patterns, watermark and images-to-PDF specs, cross-cutting technical notes |

**Supported Platforms:**

- macOS (Intel and Apple Silicon - universal binary)
- Windows (32-bit and 64-bit)

## Architecture

### Technology Stack

- **Backend**: Go 1.25 with Wails v2.12.0
- **Frontend**: React 18+ with TypeScript, Material-UI (MUI) v7
- **PDF Processing**: `github.com/pdfcpu/pdfcpu v0.11.1` - Native Go PDF library; **`github.com/ledongthuc/pdf`** for PDF-to-Text extraction (with pdfcpu decrypt fallback for strong encryption)
- **Build Tool**: Wails CLI v2.12.0 (align with `github.com/wailsapp/wails/v2 v2.12.0` in `go.mod`)
- **UI Framework**: Material-UI
- **Drag and Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` for file reordering (replaced deprecated react-beautiful-dnd)
- **Internationalization**: Custom i18n system supporting 12 languages (English, Chinese Simplified, Chinese Traditional, Arabic, French, Japanese, Hindi, Spanish, Portuguese, Russian, Korean, German)
- **Node.js**: 22.21.1 (required by the project)

### Project Structure

**Branding:** The canonical app logo is **`assets/img/app_logo.png`** (repository root). From the repo root, run **`bash scripts/update-app-icons.sh`** to regenerate **`pdf_wizard/build/appicon.png`** (1024×1024 for Wails) and copy the logo into **`pdf_wizard/frontend/src/assets/img/`** and **`pdf_wizard/services/`**.

```
pdf_wizard/
├── main.go                 # Application entry point
├── app.go                  # Main application struct (thin wrapper around services)
├── DESIGN.md               # Application-level design (menu, config, models)
├── services/              # Service layer for business logic
│   ├── file_service.go    # File selection and metadata operations
│   ├── pdf_service.go     # PDF processing operations (merge, split, rotate, watermark, images→PDF)
│   ├── heic_jpeg.go       # HEIC/HEIF → temporary JPEG for pdfcpu import
│   ├── phone_upload.go    # LAN HTTP server for phone → images upload; HTML templates
│   ├── phone_upload_logo.go # go:embed app logo for phone pages (mirrors frontend asset)
│   ├── app_logo.png       # Embedded logo (sync from assets/img/app_logo.png; see scripts/update-app-icons.sh)
│   ├── validation.go      # File and directory validation utilities
│   ├── constants.go       # Service constants (file extensions, permissions)
│   └── DESIGN.md          # Backend services design
├── models/                 # Data models
│   └── types.go           # PDFMetadata, SplitDefinition, RotateDefinition, WatermarkDefinition, PhoneUploadPageCopy
├── frontend/
│   ├── src/
│   │   ├── main.tsx       # React entry; wraps App in I18nProvider
│   │   ├── App.tsx        # Main shell + tab navigation (lazy-loads tab bundles on first activation)
│   │   ├── hooks/         # Shared hooks (PDF/image drop, errors, processing state, output directory)
│   │   ├── components/    # React components
│   │   │   ├── MergeTab.tsx
│   │   │   ├── SplitTab.tsx
│   │   │   ├── RotateTab.tsx
│   │   │   ├── WatermarkTab.tsx
│   │   │   ├── ImagesToPdfTab.tsx
│   │   │   ├── LockUnlockTab.tsx
│   │   │   ├── SettingsDialog.tsx
│   │   │   └── DESIGN.md  # Components design
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   │       ├── constants.ts # MAIN_TAB_IDS / MainTabId; shared UI constants
│   │       ├── formatters.ts
│   │       └── i18n/       # Internationalization utilities
│   │           ├── index.ts           # Barrel exports (useI18n, types, getNativeLanguageName)
│   │           ├── I18nProvider.tsx   # React context; current language and t()
│   │           ├── catalog.ts        # Merged translation map and lookup helpers
│   │           ├── constants.ts      # SUPPORTED_LANGUAGES, isValidLanguage
│   │           ├── types.ts
│   │           ├── en.ts       # English translations
│   │           ├── zh.ts       # Chinese Simplified translations
│   │           ├── zh-TW.ts    # Chinese Traditional translations
│   │           ├── ar.ts       # Arabic translations
│   │           ├── fr.ts       # French translations
│   │           ├── ja.ts       # Japanese translations
│   │           ├── hi.ts       # Hindi translations
│   │           ├── es.ts       # Spanish translations
│   │           ├── pt.ts       # Portuguese translations
│   │           ├── ru.ts       # Russian translations
│   │           ├── ko.ts       # Korean translations
│   │           ├── de.ts       # German translations
│   │           └── DESIGN.md  # i18n system design
│   └── wailsjs/           # Auto-generated Wails bindings
└── go.mod                  # Go dependencies
```

## User Interface Design

### Tab-Based Layout

The application features a tabbed interface with eight main tabs:

1. **Merge PDF Tab** - For combining multiple PDF files
2. **Split PDF Tab** - For dividing a PDF into multiple files
3. **Rotate PDF Tab** - For rotating specific page ranges in a PDF
4. **Watermark PDF Tab** - For adding text or image watermarks to PDF files
5. **Images to PDF Tab** - For building one PDF from multiple ordered images (including HEIC/HEIF)
6. **PDF to Text Tab** - For extracting plain text from a PDF into an editable area (with copy); **unencrypted PDFs only**; scanned/image-only PDFs may return little or no text (no OCR in this release)
7. **Lock / Unlock PDF Tab** - For encrypting PDFs with a password or decrypting password-protected PDFs
8. **Edit PDF Tab** - For loading AcroForm fields, editing supported values, and exporting a filled PDF

### Tab Component Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Merge PDF] [Split PDF] [Rotate PDF] [Watermark PDF] [Images to PDF] [PDF to Text] [Lock/Unlock] [Edit PDF] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Tab Content Area                                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Drag and Drop Architecture

Drag and drop file handling is implemented at the App level to work anywhere on the window:

- A single `OnFileDrop` handler is registered at the App component level with `useDropTarget=false` to work anywhere on the window
- The handler routes dropped files using **stable tab ids** (`merge`, `split`, `rotate`, `watermark`, `imagesToPdf`, `pdfToText`, `lockUnlock`, `formFill`) defined by `MAIN_TAB_IDS` in `utils/constants.ts`. `activeTabIdRef` holds the current tab id; each tab registers a handler in `dropHandlersRef`, a `Partial<Record<MainTabId, ...>>` keyed by that id (not by numeric tab index)
- Each tab component registers its own drop handler via a callback prop
- Cross-platform compatibility:
  - **Windows**: `DisableWebViewDrop: true` in Wails config prevents WebView2 from intercepting drag-and-drop events
  - **macOS**: Works natively without interference from WebKit
- Browser default drag-and-drop behavior is prevented to avoid PDF preview
- Handler is registered once on mount and cleaned up on unmount

### Internationalization (i18n)

The application supports **12 languages** through a custom i18n stack: per-language modules merged in `catalog.ts`, wrapped by `I18nProvider` in `main.tsx`, and consumed via `useI18n()` (`t`, `setLanguage`). Locale codes, `SUPPORTED_LANGUAGES`, and how to add a language are maintained in **[pdf_wizard/frontend/src/utils/i18n/DESIGN.md](pdf_wizard/frontend/src/utils/i18n/DESIGN.md)**.

### Native menu, window options, config file, and Settings

Menu construction, Wails `options.App`, the JSON config path, and `GetLanguage` / `SetLanguage` / `EmitSettingsEvent` are documented in **[pdf_wizard/DESIGN.md](pdf_wizard/DESIGN.md)**. Settings dialog layout is in **[pdf_wizard/frontend/src/components/DESIGN.md](pdf_wizard/frontend/src/components/DESIGN.md)**.

## Component Design

The application consists of eight main tab components:

1. **MergeTab** - Combines multiple PDF files into one
2. **SplitTab** - Divides a PDF into multiple files
3. **RotateTab** - Rotates specific page ranges in a PDF
4. **WatermarkTab** - Adds text or image watermarks to PDF files
5. **ImagesToPdfTab** - Builds one PDF from ordered images; composes `useImageDrop` for window-level drops (see [components/DESIGN.md](pdf_wizard/frontend/src/components/DESIGN.md))
6. **PdfToTextTab** - Extracts text from one PDF via `ExtractPDFText`; copy/select-all on the result (unencrypted PDFs only)
7. **LockUnlockTab** - Encrypts PDFs with passwords and decrypts protected PDFs to a new output file
8. **FormFillTab** - Lists AcroForm fields and saves a filled output PDF via `FillPDFForm` (shown in UI as **Edit PDF**)

Each component handles its own state, file selection, validation, and processing.

For detailed component design and implementation, see [pdf_wizard/frontend/src/components/DESIGN.md](pdf_wizard/frontend/src/components/DESIGN.md).

## Backend Services

The backend uses a service-based architecture with clear separation of concerns:

- **FileService** - Handles file selection, directory selection, and file metadata operations (including `SelectImageFiles` for the images tab)
- **PDFService** - Handles all PDF processing operations (merge, split, rotate, watermark, images→PDF via `ImagesToPDF`, plain-text extraction via `ExtractPDFText`, plus `LockPDF`, `UnlockPDF`, `ListPDFFormFields`, and `FillPDFForm`)
- **LAN phone upload** (`services/phone_upload.go`) - Optional HTTP server on the LAN for the Images to PDF tab: token-scoped URL `/u/{token}/`, multipart uploads, `PrimaryLANIPv4` for the QR base URL; not a separate service struct, but documented in [pdf_wizard/services/DESIGN.md](pdf_wizard/services/DESIGN.md)
- **Validation utilities** (`validation.go`) - File and directory validation functions
  - `validatePDFFile()` - Validates file exists, is readable, and has PDF extension
  - `validateOutputDirectory()` - Validates directory exists and is accessible
  - `isPDFFile()` - Checks if file has PDF extension
- **Constants** (`constants.go`) - Service-level constants
  - `PDFExtension = ".pdf"` - Standard PDF file extension
  - `DefaultFilePerm = 0644` - Default file permissions (rw-r--r--)
  - `DefaultDirPerm = 0755` - Default directory permissions (rwxr-xr-x)
- **App struct** - Thin wrapper that delegates to services and provides Wails bindings

### PDF Service Implementation Details

#### MergePDFs

- **Merge-first, then diagnose**: Attempts `api.MergeCreateFile()` first (pdfcpu reads inputs as part of the merge). If merge fails, `mergeDiagnoseInputs()` runs `api.ReadContextFile()` on each input in order to report which file fails and why (e.g., font encoding / NULL encoding), suggesting PDF repair where applicable
- **Font encoding handling**: Diagnosis path surfaces encoding-related read errors with filename and index
- **Output file handling**: Removes existing output file before creating new one to avoid pdfcpu overwrite issues
- **Error messages**: Includes filename and file index in error messages for better debugging

#### SplitPDF

- **Single-pass source read**: Opens the input once with `api.ReadValidateAndOptimize` (trim command), then for each segment runs `pdfcpu.ExtractPages` and `api.WriteContextFile`, instead of calling `api.TrimFile` per segment (which would reopen and reparse the source each time; see issue #57)

#### RotatePDF

- **Temporary file strategy**: Creates a temporary copy of input file because pdfcpu's `RotateFile` modifies files in place
- **Sequential rotations**: Multiple rotations are applied sequentially to the same temporary file
- **Cleanup**: Uses `defer os.Remove()` to ensure temporary file is cleaned up even on error
- **Final output**: Moves temporary file to final output location after all rotations are applied

#### ApplyWatermark

- **Temporary file strategy**: Similar to RotatePDF, uses temporary file to avoid in-place modification
- **Page range parsing**: Supports "all" pages or specific ranges like "1,3,5-10,15"
- **Stamp vs underlay**: Uses pdfcpu text config with **on top** of page content (`TextWatermark` with `onTop=true`) so text stays visible on opaque PDFs; clears default diagonal mode so UI rotation/position apply; opacity uses pdfcpu `ExtGState` (`wm.Opacity`)
- **Helper functions**: Page range parsing, position-to-anchor conversion, hex color parsing

#### ImagesToPDF

- **Input validation**: Non-empty path list; each path validated with `validateImageFile()` (supported extensions include `.heic` / `.heif`)
- **HEIC/HEIF**: `resolveImagePathsForPDF()` in `heic_jpeg.go` decodes HEIC/HEIF once to temporary JPEG files (up to **four** inputs prepared concurrently) so `api.ImportImagesFile` uses pdfcpu’s JPEG import path; temps removed in a `defer` cleanup; order matches the selected file list
- **Import**: `api.ImportImagesFile(paths, outputPath, pdfcpu.DefaultImportConfig(), model.NewDefaultConfiguration())` — one PDF page per image, order preserved. Before import, **`resolveImagePathsForPDF`** applies **EXIF orientation** for JPEG/PNG/GIF/TIFF/BMP (JPEGs that are already upright skip re-encode; others use `imaging.AutoOrientation`); HEIC is converted to JPEG first, then normalized.
- **Output**: Same overwrite pattern as merge (remove existing output, verify file exists after write)

For detailed service implementation, see [pdf_wizard/services/DESIGN.md](pdf_wizard/services/DESIGN.md).

## Application-Level Design

The application-level design covers:

- Main entry point (`main.go`) - Application initialization and menu configuration
- App struct (`app.go`) - Wails bindings and service delegation
- Language preference management
- Event communication between menu and frontend
- Data models (`models/types.go`)

For detailed application-level design, see [pdf_wizard/DESIGN.md](pdf_wizard/DESIGN.md).

## Technical Considerations

### Dependencies

**Go Backend:**

- `github.com/wailsapp/wails/v2` - Wails framework
- `github.com/wailsapp/wails/v2/pkg/runtime` - File dialogs and runtime operations
- `github.com/wailsapp/wails/v2/pkg/menu` - Application menu
- `github.com/pdfcpu/pdfcpu/pkg/api` - PDF processing library
- `github.com/ledongthuc/pdf` - Plain-text extraction for the PDF to Text tab (`ExtractPDFText`)
- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu` - Low-level helpers (e.g. `ExtractPages` after a shared read context for split)
- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model` - Configuration models
- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu/color` - Color handling for watermarks
- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types` - PDF types and anchors
- `github.com/gen2brain/heic` - HEIC/HEIF decode for the images→PDF pipeline (temporary JPEG before import)
- Standard library: `net`, `net/http`, `html/template`, `encoding/json`, `image/jpeg`, `os`, `path/filepath`, `strings`, `fmt`, `sync/atomic` — LAN phone upload server (`phone_upload.go`), configuration, HEIC→JPEG encoding, and string handling

**Frontend:**

- React 18+
- Material-UI v7
- TypeScript
- Wails runtime bindings
- `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` - For drag-and-drop file reordering (replaced deprecated react-beautiful-dnd)
- `qrcode` - QR code generation for the LAN phone upload URL (Images to PDF tab)
- Custom i18n system (`utils/i18n/`) - For internationalization (per-language modules, `catalog.ts` merge, React `I18nProvider` / `useI18n` for 12 languages)

### Error Handling

- Validate PDF files before processing (file existence, PDF format, readability)
- Handle file access errors gracefully with descriptive messages
- **Font encoding / read errors on merge**: After a failed merge, per-input `ReadContextFile` diagnosis yields specific messages (e.g., NULL encoding) tied to filename and index
- **Page range validation**: All operations validate page ranges against PDF page count
- **Output file handling**: Existing output files are removed before creating new ones to avoid pdfcpu overwrite issues
- **Temporary file management**: Rotate and watermark operations use temporary files to avoid in-place modification issues, with automatic cleanup; HEIC/HEIF→JPEG conversion for images→PDF uses temp files under `heic_jpeg.go` with deferred removal
- Provide user-friendly error messages that identify problematic files
- Log errors for debugging

### Performance Considerations

- Lazy load file metadata (don't block UI)
- Process large files asynchronously
- Show progress indicators for long operations
- Optimize file list rendering for many files

### File Validation

- **PDF paths**: Check file extension (`.pdf`), verify readable, optionally validate structure, check permissions
- **Image paths** (images→PDF): Supported extensions include JPEG, PNG, WebP, TIFF, GIF, BMP, HEIC, HEIF; same existence/read checks as other inputs where applicable

## Future Enhancements

1. **File Preview**: Show first page thumbnail
2. **Bookmarks/Outline**: Preserve or merge bookmarks
3. **Metadata**: Preserve or edit PDF metadata
4. **Batch Operations**: Process multiple merge/split/rotate operations
5. **History**: Keep track of recent operations
6. **Settings**: Configure default output locations, naming patterns
7. **Keyboard Shortcuts**: Quick actions via keyboard
8. **Undo/Redo**: Support for undoing file removals or reorders
9. **File Validation**: Pre-check PDF files for corruption before processing
10. **Progress Tracking**: Real-time progress updates for long-running operations

## Images to PDF Tab

### Overview

The **Images to PDF** tab produces a single PDF with **one page per image**, in the order shown in the list. Supported raster types include JPEG, PNG, WebP, TIFF, GIF, BMP, and HEIC/HEIF. HEIC/HEIF files are converted once to temporary JPEGs on the backend so pdfcpu can import them efficiently (`services/heic_jpeg.go`).

### Receive from phone (same Wi‑Fi)

Users can **start receiving** on the desktop to run a small **HTTP server** on the LAN (random port, `0.0.0.0`). The app shows a **QR code** and URL that open a **phone-friendly upload page** in the device browser. The page is **localized** using `models.PhoneUploadPageCopy` strings passed from the React (`useI18n`) when the session starts.

**Behavior (summary):**

- **Token URL** — `http://<LAN-IPv4>:<port>/u/<token>/` (see `PrimaryLANIPv4()` + `StartLANImageUploadServer` in `services/phone_upload.go`).
- **Logo** — `GET /u/{token}/logo.png` serves an embedded PNG (`services/app_logo.png`, synced with `frontend/src/assets/img/app_logo.png` from **`assets/img/app_logo.png`**).
- **Limit** — Up to **25** images per upload request (`PhoneUploadMaxFilesPerSession`); server and client enforce this.
- **After a successful upload** — The app emits `images-phone-upload` with JSON path array, then **stops the LAN server** after a short delay so the phone can load the **success** (`/ok`) page first; the desktop clears the QR receive state. Further batches require **Receive from phone** again (new QR).
- **Session closed** — After upload, revisiting the upload URL shows a **session ended** page; repeat **POST** returns **410** with the same copy. HTML responses use **`Cache-Control: no-store`**; the upload form uses **`pageshow` + bfcache reload** so Back does not show a stale form from cache.
- **Wails bindings** — `StartImagesPhoneUpload(pageCopy)`, `StopImagesPhoneUpload()`; implementation details: [pdf_wizard/services/DESIGN.md — LAN phone image upload](pdf_wizard/services/DESIGN.md#lan-phone-image-upload), [pdf_wizard/DESIGN.md](pdf_wizard/DESIGN.md) (`App`).

### Functional requirements (summary)

1. **Image selection** — Native multi-select (`SelectImageFiles`) and window-level drag-and-drop when the images tab is active; invalid paths are filtered with user-visible feedback.
2. **Phone upload** (optional) — Receive from phone + QR + `EventsOn('images-phone-upload')` to append files to the same list as local picks.
3. **Ordering** — Same `@dnd-kit` sortable list pattern as merge; order maps directly to page order in the output PDF.
4. **Output** — Output directory and base filename (`.pdf` appended); calls Wails-bound `ImagesToPDF`.
5. **i18n** — Tab label, buttons, phone page copy, and errors use `useI18n()` like other tabs; phone-specific keys live in `Translations` and `PhoneUploadPageCopy`.

For component-level UI and state shape, see [pdf_wizard/frontend/src/components/DESIGN.md](pdf_wizard/frontend/src/components/DESIGN.md).

## PDF to Text Tab

### Overview

The **PDF to Text** tab extracts **plain text** from a single selected PDF into a large multiline field. Users can **copy** the result or **select all** for manual editing. **Password-protected PDFs are not supported**; unlock the file first on the **Lock / Unlock** tab.

### Limitations

- **Scanned or image-only pages** often yield little or no text; **OCR is not included** in this release.

### Implementation (summary)

- **Frontend** — `PdfToTextTab.tsx`; Wails `ExtractPDFText(path)`; same window-level drop routing as other single-PDF tabs (`pdfToText` in `MAIN_TAB_IDS`).
- **Backend** — `PDFService.ExtractPDFText` in `services/pdf_text_extract.go` (`github.com/ledongthuc/pdf`). Details: [pdf_wizard/services/DESIGN.md — ExtractPDFText](pdf_wizard/services/DESIGN.md#extractpdftext-pdf-to-text-tab).

## Watermark PDF Tab

### Overview

The Watermark PDF tab allows users to add text watermarks to PDF files. This feature is **fully implemented** and supports text-based watermarks with customizable font, size, color, opacity, rotation, and position.

### Functional Requirements

1. **PDF Selection**

   - Allow user to select a single PDF file from the local file system
   - Support both file dialog selection and drag-and-drop
   - Validate that selected file is a PDF
   - Once a PDF is selected, display PDF information and show watermark configuration options
   - Allow user to change/remove selected PDF

2. **PDF Information Display**

   - Display selected PDF metadata:
     - **File Path**: Full or relative path to the file
     - **File Size**: Human-readable format (e.g., "2.5 MB", "150 KB")
     - **Total Pages**: Number of pages in the PDF
     - **Last Modified**: Timestamp of last modification (formatted date/time)
   - Show PDF icon/badge
   - Display information in a clear, prominent card or section

3. **Text Watermark Configuration**

   - **Text Input**: Text field for watermark text content
   - **Font Size**: Numeric input or slider for font size (e.g., 12-72pt, default: 24pt)
   - **Font Color**: Color picker or predefined color options (default: gray/black with opacity)
   - **Opacity**: Slider or numeric input for transparency (0-100%, default: 50%)
   - **Rotation**: Dropdown or numeric input for text rotation angle (0°, 45°, 90°, -45°, -90°, custom, default: 0°)
   - **Position**: Dropdown or grid selector for watermark position:
     - Center
     - Top Left, Top Center, Top Right
     - Middle Left, Middle Right
     - Bottom Left, Bottom Center, Bottom Right
     - Custom (with X/Y offset inputs)
   - **Font Family**: Dropdown for font selection with **language-specific fonts**:
     - **Chinese (Simplified/Traditional)**: SimSun (宋体), SimHei (黑体), Microsoft YaHei (微软雅黑), KaiTi (楷体), FangSong (仿宋)
     - **Japanese**: Mincho (明朝体), Gothic (ゴシック体)
     - **Korean**: Malgun Gothic (맑은 고딕), Nanum Gothic (나눔고딕)
     - **Hindi**: Devanagari (देवनागरी)
     - **Other Languages**: Standard PDF fonts (Helvetica, Times Roman, Courier variants, Symbol)
     - Font options dynamically update based on the selected application language
     - Default font is automatically selected based on the current language

4. **Page Range Selection**

   - Allow user to specify which pages to apply watermark:
     - **All Pages** (default) - Radio button or checkbox
     - **Specific Pages** - Text input for page ranges (e.g., "1,3,5-10,15")
   - Validate page numbers against total PDF pages
   - Show page range validation errors

5. **Output Configuration**

   - **Output Directory Selection**: Button to select output directory
   - Display selected output directory path
   - **Output Filename**: Text input for output filename (without extension)
   - Static ".pdf" text displayed after filename input
   - Default filename: "watermarked" (which becomes "watermarked.pdf")
   - Validate write permissions for selected directory

6. **Watermark Actions**
   - "Apply Watermark" button displayed at the bottom of the tab
   - Button is disabled when:
     - No PDF is selected
     - Text content is empty
     - Output directory is not selected
     - Output filename is empty or invalid
     - Processing is in progress
   - Show loading spinner and "Applying watermark..." text during processing
   - Display success message with output file path when complete
   - Display error message if watermarking fails

### UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Select PDF File] or drag-and-drop area                │
│  (PDF information card when file selected)               │
├─────────────────────────────────────────────────────────┤
│  [Text Watermark Configuration]                          │
│  - Text: [________________]                              │
│  - Font Size: [24] pt                                    │
│  - Font Color: [Color Picker]                           │
│  - Opacity: [====●====] 50%                              │
│  - Rotation: [0° ▼]                                      │
│  - Position: [Center ▼]                                 │
│  - Font Family: [Arial ▼]                               │
├─────────────────────────────────────────────────────────┤
│  Page Range: ○ All Pages  ○ Specific Pages              │
│  Pages: [1,3,5-10] (if specific selected)                │
├─────────────────────────────────────────────────────────┤
│  Output Directory: [Select Directory]                   │
│  Selected: /path/to/output                              │
│  Output Filename: [watermarked].pdf                     │
├─────────────────────────────────────────────────────────┤
│  [Apply Watermark] (button at bottom)                   │
└─────────────────────────────────────────────────────────┘
```

### Technical Implementation

#### Frontend Component: WatermarkTab

**Component Structure:**

- Similar pattern to RotateTab (single PDF input)
- State management for PDF selection, watermark configuration, output settings
- Form validation before processing
- Integration with drag-and-drop handler

**State Management:**

```typescript
const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
const [textWatermark, setTextWatermark] = useState<TextWatermarkConfig | null>(null);
const [pageRange, setPageRange] = useState<'all' | 'specific'>('all');
const [specificPages, setSpecificPages] = useState<string>('');
const [outputDirectory, setOutputDirectory] = useState<string>('');
const [outputFilename, setOutputFilename] = useState<string>('watermarked');
const [isProcessing, setIsProcessing] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
```

**Key Functions:**

- `handleDroppedPDF()` - Processes PDF dropped on window
- `handleSelectPDF()` - Opens file dialog and loads PDF metadata
- `handleTextWatermarkChange()` - Updates text watermark configuration
- `validateWatermarkConfig()` - Validates watermark configuration
- `parsePageRange()` - Parses and validates page range string
- `handleApplyWatermark()` - Executes watermark operation

#### Backend Models

**WatermarkDefinition (models/types.go):**

```go
type WatermarkDefinition struct {
    TextConfig   TextWatermarkConfig   `json:"textConfig"`
    PageRange    string                `json:"pageRange"`    // "all" or page range string like "1,3,5-10"
}

type TextWatermarkConfig struct {
    Text       string  `json:"text"`
    FontSize   int     `json:"fontSize"`
    FontColor  string  `json:"fontColor"`   // Hex color code
    Opacity    float64 `json:"opacity"`     // 0.0-1.0
    Rotation   int     `json:"rotation"`    // Degrees
    Position   string  `json:"position"`    // "center", "top-left", etc.
    FontFamily string  `json:"fontFamily"`
}
```

#### Backend Service: PDFService

**New Method: ApplyWatermark**

```go
func (s *PDFService) ApplyWatermark(
    inputPath string,
    watermark WatermarkDefinition,
    outputDirectory string,
    outputFilename string,
) error
```

**Implementation:**

- Uses pdfcpu library's `TextWatermark` API for watermark creation
- Parses page range string to determine which pages to watermark (supports "all" or specific ranges like "1,3,5-10")
- Renders text with specified font, size, color, opacity (pdfcpu graphics state), rotation, and position
- **Temporary file handling**: Creates a temporary copy of the input file, applies watermark, then moves to final output location (prevents in-place modification issues)
- **Helper functions**:
  - `parsePageRange()` - Parses page range strings (e.g., "1,3,5-10,15") into pdfcpu format
  - `convertPositionToAnchor()` - Converts position strings to pdfcpu anchor format
  - `parseColor()` - Parses hex color codes to pdfcpu color format
- Handles errors gracefully with user-friendly error messages
- Validates page numbers against PDF page count
- Validates watermark configuration (non-empty text, valid font size, opacity range)
- Includes comprehensive integration tests covering all scenarios

#### App Binding (app.go)

**New Method:**

```go
func (a *App) ApplyWatermark(
    inputPath string,
    watermark models.WatermarkDefinition,
    outputDirectory string,
    outputFilename string,
) error
```

### Internationalization

Watermark strings use the same **`useI18n()`** / `Translations` pipeline as the rest of the app; keys live in **`frontend/src/utils/i18n/types.ts`** and each `*.ts` locale file. Adding or renaming keys is covered in [pdf_wizard/frontend/src/utils/i18n/DESIGN.md](pdf_wizard/frontend/src/utils/i18n/DESIGN.md).

#### Language-Specific Font Selection

The watermark feature includes **intelligent font selection** based on the application's current language:

- **Dynamic Font Lists**: Font options are filtered to show only fonts appropriate for the selected language
- **Automatic Default Selection**: When the language changes, the default font automatically updates to a font suitable for that language
- **Font Name Localization**: Font names are displayed in the user's selected language (e.g., "SimSun (宋体)" in English, "宋体" in Chinese)
- **Font Categories**:
  - **Chinese (zh, zh-TW)**: SimSun, SimHei, Microsoft YaHei, KaiTi, FangSong
  - **Japanese (ja)**: Mincho, Gothic
  - **Korean (ko)**: Malgun Gothic, Nanum Gothic
  - **Hindi (hi)**: Devanagari
  - **All Other Languages**: Standard PDF fonts (Helvetica, Times Roman, Courier variants, Symbol)

### Error Handling

- Validate PDF file exists and is readable
- Validate page range syntax and page numbers
- Validate output directory is writable
- Validate output filename is valid (no invalid characters)
- Validate text watermark configuration (non-empty text, valid font, etc.)
- Handle pdfcpu library errors gracefully
- Provide user-friendly error messages

### Performance Considerations

- Validate page ranges efficiently
- Process watermarking asynchronously with progress indication
- Optimize text rendering operations
- Handle large PDFs efficiently by processing pages in batches if needed

### User Experience Enhancements

- Show live preview of watermark position (optional future enhancement)
- Allow multiple text watermarks to be added (optional future enhancement)
- Support watermark templates/presets (optional future enhancement)
- Show watermark preview on first page thumbnail (optional future enhancement)
- Support for image watermarks (optional future enhancement)

## Testing

- **Backend** (from `pdf_wizard`): `go test -v ./...`. Filter: `go test -v -run TestName ./...`. Coverage: `go test -v -coverprofile=coverage.out ./...` then `go tool cover -func=coverage.out` or `go tool cover -html=coverage.out`.
- **Frontend E2E** (Playwright): `cd frontend && npm run test:e2e`. Structure, fixtures, and CI: **[pdf_wizard/frontend/e2e/README.md](pdf_wizard/frontend/e2e/README.md)**.

## Design Documentation

Use the [Documentation map](#documentation-map) at the top of this file. Quick links:

- [pdf_wizard/DESIGN.md](pdf_wizard/DESIGN.md) — main entry, menu, config, models
- [pdf_wizard/frontend/src/components/DESIGN.md](pdf_wizard/frontend/src/components/DESIGN.md) — tab components
- [pdf_wizard/services/DESIGN.md](pdf_wizard/services/DESIGN.md) — services layer
- [pdf_wizard/frontend/src/utils/i18n/DESIGN.md](pdf_wizard/frontend/src/utils/i18n/DESIGN.md) — i18n

## Notes

- Uses Wails runtime package (`pkg/runtime`) for native file dialogs and event emission
- Leverages Wails `OnFileDrop` API for drag-and-drop (handled at App level with `useDropTarget=false` for window-wide support)
- Cross-platform drag-and-drop: `DisableWebViewDrop: true` prevents WebView interference on Windows and macOS
- Material-UI components for consistent UI
- TypeScript for type safety
- Go structs with JSON tags for data exchange
- Service-based architecture for separation of concerns
- pdfcpu library for merge, split, rotate, watermark, lock/unlock; ledongthuc/pdf for text extraction in the PDF to Text tab
- @dnd-kit library for drag-and-drop file reordering in Merge tab (modern replacement for deprecated react-beautiful-dnd)
- Custom i18n (12 languages): see [pdf_wizard/frontend/src/utils/i18n/DESIGN.md](pdf_wizard/frontend/src/utils/i18n/DESIGN.md); config file paths in [pdf_wizard/DESIGN.md](pdf_wizard/DESIGN.md)
- Settings accessible via application menu bar (native menu on macOS)
  - Settings menu is separate from AppMenu (which includes "About PDF Wizard" automatically)
- Wails Events API used for communication between menu and frontend (show-settings event)
