# PDF Wizard System Design Document

## Overview

PDF Wizard is a cross-platform desktop application built with Wails v2 that provides PDF manipulation capabilities, including merging, splitting, rotating, and watermarking PDF files. The application uses a Go backend for file operations and a React/TypeScript frontend with Material-UI for the user interface.

**Supported Platforms:**

- macOS (Intel and Apple Silicon - universal binary)
- Windows (32-bit and 64-bit)

## Architecture

### Technology Stack

- **Backend**: Go 1.24.0 with Wails v2.11.0
- **Frontend**: React 18+ with TypeScript, Material-UI (MUI) v7
- **PDF Processing**: `github.com/pdfcpu/pdfcpu v0.11.1` - Native Go PDF library
- **Build Tool**: Wails CLI v2.11.0
- **UI Framework**: Material-UI
- **Drag and Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` for file reordering (replaced deprecated react-beautiful-dnd)
- **Internationalization**: Custom i18n system supporting 12 languages (English, Chinese Simplified, Chinese Traditional, Arabic, French, Japanese, Hindi, Spanish, Portuguese, Russian, Korean, German)
- **Node.js**: 22.21.1 (required by the project)

### Project Structure

```
pdf_wizard/
├── main.go                 # Application entry point
├── app.go                  # Main application struct (thin wrapper around services)
├── DESIGN.md               # Application-level design (menu, config, models)
├── services/              # Service layer for business logic
│   ├── file_service.go    # File selection and metadata operations
│   ├── pdf_service.go     # PDF processing operations (merge, split, rotate, watermark)
│   ├── validation.go      # File and directory validation utilities
│   ├── constants.go       # Service constants (file extensions, permissions)
│   └── DESIGN.md          # Backend services design
├── models/                 # Data models
│   └── types.go           # PDFMetadata, SplitDefinition, RotateDefinition, WatermarkDefinition
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Main application component with tab navigation
│   │   ├── components/    # React components
│   │   │   ├── MergeTab.tsx
│   │   │   ├── SplitTab.tsx
│   │   │   ├── RotateTab.tsx
│   │   │   ├── WatermarkTab.tsx
│   │   │   ├── SettingsDialog.tsx
│   │   │   └── DESIGN.md  # Components design
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions
│   │       ├── formatters.ts
│   │       └── i18n/       # Internationalization utilities
│   │           ├── index.ts
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

The application features a tabbed interface with four main tabs:

1. **Merge PDF Tab** - For combining multiple PDF files
2. **Split PDF Tab** - For dividing a PDF into multiple files
3. **Rotate PDF Tab** - For rotating specific page ranges in a PDF
4. **Watermark PDF Tab** - For adding text or image watermarks to PDF files

### Tab Component Structure

```
┌─────────────────────────────────────────────────────────┐
│  [Merge PDF] [Split PDF] [Rotate PDF] [Watermark PDF] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tab Content Area                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Drag and Drop Architecture

Drag and drop file handling is implemented at the App level to work anywhere on the window:

- A single `OnFileDrop` handler is registered at the App component level with `useDropTarget=false` to work anywhere on the window
- The handler routes dropped files to the appropriate tab based on the currently active tab (using refs to track current tab)
- Each tab component registers its own drop handler via a callback prop
- Cross-platform compatibility:
  - **Windows**: `DisableWebViewDrop: true` in Wails config prevents WebView2 from intercepting drag-and-drop events
  - **macOS**: Works natively without interference from WebKit
- Browser default drag-and-drop behavior is prevented to avoid PDF preview
- Handler is registered once on mount and cleaned up on unmount

### Internationalization (i18n)

The application supports multiple languages through a custom internationalization system:

- **Supported Languages**: 12 languages total
  - English (en)
  - Chinese Simplified (zh)
  - Chinese Traditional (zh-TW)
  - Arabic (ar)
  - French (fr)
  - Japanese (ja)
  - Hindi (hi)
  - Spanish (es)
  - Portuguese (pt)
  - Russian (ru)
  - Korean (ko)
  - German (de)
- **Language Selection**: Available through the Settings dialog (accessible via menu bar)
- **Language Persistence**: User's language preference is saved to a configuration file in the user's config directory
- **Translation System**: All UI text uses translation keys accessed via the `t()` function from `utils/i18n`
- **Dynamic Updates**: UI updates immediately when language is changed
- **Default Language**: English (en) is the default if no preference is set
- **Native Language Names**: Language options are displayed in their native script for better user experience

For detailed i18n implementation, see [`frontend/src/utils/i18n/DESIGN.md`](frontend/src/utils/i18n/DESIGN.md).

#### Settings Dialog

- Accessible via the "Settings" menu item in the application menu bar
- Allows users to select from 12 supported languages
- Language options are displayed in their native script (e.g., "简体中文", "繁體中文", "한국어", "Deutsch")
- Changes are saved immediately and persist across application restarts
- Uses Material-UI Dialog component for consistent UI
- Language preference is loaded on application startup
- Frontend listens for "show-settings" event from backend to open dialog

#### Menu Configuration

The application menu is configured in `main.go`:

```go
// Create menu with AppMenu (includes "About PDF Wizard" automatically)
appMenu := menu.NewMenu()
appMenu.Append(menu.AppMenu())

