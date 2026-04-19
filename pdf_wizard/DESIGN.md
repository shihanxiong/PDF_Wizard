# PDF Wizard Application Design

This document describes the application-level design including the main entry point, app wrapper, menu configuration, and data models.

For a map of all documentation (so topics are not repeated in multiple places), see [SYSTEM_DESIGN.md § Documentation map](../SYSTEM_DESIGN.md#documentation-map) in the repository root.

## Overview

The application is structured with:

- **main.go**: Application entry point, menu configuration, and Wails initialization
- **app.go**: App struct that provides Wails bindings and delegates to services
- **models/**: Data models shared between frontend and backend
- Configuration management for language preferences

## Main Entry Point (main.go)

### Application Initialization

```go
func main() {
    // Create an instance of the app structure
    app := NewApp()

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

    // Create application with options
    err := wails.Run(&options.App{
        // ... configuration
    })
}
```

### Menu Configuration

The application menu is configured as follows:

1. **AppMenu**: Uses `menu.AppMenu()` which automatically includes:

   - "About PDF Wizard" (handled by `mac.About` option)
   - Standard macOS app menu items (Services, Hide, Quit, etc.)

2. **Settings Menu**: Added as a separate menu item

   - Contains "Settings" menu item
   - Triggers `EmitSettingsEvent()` which emits "show-settings" event
   - Frontend listens for this event and opens Settings dialog

3. **Edit Menu**: Standard edit menu (Cut, Copy, Paste, etc.)

4. **Window Menu**: Standard window menu (Minimize, Zoom, etc.)

### macOS-Specific Configuration

```go
Mac: &mac.Options{
    About: &mac.AboutInfo{
        Title:   "PDF Wizard",
        Message: "A modern PDF toolkit built with Wails v2\n\nAuthor: Hanxiong Shi\nVersion 1.0.0\nCopyright © 2026",
    },
}
```

The `mac.About` option automatically adds "About PDF Wizard" to the AppMenu on macOS.

## App Struct (app.go)

### Purpose

The App struct acts as a thin wrapper around services that:

- Provides Wails bindings for frontend access
- Manages application context
- Handles language preference persistence
- Emits events for frontend communication

### Structure

```go
type App struct {
    ctx         context.Context
    fileService *services.FileService
    pdfService  *services.PDFService
}

const (
    configFileName  = "pdf_wizard_config.json"
    defaultLanguage = "en"
)
```

### Initialization

```go
func NewApp() *App {
    return &App{}
}

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

### Language Management

#### `GetLanguage() (string, error)`

Returns the current language preference from the configuration file.

- Reads from `<UserConfigDir>/PDF Wizard/pdf_wizard_config.json`
- Returns the stored code when it matches `validLanguages` in `app.go` (same set as frontend `SUPPORTED_LANGUAGES` in `frontend/src/utils/i18n/constants.ts`)
- Defaults to `"en"` if the file is missing, invalid, or the code is not supported
- Creates the config directory if needed

**Config File Structure:**

```json
{
  "language": "en"
}
```

**Config File Locations:**

- macOS: `~/Library/Application Support/PDF Wizard/pdf_wizard_config.json`
- Windows: `%AppData%\PDF Wizard\pdf_wizard_config.json`
- Linux: `~/.config/PDF Wizard/pdf_wizard_config.json`

#### `SetLanguage(language string) error`

Saves the language preference to the configuration file.

- Validates the code against `validLanguages` in `app.go`
- Creates config directory if it doesn't exist
- Writes JSON configuration file
- Returns error if file operations fail

#### `EmitSettingsEvent()`

Emits a "show-settings" event to the frontend.

- Uses `runtime.EventsEmit()` to send event
- Frontend listens with `EventsOn('show-settings', ...)`
- Opens Settings dialog when event is received

### Service Delegation

All PDF and file operations delegate to services:

```go
// File operations
func (a *App) SelectPDFFiles() ([]string, error) {
    return a.fileService.SelectPDFFiles()
}

func (a *App) SelectPDFFile() (string, error) {
    return a.fileService.SelectPDFFile()
}

func (a *App) SelectImageFiles() ([]string, error) {
    return a.fileService.SelectImageFiles()
}

func (a *App) SelectOutputDirectory() (string, error) {
    return a.fileService.SelectOutputDirectory()
}

func (a *App) GetFileMetadata(path string) (models.PDFMetadata, error) {
    return a.fileService.GetFileMetadata(path)
}

func (a *App) GetPDFMetadata(path string) (models.PDFMetadata, error) {
    return a.fileService.GetPDFMetadata(path)
}

func (a *App) GetPDFPageCount(path string) (int, error) {
    return a.fileService.GetPDFPageCount(path)
}

// PDF operations
func (a *App) MergePDFs(inputPaths []string, outputDirectory string, outputFilename string) error {
    return a.pdfService.MergePDFs(inputPaths, outputDirectory, outputFilename)
}

func (a *App) ImagesToPDF(imagePaths []string, outputDirectory string, outputFilename string) error {
    return a.pdfService.ImagesToPDF(imagePaths, outputDirectory, outputFilename)
}

func (a *App) SplitPDF(inputPath string, splits []models.SplitDefinition, outputDirectory string) error {
    return a.pdfService.SplitPDF(inputPath, splits, outputDirectory)
}

func (a *App) RotatePDF(inputPath string, rotations []models.RotateDefinition, outputDirectory string, outputFilename string) error {
    return a.pdfService.RotatePDF(inputPath, rotations, outputDirectory, outputFilename)
}

func (a *App) ApplyWatermark(inputPath string, watermark models.WatermarkDefinition, outputDirectory string, outputFilename string) error {
    return a.pdfService.ApplyWatermark(inputPath, watermark, outputDirectory, outputFilename)
}
```

## Data Models (models/types.go)

### PDFMetadata

Represents file information including PDF metadata.

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

- Used for all file metadata operations
- `TotalPages` is 0 for merge operations (not needed)
- `TotalPages` includes actual count for split and rotate operations
- Frontend converts `LastModified` from ISO string to `Date` object

### SplitDefinition

Represents a split configuration for dividing a PDF.

```go
type SplitDefinition struct {
    StartPage int    `json:"startPage"` // 1-based page number
    EndPage   int    `json:"endPage"`   // 1-based page number (inclusive)
    Filename  string `json:"filename"`  // Filename without .pdf extension
}
```

**Usage:**

- Used in `SplitPDF()` to define page ranges and output filenames
- Page numbers are 1-based (first page is 1)
- End page is inclusive (pages 1-10 includes both 1 and 10)
- Filename does not include `.pdf` extension (added automatically)

### RotateDefinition

Represents a rotation configuration for a page range.

```go
type RotateDefinition struct {
    StartPage int `json:"startPage"` // 1-based page number
    EndPage   int `json:"endPage"`   // 1-based page number (inclusive)
    Rotation  int `json:"rotation"`  // Rotation angle: 90, -90, or 180
}
```

**Usage:**

- Used in `RotatePDF()` to define page ranges and rotation angles
- Page numbers are 1-based (first page is 1)
- End page is inclusive
- Rotation angles:
  - `90`: Clockwise rotation (+90°)
  - `-90`: Counter-clockwise rotation (-90°)
  - `180`: Upside down (180°)

## Configuration Management

### Config Structure

```go
type Config struct {
    Language string `json:"language"`
}
```

### Config File Path

The config file path is determined by:

```go
func (a *App) getConfigPath() (string, error) {
    userConfigDir, err := os.UserConfigDir()
    if err != nil {
        return "", err
    }
    configDir := filepath.Join(userConfigDir, "PDF Wizard")
    // Create directory if it doesn't exist
    if err := os.MkdirAll(configDir, 0755); err != nil {
        return "", err
    }
    return filepath.Join(configDir, configFileName), nil
}
```

### Error Handling

- If config file doesn't exist: Returns default language ("en")
- If config file is invalid JSON: Returns default language ("en")
- If config directory can't be created: Returns error
- If config file can't be written: Returns error

## Event Communication

The application uses Wails Events API for communication between menu and frontend:

1. **Menu Click**: User clicks "Settings" in menu
2. **Event Emission**: `EmitSettingsEvent()` calls `runtime.EventsEmit(ctx, "show-settings")`
3. **Frontend Listener**: Frontend listens with `EventsOn('show-settings', callback)`
4. **Dialog Open**: Frontend opens Settings dialog when event is received

This pattern allows the native menu to trigger frontend UI updates.

## Dependencies

The `App` layer uses Wails (`menu`, `options`, `runtime`, `mac`). PDF and file I/O live in `services/` and depend on **pdfcpu**; see [services/DESIGN.md](services/DESIGN.md). The full stack (Go modules, React, MUI, Playwright, etc.) is listed once in [SYSTEM_DESIGN.md § Technical Considerations](../SYSTEM_DESIGN.md#technical-considerations).

## Application Options

The application is configured with the following options:

```go
&options.App{
    Title:     "PDF Wizard",
    Width:     1024,
    Height:    900,
    MinWidth:  800,
    MinHeight: 600,
    AssetServer: &assetserver.Options{
        Assets: assets, // Embedded frontend/dist
    },
    BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
    DragAndDrop: &options.DragAndDrop{
        EnableFileDrop:     true,
        DisableWebViewDrop: true, // Windows WebView2 / macOS WebKit
    },
    Menu: appMenu,
    Mac: &mac.Options{
        About: &mac.AboutInfo{...},
    },
    OnStartup: app.startup,
    Bind: []interface{}{
        app,
    },
}
```

### Key Configuration

- **Title**: "PDF Wizard"
- **Window Size**: 1024x900 (minimum 800x600)
- **Background Color**: Dark theme (RGB: 27, 38, 54)
- **Drag and Drop**: `EnableFileDrop` with `DisableWebViewDrop: true` so the host handles file drops (see [SYSTEM_DESIGN.md](../SYSTEM_DESIGN.md) for frontend routing)
- **Assets**: Frontend build embedded via `//go:embed`
- **Menu**: Custom menu with AppMenu, Settings, Edit, Window
- **macOS About**: Custom About dialog information
