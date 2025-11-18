# PDF Wizard System Design Document

## Overview

PDF Wizard is a cross-platform desktop application built with Wails v2 that provides PDF manipulation capabilities, including merging, splitting, and rotating PDF files. The application uses a Go backend for file operations and a React/TypeScript frontend with Material-UI for the user interface.

**Supported Platforms:**

- macOS (Intel and Apple Silicon - universal binary)
- Windows (32-bit and 64-bit)

## Architecture

### Technology Stack

- **Backend**: Go 1.24.0 with Wails v2.11.0
- **Frontend**: React 18+ with TypeScript, Material-UI (MUI) v7
- **PDF Processing**: `github.com/pdfcpu/pdfcpu` - Native Go PDF library
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
│   ├── pdf_service.go     # PDF processing operations (merge, split, rotate)
│   └── DESIGN.md          # Backend services design
├── models/                 # Data models
│   └── types.go           # PDFMetadata, SplitDefinition, RotateDefinition
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Main application component with tab navigation
│   │   ├── components/    # React components
│   │   │   ├── MergeTab.tsx
│   │   │   ├── SplitTab.tsx
│   │   │   ├── RotateTab.tsx
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

The application features a tabbed interface with three main tabs:

1. **Merge PDF Tab** - For combining multiple PDF files
2. **Split PDF Tab** - For dividing a PDF into multiple files
3. **Rotate PDF Tab** - For rotating specific page ranges in a PDF

### Tab Component Structure

```
┌─────────────────────────────────────────┐
│  [Merge PDF] [Split PDF] [Rotate PDF]   │
├─────────────────────────────────────────┤
│                                         │
│  Tab Content Area                       │
│                                         │
└─────────────────────────────────────────┘
```

### Drag and Drop Architecture

Drag and drop file handling is implemented at the App level to work anywhere on the window:

- A single `OnFileDrop` handler is registered at the App component level
- The handler routes dropped files to the appropriate tab based on the currently active tab
- Each tab component registers its own drop handler via a callback prop
- Browser default drag-and-drop behavior is prevented to avoid PDF preview

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

The application consists of three main tab components:

1. **MergeTab** - Combines multiple PDF files into one
2. **SplitTab** - Divides a PDF into multiple files
3. **RotateTab** - Rotates specific page ranges in a PDF

Each component handles its own state, file selection, validation, and processing.

For detailed component design and implementation, see [`frontend/src/components/DESIGN.md`](frontend/src/components/DESIGN.md).

## Backend Services

The backend uses a service-based architecture with clear separation of concerns:

- **FileService** - Handles file selection, directory selection, and file metadata operations
- **PDFService** - Handles all PDF processing operations (merge, split, rotate)
- **App struct** - Thin wrapper that delegates to services and provides Wails bindings

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
- Standard library: `encoding/json`, `os`, `path/filepath` - For configuration management

**Frontend:**

- React 18+
- Material-UI v7
- TypeScript
- Wails runtime bindings
- `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` - For drag-and-drop file reordering (replaced deprecated react-beautiful-dnd)
- Custom i18n system (`utils/i18n/`) - For internationalization (modular structure with separate translation files for 12 languages)

### Error Handling

- Validate PDF files before processing
- Handle file access errors gracefully
- Provide user-friendly error messages
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

## Design Documentation

For detailed design information, refer to the following documents:

- **[Application Design](DESIGN.md)** - Main entry point, app wrapper, menu configuration, models, and configuration management
- **[Components Design](frontend/src/components/DESIGN.md)** - Detailed design for MergeTab, SplitTab, RotateTab, and SettingsDialog components
- **[Services Design](services/DESIGN.md)** - Backend service layer architecture and implementation (FileService, PDFService)
- **[i18n Design](frontend/src/utils/i18n/DESIGN.md)** - Internationalization system architecture and usage

## Notes

- Uses Wails runtime package (`pkg/runtime`) for native file dialogs
- Leverages Wails `OnFileDrop` API for drag-and-drop (handled at App level)
- Material-UI components for consistent UI
- TypeScript for type safety
- Go structs with JSON tags for data exchange
- Service-based architecture for separation of concerns
- pdfcpu library for all PDF processing operations (merge, split, rotate)
- @dnd-kit library for drag-and-drop file reordering in Merge tab (modern replacement for deprecated react-beautiful-dnd)
- Custom i18n system for internationalization (12 languages: English, Chinese Simplified, Chinese Traditional, Arabic, French, Japanese, Hindi, Spanish, Portuguese, Russian, Korean, German)
  - Modular structure: `utils/i18n/` directory with separate translation files for each language
  - Language preference stored in JSON config file: `<UserConfigDir>/PDF Wizard/pdf_wizard_config.json`
  - Language validation in both frontend (TypeScript) and backend (Go) for consistency
  - Native language names displayed in language selector for better UX
- Settings accessible via application menu bar (native menu on macOS)
  - Settings menu is separate from AppMenu (which includes "About PDF Wizard" automatically)
- Wails Events API used for communication between menu and frontend (show-settings event)