// Add Settings menu item
settingsSubMenu := menu.NewMenu()
settingsSubMenu.Append(menu.Text("Settings", nil, func(_ *menu.CallbackData) {
    app.EmitSettingsEvent()
}))
appMenu.Append(menu.SubMenu("Settings", settingsSubMenu))

appMenu.Append(menu.EditMenu())
appMenu.Append(menu.WindowMenu())
```

- The `menu.AppMenu()` function automatically includes "About PDF Wizard" and other standard macOS app menu items
- Settings is added as a separate menu item (not inside AppMenu)
- Settings menu item triggers `EmitSettingsEvent()` which emits a "show-settings" event
- Frontend listens for this event using `EventsOn('show-settings', ...)` and opens the Settings dialog
- Menu is native on macOS (appears in the menu bar at the top of the screen)

#### Application Configuration

The application is configured with the following options in `main.go`:

```go
&options.App{
    Title:     "PDF Wizard",
    Width:     1024,
    Height:    900,
    MinWidth:  800,
    MinHeight: 600,
    BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
    DragAndDrop: &options.DragAndDrop{
        EnableFileDrop:     true,
        DisableWebViewDrop: true, // Prevents WebView interference on Windows and macOS
    },
    Mac: &mac.Options{
        About: &mac.AboutInfo{
            Title:   "PDF Wizard",
            Message: "A modern PDF toolkit built with Wails v2\n\nAuthor: Hanxiong Shi\nVersion 1.0.0\nCopyright © 2025",
        },
    },
}
```

- **Window Size**: 1024x900 pixels (minimum 800x600)
- **Background Color**: Dark theme (RGB: 27, 38, 54)
- **Drag and Drop**: Enabled with `DisableWebViewDrop: true` for cross-platform compatibility
- **macOS About Dialog**: Custom About information with author, version, and copyright

For detailed menu and application configuration, see [`DESIGN.md`](DESIGN.md).

#### Configuration File

Language preference is stored in a JSON configuration file:

- **Location**: `<UserConfigDir>/PDF Wizard/pdf_wizard_config.json`
  - On macOS: `~/Library/Application Support/PDF Wizard/pdf_wizard_config.json`
  - On Windows: `%AppData%\PDF Wizard\pdf_wizard_config.json`
  - On Linux: `~/.config/PDF Wizard/pdf_wizard_config.json`
- **Structure**:
  ```json
  {
    "language": "en"
  }
  ```
- **Default**: If the file doesn't exist or is invalid, the default language is "en" (English)
- **Persistence**: The config directory is created automatically if it doesn't exist

## Component Design

The application consists of four main tab components:

1. **MergeTab** - Combines multiple PDF files into one
2. **SplitTab** - Divides a PDF into multiple files
3. **RotateTab** - Rotates specific page ranges in a PDF
4. **WatermarkTab** - Adds text or image watermarks to PDF files

Each component handles its own state, file selection, validation, and processing.

For detailed component design and implementation, see [`frontend/src/components/DESIGN.md`](frontend/src/components/DESIGN.md).

## Backend Services

The backend uses a service-based architecture with clear separation of concerns:

- **FileService** - Handles file selection, directory selection, and file metadata operations
- **PDFService** - Handles all PDF processing operations (merge, split, rotate, watermark)
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

- **Pre-validation**: Validates each PDF can be read using `api.ReadContextFile()` before merging to identify problematic files
- **Font encoding handling**: Provides specific error messages for font encoding issues (e.g., NULL encoding), suggesting PDF repair
- **Output file handling**: Removes existing output file before creating new one to avoid pdfcpu overwrite issues
- **Error messages**: Includes filename and file index in error messages for better debugging

#### RotatePDF

- **Temporary file strategy**: Creates a temporary copy of input file because pdfcpu's `RotateFile` modifies files in place
- **Sequential rotations**: Multiple rotations are applied sequentially to the same temporary file
- **Cleanup**: Uses `defer os.Remove()` to ensure temporary file is cleaned up even on error
- **Final output**: Moves temporary file to final output location after all rotations are applied

#### ApplyWatermark

- **Temporary file strategy**: Similar to RotatePDF, uses temporary file to avoid in-place modification
- **Page range parsing**: Supports "all" pages or specific ranges like "1,3,5-10,15"
- **Opacity simulation**: Since pdfcpu doesn't support alpha channel, opacity is simulated by blending color with white
- **Helper functions**: Includes specialized functions for page range parsing, position conversion, color parsing, and opacity adjustment

For detailed service implementation, see [`services/DESIGN.md`](services/DESIGN.md).

## Application-Level Design

The application-level design covers:

- Main entry point (`main.go`) - Application initialization and menu configuration
- App struct (`app.go`) - Wails bindings and service delegation
- Language preference management
- Event communication between menu and frontend
- Data models (`models/types.go`)

For detailed application-level design, see [`DESIGN.md`](DESIGN.md).

## Technical Considerations

### Dependencies

**Go Backend:**

- `github.com/wailsapp/wails/v2` - Wails framework
- `github.com/wailsapp/wails/v2/pkg/runtime` - File dialogs and runtime operations
- `github.com/wailsapp/wails/v2/pkg/menu` - Application menu
- `github.com/pdfcpu/pdfcpu/pkg/api` - PDF processing library
- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model` - Configuration models
- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu/color` - Color handling for watermarks
- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu/types` - PDF types and anchors
- Standard library: `encoding/json`, `os`, `path/filepath`, `strings`, `fmt` - For configuration management, file operations, and string manipulation

**Frontend:**

- React 18+
- Material-UI v7
- TypeScript
- Wails runtime bindings
- `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` - For drag-and-drop file reordering (replaced deprecated react-beautiful-dnd)
- Custom i18n system (`utils/i18n/`) - For internationalization (modular structure with separate translation files for 12 languages)

### Error Handling

- Validate PDF files before processing (file existence, PDF format, readability)
- Handle file access errors gracefully with descriptive messages
- **Font encoding validation**: Merge operation validates each PDF can be read before merging, with specific error messages for font encoding issues (e.g., NULL encoding)
- **Page range validation**: All operations validate page ranges against PDF page count
- **Output file handling**: Existing output files are removed before creating new ones to avoid pdfcpu overwrite issues
- **Temporary file management**: Rotate and watermark operations use temporary files to avoid in-place modification issues, with automatic cleanup
- Provide user-friendly error messages that identify problematic files
- Log errors for debugging

### Performance Considerations

- Lazy load file metadata (don't block UI)
- Process large files asynchronously
- Show progress indicators for long operations
- Optimize file list rendering for many files

### File Validation

- Check file extension (.pdf)
- Verify file is readable
- Optionally validate PDF structure
- Check file permissions

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
- Renders text with specified font, size, color, opacity (simulated via color blending with white), rotation, and position
- **Temporary file handling**: Creates a temporary copy of the input file, applies watermark, then moves to final output location (prevents in-place modification issues)
- **Helper functions**:
  - `parsePageRange()` - Parses page range strings (e.g., "1,3,5-10,15") into pdfcpu format
  - `convertPositionToAnchor()` - Converts position strings to pdfcpu anchor format
  - `parseColor()` - Parses hex color codes to pdfcpu color format
  - `adjustColorOpacity()` - Simulates opacity by blending color with white
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

All translation keys have been implemented and are available in all 12 supported languages:

- `watermarkTab` - "Watermark PDF"
- `selectPDFFileWatermark` - "Select PDF File"
- `watermarkText` - "Watermark Text"
- `fontSize` - "Font Size"
- `fontColor` - "Font Color"
- `opacity` - "Opacity"
- `rotation` - "Rotation"
- `position` - "Position"
- `fontFamily` - "Font Family"
- `pageRange` - "Page Range"
- `allPages` - "All Pages"
- `specificPages` - "Specific Pages"
- `pages` - "Pages"
- `applyWatermark` - "Apply Watermark"
- `applying` - "Applying watermark..."
- `watermarkAppliedSuccessfully` - "Watermark applied successfully! Output:"
- `watermarkFailed` - "Watermark failed:"
- Position options (center, top-left, top-center, etc.)
- **Font name translations**: All font names are translated and displayed in the user's selected language (e.g., "SimSun (宋体)" in English, "宋体" in Chinese)

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

PDF Wizard includes comprehensive testing at multiple levels:

### Backend Integration Tests

- **Location**: Go test files alongside service implementations
- **Coverage**: PDF operations (merge, split, rotate, watermark), file metadata, page count, error handling, language management
- **Run**: `go test -v ./...` from the `pdf_wizard` directory
- **Test PDF Generation**: Backend utilities (`createTestPDF`, `createMultiPageTestPDF`) generate minimal valid PDF files for testing

### Frontend E2E Tests

- **Framework**: Playwright
- **Test Files**: Organized by functionality (app, components, tabs, i18n)
- **Test PDF**: Uses `e2e/helpers/test.pdf` for testing PDF operations
- **Mocking**: Wails runtime and Go bindings are mocked for UI-only testing
- **CI/CD**: GitHub Actions workflow runs tests in parallel using a matrix strategy

For detailed E2E testing information, including test structure, configuration, and CI/CD setup, see [`frontend/e2e/README.md`](frontend/e2e/README.md).

## Design Documentation

For detailed design information, refer to the following documents:

- **[Application Design](DESIGN.md)** - Main entry point, app wrapper, menu configuration, models, and configuration management
- **[Components Design](frontend/src/components/DESIGN.md)** - Detailed design for MergeTab, SplitTab, RotateTab, WatermarkTab, and SettingsDialog components
- **[Services Design](services/DESIGN.md)** - Backend service layer architecture and implementation (FileService, PDFService)
- **[i18n Design](frontend/src/utils/i18n/DESIGN.md)** - Internationalization system architecture and usage

## Notes

- Uses Wails runtime package (`pkg/runtime`) for native file dialogs and event emission
- Leverages Wails `OnFileDrop` API for drag-and-drop (handled at App level with `useDropTarget=false` for window-wide support)
- Cross-platform drag-and-drop: `DisableWebViewDrop: true` prevents WebView interference on Windows and macOS
- Material-UI components for consistent UI
- TypeScript for type safety
- Go structs with JSON tags for data exchange
- Service-based architecture for separation of concerns
- pdfcpu library for all PDF processing operations (merge, split, rotate, watermark)
- @dnd-kit library for drag-and-drop file reordering in Merge tab (modern replacement for deprecated react-beautiful-dnd)
- Custom i18n system for internationalization (12 languages: English, Chinese Simplified, Chinese Traditional, Arabic, French, Japanese, Hindi, Spanish, Portuguese, Russian, Korean, German)
  - Modular structure: `utils/i18n/` directory with separate translation files for each language
  - Language preference stored in JSON config file: `<UserConfigDir>/PDF Wizard/pdf_wizard_config.json`
  - Language validation in both frontend (TypeScript) and backend (Go) for consistency
  - Native language names displayed in language selector for better UX
- Settings accessible via application menu bar (native menu on macOS)
  - Settings menu is separate from AppMenu (which includes "About PDF Wizard" automatically)
- Wails Events API used for communication between menu and frontend (show-settings event)
