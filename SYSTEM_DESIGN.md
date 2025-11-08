# PDF Wizard System Design Document

## Overview

PDF Wizard is a desktop application built with Wails v2 that provides PDF manipulation capabilities, including merging, splitting, and rotating PDF files. The application uses a Go backend for file operations and a React/TypeScript frontend with Material-UI for the user interface.

## Architecture

### Technology Stack

- **Backend**: Go 1.21+ with Wails v2.8.1+
- **Frontend**: React 18+ with TypeScript, Material-UI (MUI) v7
- **PDF Processing**: `github.com/pdfcpu/pdfcpu` - Native Go PDF library
- **Build Tool**: Wails CLI
- **UI Framework**: Material-UI
- **Drag and Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` for file reordering (replaced deprecated react-beautiful-dnd)

### Project Structure

```
pdf_wizard/
├── main.go                 # Application entry point
├── app.go                  # Main application struct (thin wrapper around services)
├── services/              # Service layer for business logic
│   ├── file_service.go    # File selection and metadata operations
│   └── pdf_service.go     # PDF processing operations (merge, split, rotate)
├── models/                 # Data models
│   └── types.go           # PDFMetadata, SplitDefinition, RotateDefinition
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Main application component with tab navigation
│   │   ├── components/    # React components
│   │   │   ├── MergeTab.tsx
│   │   │   ├── SplitTab.tsx
│   │   │   └── RotateTab.tsx
│   │   ├── types/         # TypeScript type definitions
│   │   └── utils/         # Utility functions (formatters)
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

## Merge PDFs Tab - Detailed Design

### Functional Requirements

1. **File Selection**

   - Allow users to select multiple PDF files from the local file system
   - Support both file dialog selection and drag-and-drop
   - Validate that selected files are PDFs
   - Allow users to remove selected files

2. **File List Display**

   - Display all selected PDFs in a list/table format
   - Show for each file:
     - **File Path**: Full or relative path to the file
     - **File Size**: Human-readable format (e.g., "2.5 MB", "150 KB")
     - **Last Modified**: Timestamp of last modification (formatted date/time)
   - Support drag-and-drop reordering within the list
   - Provide visual feedback during drag operations (highlight drop zones)
   - Allow users to remove selected files
   - Show file order/position indicator (e.g., "1 of 5", "2 of 5")

3. **Output Directory Selection**

   - Allow users to select an output directory for the merged PDF
   - Display selected output directory path
   - Allow users to specify output filename via text input
   - Filename input box shows only the filename (without extension)
   - Static ".pdf" text displayed immediately after the input box
   - Default filename: "merged" (which becomes "merged.pdf")
   - Validate write permissions for selected directory

4. **Merge Actions**
   - "Merge PDFs" button displayed at the bottom of the tab
   - Button is only enabled when:
     - At least one PDF file is selected
     - Output directory is selected
     - Output filename is provided (non-empty)
   - Button shows processing state during merge
   - Progress indicator during merge operation
   - Success notification with path to merged file
   - Error notifications with descriptive messages

### UI Components

#### MergeTab Component

```typescript
interface SelectedFile {
  path: string;
  size: number; // bytes
  lastModified: Date;
  name: string; // filename only
}

interface MergeTabState {
  files: SelectedFile[];
  outputDirectory: string; // Selected output directory path
  outputFilename: string; // Output filename without extension (default: "merged")
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}
```

#### File List Component

- Material-UI `Paper` component containing a scrollable list with drag-and-drop support
- Uses `@dnd-kit` with `SortableContext` and `useSortable` hook for reordering
- Each list item displays:
  - Drag handle icon (`DragIndicatorIcon`) on the left
  - Order indicator (numbered "1", "2", "3", etc.)
  - Filename as subtitle
  - Full file path
  - File size and last modified timestamp
  - Remove button (`DeleteIcon`) on the right
- Visual feedback:
  - Highlight drag source item during drag
  - Background color change on drop zone
  - Cursor changes (grab/grabbing)
  - Smooth animations during reorder

### Backend API Design

#### Go Methods (bound to frontend)

```go
// File selection and metadata
SelectPDFFiles() ([]string, error)              // Opens file dialog, returns paths
GetFileMetadata(path string) (PDFMetadata, error)  // Gets file info (TotalPages=0 for merge operations)

// Output directory selection
SelectOutputDirectory() (string, error)        // Opens directory dialog, returns path

// PDF merging
MergePDFs(inputPaths []string, outputDirectory string, outputFilename string) error
```

**Note**: File removal and reordering are handled entirely in the frontend state. No backend methods are needed for these operations.

#### PDFMetadata Struct

```go
type PDFMetadata struct {
    Path         string `json:"path"`
    Name         string `json:"name"`
    Size         int64  `json:"size"`         // bytes
    LastModified string `json:"lastModified"` // ISO 8601 format (RFC3339)
    IsPDF        bool   `json:"isPDF"`
    TotalPages   int    `json:"totalPages"` // Total number of pages (0 for non-PDF files or when not needed)
}
```

**Note:** `FileMetadata` has been consolidated into `PDFMetadata` for consistency. When `TotalPages` is not needed (e.g., for merge operations), it is set to 0. The frontend converts `LastModified` from ISO string to `Date` object using `convertToSelectedFile()` utility function.

### File Selection Flow

1. **User clicks "Select PDF Files" button**

   - Calls `SelectPDFFiles()` from Go backend
   - Opens native file dialog (multi-select, PDF filter)
   - Returns array of file paths

2. **For each selected file path:**

   - Call `GetFileMetadata(path)` to get file information
   - Convert metadata to `SelectedFile` using `convertToSelectedFile()` utility
   - Add to `files` state array
   - Update UI to display new file

3. **Alternative: Drag and Drop File Selection**

   - Use Wails `OnFileDrop` runtime API
   - Filter for PDF files
   - Process same as file dialog selection

4. **Output Directory Selection Flow**

   - User clicks "Select Output Directory" button
   - Calls `SelectOutputDirectory()` from Go backend
   - Opens native directory dialog
   - Updates `outputDirectory` state
   - Displays selected directory path in UI

5. **File Reordering Flow (Drag-and-Drop)**

   - User drags a file item within the file list
   - Visual feedback shows drop target position (background color change)
   - On drop, reorder the `files` array in state
   - Update UI to reflect new order
   - Order determines merge sequence

6. **Merge Execution Flow**
   - User clicks "Merge PDFs" button (only enabled when files and output directory selected)
   - Set `isProcessing` to true and clear previous error/success messages
   - Call `MergePDFs(inputPaths, outputDirectory, outputFilename)`
   - Show loading indicator (CircularProgress) in button during processing
   - On success:
     - Show success Alert with output file path
     - Clear files list and reset filename to "merged"
   - On error: Display error Alert with descriptive message
   - Set `isProcessing` to false when complete

### File List Display

#### Data Formatting

- **File Size**: Format bytes to human-readable

  - < 1024: "X B"
  - < 1024²: "X KB"
  - < 1024³: "X MB"
  - > = 1024³: "X GB"

- **Last Modified**: Format timestamp

  - Format: "MMM DD, YYYY at HH:MM"
  - Example: "Nov 2, 2024 at 14:30"

- **Path Display**:
  - Show full path with tooltip on hover
  - Or show relative path if within reasonable length
  - Truncate long paths with ellipsis

#### UI Layout

```
┌────────────────────────────────────────────────────────────┐
│ [Select PDF Files] button                                  │
│ Or drag and drop PDF files anywhere on the window          │
├────────────────────────────────────────────────────────────┤
│ [Error/Success Alert messages if present]                  │
├────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────┐ │
│ │ File List (Scrollable Paper Container)                │ │
│ │                                                         │ │
│ │ [≡] 1  document1.pdf                          [×]     │ │
│ │      /Users/.../document1.pdf                          │ │
│ │      2.5 MB • Modified: Nov 2, 2024 at 14:30          │ │
│ │                                                         │ │
│ │ [≡] 2  document2.pdf                          [×]     │ │
│ │      /Users/.../document2.pdf                          │ │
│ │      1.2 MB • Modified: Nov 1, 2024 at 10:15          │ │
│ │                                                         │ │
│ │ (Empty state: "No files selected")                     │ │
│ └───────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ [Select Output Directory] button                           │
│ /Users/.../output/ (path displayed below button)           │
│                                                             │
│ Output Filename: [merged        ].pdf                       │
│                                                             │
│ [Merge PDFs] (full width, with loading indicator)          │
└────────────────────────────────────────────────────────────┘
```

- `[≡]` indicates draggable handle (`DragIndicatorIcon`)
- Numbers show merge order (1-based)
- Files can be reordered by dragging within the scrollable Paper container
- Error and Success messages use Material-UI `Alert` components
- "Merge PDFs" button is always visible at bottom but only enabled when:
  - At least one PDF file is selected
  - Output directory is selected
  - Output filename is provided (non-empty)
  - Not currently processing

### Implementation Details

#### Frontend Implementation

**Key Implementation Details:**

- Uses `onFileDrop` prop callback to register drag-and-drop handler with App component
- File removal and reordering handled entirely in frontend state
- Error and success messages displayed using Material-UI `Alert` components
- Files list rendered in scrollable `Paper` component with `@dnd-kit` sortable context
- Button shows `CircularProgress` spinner during processing
- Files cleared and filename reset after successful merge

**Main Components Used:**

- `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop file reordering
- Material-UI: `Box`, `Button`, `Typography`, `TextField`, `Paper`, `Alert`, `CircularProgress`, `IconButton`, `List`, `ListItem`
- Icons: `DeleteIcon`, `DragIndicatorIcon`, `CloudUploadIcon`, `FolderIcon`
- Utilities: `formatFileSize()`, `formatDate()`, `convertToSelectedFile()` from `utils/formatters`

**State Management:**

```typescript
const [files, setFiles] = useState<SelectedFile[]>([]);
const [outputDirectory, setOutputDirectory] = useState<string>('');
const [outputFilename, setOutputFilename] = useState<string>('merged');
const [isProcessing, setIsProcessing] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
```

**Key Functions:**

- `handleDroppedFiles()` - Processes files dropped on window
- `handleSelectFiles()` - Opens file dialog and adds selected files
- `handleDragEnd()` - Handles drag-and-drop reordering
- `handleRemoveFile()` - Removes file from list by index
- `handleMerge()` - Executes merge operation, clears files on success

#### Backend Implementation

**Service-Based Architecture:**

The backend uses a service-based architecture with separation of concerns:

- **App struct** (`app.go`): Thin wrapper that delegates to services, provides Wails bindings
- **FileService** (`services/file_service.go`): Handles file selection, directory selection, and file metadata operations
- **PDFService** (`services/pdf_service.go`): Handles all PDF processing operations (merge, split, rotate)

**File and Directory Selection (FileService):**

```go
// FileService handles file system operations
type FileService struct {
    ctx context.Context
}

func (s *FileService) SelectPDFFiles() ([]string, error) {
    selection, err := runtime.OpenMultipleFilesDialog(s.ctx, runtime.OpenDialogOptions{
        Title: "Select PDF Files",
        Filters: []runtime.FileFilter{
            {
                DisplayName: "PDF files",
                Pattern:     "*.pdf",
            },
        },
    })
    if err != nil {
        return nil, err
    }
    return selection, nil
}

func (s *FileService) SelectPDFFile() (string, error) {
    selection, err := runtime.OpenFileDialog(s.ctx, runtime.OpenDialogOptions{
        Title: "Select PDF File",
        Filters: []runtime.FileFilter{
            {
                DisplayName: "PDF files",
                Pattern:     "*.pdf",
            },
        },
    })
    if err != nil {
        return "", err
    }
    if selection == "" {
        return "", fmt.Errorf("no file selected")
    }
    return selection, nil
}

func (s *FileService) SelectOutputDirectory() (string, error) {
    selection, err := runtime.OpenDirectoryDialog(s.ctx, runtime.OpenDialogOptions{
        Title: "Select Output Directory",
    })
    if err != nil {
        return "", err
    }
    return selection, nil
}

func (s *FileService) GetFileMetadata(path string) (models.PDFMetadata, error) {
    info, err := os.Stat(path)
    if err != nil {
        return models.PDFMetadata{}, err
    }

    return models.PDFMetadata{
        Path:         path,
        Name:         filepath.Base(path),
        Size:         info.Size(),
        LastModified: info.ModTime().Format(time.RFC3339), // ISO 8601 format
        IsPDF:        strings.ToLower(filepath.Ext(path)) == ".pdf",
        TotalPages:   0, // Not needed for merge operations
    }, nil
}

func (s *FileService) GetPDFMetadata(path string) (models.PDFMetadata, error) {
    info, err := os.Stat(path)
    if err != nil {
        return models.PDFMetadata{}, err
    }

    // Get page count
    pageCount, err := s.GetPDFPageCount(path)
    if err != nil {
        return models.PDFMetadata{}, fmt.Errorf("failed to get page count: %w", err)
    }

    return models.PDFMetadata{
        Path:         path,
        Name:         filepath.Base(path),
        Size:         info.Size(),
        LastModified: info.ModTime().Format(time.RFC3339),
        IsPDF:        strings.ToLower(filepath.Ext(path)) == ".pdf",
        TotalPages:   pageCount,
    }, nil
}

func (s *FileService) GetPDFPageCount(path string) (int, error) {
    // Uses pdfcpu to read the PDF and get page count
    ctx, err := api.ReadContextFile(path)
    if err != nil {
        return 0, fmt.Errorf("failed to read PDF: %w", err)
    }
    return ctx.PageCount, nil
}
```

**PDF Processing (PDFService):**

```go
// PDFService handles PDF operations (merge, split, rotate)
type PDFService struct {
    fileService *FileService
}

// MergePDFs merges the given PDF files in order using pdfcpu library
func (s *PDFService) MergePDFs(inputPaths []string, outputDirectory string, outputFilename string) error {
    // Comprehensive validation of input files
    // ... (validation code)

    // Use pdfcpu to merge PDFs
    config := model.NewDefaultConfiguration()
    // dividerPage: false means no divider pages between merged PDFs
    err = api.MergeCreateFile(inputPaths, outputPath, false, config)
    // ... (error handling)
}

// SplitPDF splits the given PDF according to split definitions
func (s *PDFService) SplitPDF(inputPath string, splits []models.SplitDefinition, outputDirectory string) error {
    // Validation and processing using pdfcpu TrimFile API
    // ... (implementation)
}

// RotatePDF rotates specified page ranges in a PDF file
func (s *PDFService) RotatePDF(inputPath string, rotations []models.RotateDefinition, outputDirectory string, outputFilename string) error {
    // Creates temporary copy, applies rotations using pdfcpu RotateFile API
    // ... (implementation)
}
```

**App Wrapper (app.go):**

```go
// App struct acts as a thin wrapper around services for Wails binding
type App struct {
    fileService *services.FileService
    pdfService  *services.PDFService
}

func (a *App) startup(ctx context.Context) {
    // Initialize services with context
    fileService := services.NewFileService(ctx)
    pdfService := services.NewPDFService(fileService)

    a.fileService = fileService
    a.pdfService = pdfService
}

// All methods delegate to services
func (a *App) SelectPDFFiles() ([]string, error) {
    return a.fileService.SelectPDFFiles()
}

func (a *App) MergePDFs(inputPaths []string, outputDirectory string, outputFilename string) error {
    return a.pdfService.MergePDFs(inputPaths, outputDirectory, outputFilename)
}
// ... (other methods)
```

**Dependencies:**

- `github.com/pdfcpu/pdfcpu/pkg/api` - PDF processing library
- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model` - Configuration models
- `github.com/wailsapp/wails/v2/pkg/runtime` - File dialogs and runtime operations

#### File Size Formatting Utility

```typescript
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
```

#### Date Formatting Utility

```typescript
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

## Split PDFs Tab - Detailed Design

### Functional Requirements

1. **PDF Selection**

   - Allow user to select a single PDF file from the local file system
   - Support both file dialog selection and drag-and-drop
   - Validate that selected file is a PDF
   - Once a PDF is selected, display PDF information and show "Add Split" button (or plus sign icon)
   - Allow user to change/remove selected PDF

2. **PDF Information Display**

   - Display selected PDF metadata:
     - **File Path**: Full or relative path to the file
     - **File Size**: Human-readable format (e.g., "2.5 MB", "150 KB")
     - **Total Pages**: Number of pages in the PDF
     - **Last Modified**: Timestamp of last modification (formatted date/time)
   - Show PDF icon/badge
   - Display information in a clear, prominent card or section

3. **Split Management**

   - Display an "Add Split" button (or plus icon button) that appears after PDF is selected
   - Allow users to add splits to a list (up to 10 splits maximum)
   - Each split in the list displays:
     - **Start Page**: Number input field for starting page number
     - **End Page**: Number input field for ending page number
     - **File Name**: Text input field for output filename (without extension)
     - Static ".pdf" text displayed immediately after the filename input box
     - Default filename pattern: "file_1", "file_2", "file_3", etc. (based on split order)
     - Remove button (× or trash icon) to delete a split
   - Validate page ranges:
     - Start page must be >= 1 and <= total pages
     - End page must be >= start page and <= total pages
     - Page ranges cannot overlap (optional validation)
   - Show visual indicators for invalid page ranges
   - Display split order/position indicator (e.g., "Split 1", "Split 2")

4. **Output Directory Selection**

   - Allow users to select an output directory for the split PDFs
   - Display selected output directory path
   - Validate write permissions for selected directory

5. **Split Actions**
   - "Split PDFs" button displayed at the bottom of the tab
   - Button is only enabled when:
     - A PDF file is selected
     - At least one split is defined (with valid page ranges and filenames)
     - Output directory is selected
   - Button shows processing state during split operation
   - Progress indicator during split operation
   - Success notification with list of generated files and paths
   - Error notifications with descriptive messages

### UI Components

#### SplitTab Component

```typescript
interface SelectedPDF {
  path: string;
  size: number; // bytes
  lastModified: Date;
  name: string; // filename only
  totalPages: number;
}

interface SplitDefinition {
  id: string; // Unique identifier for the split
  startPage: number;
  endPage: number;
  filename: string; // Filename without extension (default: "file_1", "file_2", etc.)
}

interface SplitTabState {
  selectedPDF: SelectedPDF | null;
  splits: SplitDefinition[];
  outputDirectory: string; // Selected output directory path
  isProcessing: boolean;
  error: string | null;
  splitProgress: number; // 0.0 to 1.0
}
```

#### Split List Component

- Material-UI `List` or `Card` component for displaying splits
- Each split item shows:
  - Split number/order indicator (e.g., "Split 1", "Split 2")
  - Start page number input (number field)
  - End page number input (number field)
  - Filename input (text field)
  - Static ".pdf" label after filename input
  - Remove button (× or trash icon)
- Visual feedback:
  - Highlight invalid page ranges (e.g., out of bounds, end < start)
  - Show page range preview (e.g., "Pages 1-10" or "10 pages")
  - Disable inputs during processing
- Maximum of 10 splits allowed
- Disable "Add Split" button when maximum reached

### Backend API Design

#### Go Methods (bound to frontend)

```go
// PDF selection and metadata
SelectPDFFile() (string, error)                    // Opens file dialog, returns single path
GetPDFMetadata(path string) (PDFMetadata, error)   // Gets PDF info including page count

// PDF page count retrieval
GetPDFPageCount(path string) (int, error)          // Returns total number of pages

// Output directory selection
SelectOutputDirectory() (string, error)            // Opens directory dialog, returns path

// PDF splitting
SplitPDF(inputPath string, splits []SplitDefinition, outputDirectory string) error
GetSplitProgress() (float64, error)                 // 0.0 to 1.0
```

#### PDFMetadata Struct

```go
type PDFMetadata struct {
    Path         string `json:"path"`
    Name         string `json:"name"`
    Size         int64  `json:"size"`         // bytes
    LastModified string `json:"lastModified"` // ISO 8601 format (RFC3339)
    IsPDF        bool   `json:"isPDF"`
    TotalPages   int    `json:"totalPages"` // Total number of pages (0 for non-PDF files or when not needed)
}
```

**Note:** `FileMetadata` has been consolidated into `PDFMetadata` for consistency across the application.

#### SplitDefinition Struct

```go
type SplitDefinition struct {
    StartPage int    `json:"startPage"`           // 1-based page number
    EndPage   int    `json:"endPage"`             // 1-based page number (inclusive)
    Filename  string `json:"filename"`            // Filename without .pdf extension
}
```

### PDF Selection Flow

1. **User clicks "Select PDF File" button or drags PDF onto drop zone**

   - Calls `SelectPDFFile()` from Go backend
   - Opens native file dialog (single-select, PDF filter)
   - Returns file path

2. **For selected PDF:**

   - Call `GetPDFMetadata(path)` or `GetPDFPageCount(path)` to get PDF information including total pages
   - Update `selectedPDF` state
   - Display PDF information in UI
   - Show "Add Split" button
   - Enable split functionality

3. **Alternative: Drag and Drop PDF Selection**
   - Use Wails `OnFileDrop` runtime API
   - Filter for single PDF file (ignore if multiple files dropped)
   - Process same as file dialog selection

### Split Management Flow

1. **User clicks "Add Split" button**

   - Create new split definition with:
     - Default start page: 1 (or next available page if splits exist)
     - Default end page: Based on start page + suggested range or total pages
     - Default filename: "file_N" where N is the split number (1-indexed)
   - Add to `splits` state array
   - Update UI to display new split
   - If 10 splits reached, disable "Add Split" button

2. **User edits split details:**

   - Update start page: Validate against total pages, ensure <= end page
   - Update end page: Validate against total pages, ensure >= start page
   - Update filename: Validate non-empty, no invalid characters
   - Show validation errors inline if invalid

3. **User removes a split:**

   - Remove split from `splits` array
   - Update UI to reflect removal
   - Renumber remaining splits if needed (for display purposes)
   - Re-enable "Add Split" button if under 10 splits

4. **Output Directory Selection Flow**

   - User clicks "Select Output Directory" button
   - Calls `SelectOutputDirectory()` from Go backend
   - Opens native directory dialog
   - Updates `outputDirectory` state
   - Displays selected directory path in UI

5. **Split Execution Flow**
   - User clicks "Split PDFs" button (only enabled when PDF, splits, and output directory are selected)
   - Validate all splits:
     - All page ranges are valid (within 1 to totalPages, end >= start)
     - All filenames are non-empty and valid
     - No duplicate filenames (optional, to prevent overwriting)
   - Show progress indicator
   - Call `SplitPDF(inputPath, splits, outputDirectory)`
   - Monitor progress via `GetSplitProgress()` if available
   - On success: Show notification with list of generated files and paths
   - On error: Display error message to user

### UI Layout

```
┌────────────────────────────────────────────────────────────┐
│ Select PDF File                                            │
│ [Select PDF File] button                                   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Selected PDF Information:                                  │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ 📄 document.pdf                                       │ │
│ │ /Users/.../document.pdf                               │ │
│ │ 2.5 MB • 45 pages • Modified: Nov 2, 2024 at 14:30  │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ [➕ Add Split] button                                      │
│                                                             │
│ Split Definitions:                                          │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Split 1                                      [×]      │ │
│ │ Start Page: [  1  ]  End Page: [  10 ]  File Name: [file_1 ].pdf │ │
│ │ Pages 1-10 (10 pages)                                 │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Split 2                                      [×]      │ │
│ │ Start Page: [ 11  ]  End Page: [  25 ]  File Name: [file_2 ].pdf │ │
│ │ Pages 11-25 (15 pages)                                │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ (Add more splits up to 10 total)                           │
│                                                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Output Directory: /Users/.../output/ [Change...]           │
│                                                             │
│                    [Split PDFs]                            │
│                    (with bottom padding)                    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Implementation Details

#### Frontend Implementation

```typescript
// SplitTab.tsx structure
import { useState, useMemo } from 'react';
import { SelectPDFFile, GetPDFMetadata, SelectOutputDirectory, SplitPDF } from '../wailsjs/go/main/App';
import { OnFileDrop } from '../wailsjs/runtime/runtime';
import { Button, Box, TextField, Typography, IconButton, Card, CardContent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const MAX_SPLITS = 10;

const SplitTab = () => {
  const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
  const [splits, setSplits] = useState<SplitDefinition[]>([]);
  const [outputDirectory, setOutputDirectory] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleSelectPDF = async () => {
    try {
      const path = await SelectPDFFile();
      const metadata = await GetPDFMetadata(path);
      setSelectedPDF({
        path: metadata.path,
        name: metadata.name,
        size: metadata.size,
        lastModified: new Date(metadata.lastModified),
        totalPages: metadata.totalPages,
      });
      // Clear existing splits when new PDF is selected
      setSplits([]);
    } catch (error) {
      // Show error notification
    }
  };

  const handleAddSplit = () => {
    if (splits.length >= MAX_SPLITS || !selectedPDF) return;

    const splitNumber = splits.length + 1;
    const lastEndPage = splits.length > 0 ? splits[splits.length - 1].endPage : 0;

    const newSplit: SplitDefinition = {
      id: `split-${Date.now()}-${splitNumber}`,
      startPage: lastEndPage + 1,
      endPage: Math.min(lastEndPage + 10, selectedPDF.totalPages),
      filename: `file_${splitNumber}`,
    };

    setSplits((prev) => [...prev, newSplit]);
  };

  const handleRemoveSplit = (id: string) => {
    setSplits((prev) => prev.filter((split) => split.id !== id));
  };

  const handleUpdateSplit = (id: string, field: keyof SplitDefinition, value: string | number) => {
    setSplits((prev) => prev.map((split) => (split.id === id ? { ...split, [field]: value } : split)));
  };

  const validateSplit = (split: SplitDefinition): boolean => {
    if (!selectedPDF) return false;
    return (
      split.startPage >= 1 &&
      split.startPage <= selectedPDF.totalPages &&
      split.endPage >= split.startPage &&
      split.endPage <= selectedPDF.totalPages &&
      split.filename.trim().length > 0
    );
  };

  const handleSelectOutputDirectory = async () => {
    try {
      const dir = await SelectOutputDirectory();
      setOutputDirectory(dir);
    } catch (error) {
      // Show error notification
    }
  };

  const handleSplit = async () => {
    if (!selectedPDF || splits.length === 0 || !outputDirectory) return;

    // Validate all splits
    const invalidSplits = splits.filter((split) => !validateSplit(split));
    if (invalidSplits.length > 0) {
      // Show validation error
      return;
    }

    setIsProcessing(true);
    try {
      const splitDefinitions = splits.map((split) => ({
        startPage: split.startPage,
        endPage: split.endPage,
        filename: split.filename.trim(),
      }));

      await SplitPDF(selectedPDF.path, splitDefinitions, outputDirectory);
      // Show success notification with list of generated files
    } catch (error) {
      // Show error notification
    } finally {
      setIsProcessing(false);
    }
  };

  const canAddSplit = splits.length < MAX_SPLITS && selectedPDF !== null;
  const canSplit =
    selectedPDF !== null &&
    splits.length > 0 &&
    outputDirectory.length > 0 &&
    splits.every(validateSplit) &&
    !isProcessing;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
      <Button onClick={handleSelectPDF} variant="outlined">
        Select PDF File
      </Button>

      {selectedPDF && (
        <>
          <Card>
            <CardContent>
              <Typography variant="h6">📄 {selectedPDF.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedPDF.path}
              </Typography>
              <Typography variant="body2">
                {formatFileSize(selectedPDF.size)} • {selectedPDF.totalPages} pages • Modified:{' '}
                {formatDate(selectedPDF.lastModified)}
              </Typography>
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button onClick={handleAddSplit} disabled={!canAddSplit} startIcon={<AddIcon />} variant="outlined">
              Add Split
            </Button>
            <Typography variant="body2" color="text.secondary">
              {splits.length} / {MAX_SPLITS} splits
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {splits.map((split, index) => {
              const isValid = validateSplit(split);
              const pageCount = split.endPage - split.startPage + 1;

              return (
                <Card key={split.id} sx={{ border: isValid ? 'none' : '2px solid red' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1">Split {index + 1}</Typography>
                      <IconButton onClick={() => handleRemoveSplit(split.id)} size="small" disabled={isProcessing}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                      <TextField
                        label="Start Page"
                        type="number"
                        value={split.startPage}
                        onChange={(e) => handleUpdateSplit(split.id, 'startPage', parseInt(e.target.value) || 1)}
                        inputProps={{ min: 1, max: selectedPDF.totalPages }}
                        size="small"
                        error={!isValid}
                        disabled={isProcessing}
                        sx={{ width: '120px' }}
                      />
                      <TextField
                        label="End Page"
                        type="number"
                        value={split.endPage}
                        onChange={(e) => handleUpdateSplit(split.id, 'endPage', parseInt(e.target.value) || 1)}
                        inputProps={{ min: split.startPage, max: selectedPDF.totalPages }}
                        size="small"
                        error={!isValid}
                        disabled={isProcessing}
                        sx={{ width: '120px' }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">File Name:</Typography>
                      <TextField
                        value={split.filename}
                        onChange={(e) => handleUpdateSplit(split.id, 'filename', e.target.value)}
                        placeholder="file_1"
                        size="small"
                        error={split.filename.trim().length === 0}
                        disabled={isProcessing}
                        sx={{ flexGrow: 1, maxWidth: '300px' }}
                      />
                      <Typography variant="body2">.pdf</Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Pages {split.startPage}-{split.endPage} ({pageCount} pages)
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </>
      )}

      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Button onClick={handleSelectOutputDirectory} variant="outlined" sx={{ mb: 1 }}>
          Select Output Directory
        </Button>
        {outputDirectory && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {outputDirectory}
          </Typography>
        )}

        <Button variant="contained" onClick={handleSplit} disabled={!canSplit} sx={{ width: '100%' }}>
          {isProcessing ? 'Splitting...' : 'Split PDFs'}
        </Button>
      </Box>
    </Box>
  );
};
```

#### Backend Implementation

**Note:** The backend implementation uses the service-based architecture described in the Merge PDFs Tab section. The App struct delegates to FileService and PDFService.

**PDF Splitting (PDFService):**

```go
// SplitPDF splits the given PDF according to split definitions
func (s *PDFService) SplitPDF(inputPath string, splits []models.SplitDefinition, outputDirectory string) error {
    // Validate input file exists
    if _, err := os.Stat(inputPath); os.IsNotExist(err) {
        return fmt.Errorf("input file not found: %s", inputPath)
    }

    // Check if file has .pdf extension
    if strings.ToLower(filepath.Ext(inputPath)) != ".pdf" {
        return fmt.Errorf("input file is not a PDF: %s", inputPath)
    }

    // Validate output directory exists and is writable
    info, err := os.Stat(outputDirectory)
    if os.IsNotExist(err) {
        return fmt.Errorf("output directory does not exist: %s", outputDirectory)
    }
    if err != nil {
        return fmt.Errorf("error accessing output directory: %w", err)
    }
    if !info.IsDir() {
        return fmt.Errorf("output path is not a directory: %s", outputDirectory)
    }

    // Get PDF page count for validation
    totalPages, err := s.fileService.GetPDFPageCount(inputPath)
    if err != nil {
        return fmt.Errorf("failed to get page count: %w", err)
    }

    // Validate all splits
    for i, split := range splits {
        if split.StartPage < 1 || split.StartPage > totalPages {
            return fmt.Errorf("split %d: start page %d is out of range (1-%d)", i+1, split.StartPage, totalPages)
        }
        if split.EndPage < split.StartPage || split.EndPage > totalPages {
            return fmt.Errorf("split %d: end page %d is invalid (must be >= start page and <= %d)", i+1, split.EndPage, totalPages)
        }
        if strings.TrimSpace(split.Filename) == "" {
            return fmt.Errorf("split %d: filename cannot be empty", i+1)
        }
    }

    // Check for duplicate filenames
    filenameMap := make(map[string]bool)
    for _, split := range splits {
        filename := strings.TrimSpace(split.Filename) + ".pdf"
        if filenameMap[filename] {
            return fmt.Errorf("duplicate filename: %s", filename)
        }
        filenameMap[filename] = true
    }

    // Use pdfcpu to split the PDF
    config := model.NewDefaultConfiguration()

    // Process each split
    for i, split := range splits {
        // Create output path
        outputPath := filepath.Join(outputDirectory, strings.TrimSpace(split.Filename)+".pdf")

        // Remove existing output file if it exists
        if _, err := os.Stat(outputPath); err == nil {
            if err := os.Remove(outputPath); err != nil {
                return fmt.Errorf("failed to remove existing output file: %w", err)
            }
        }

        // Use TrimFile to extract the page range
        // pdfcpu uses 1-based page numbers and TrimFile keeps only the specified pages
        pageRange := fmt.Sprintf("%d-%d", split.StartPage, split.EndPage)
        err := api.TrimFile(inputPath, outputPath, []string{pageRange}, config)
        if err != nil {
            return fmt.Errorf("failed to trim pages for split %d (pages %d-%d): %w", i+1, split.StartPage, split.EndPage, err)
        }

        // Validate the split file was created
        if _, err := os.Stat(outputPath); os.IsNotExist(err) {
            return fmt.Errorf("split file was not created at: %s", outputPath)
        }
    }

    return nil
}
```

**App Wrapper (app.go):**

```go
// SplitPDF splits the given PDF according to split definitions
func (a *App) SplitPDF(inputPath string, splits []models.SplitDefinition, outputDirectory string) error {
    return a.pdfService.SplitPDF(inputPath, splits, outputDirectory)
}
```

#### Page Range Validation

```typescript
function validatePageRange(
  startPage: number,
  endPage: number,
  totalPages: number,
): { isValid: boolean; error?: string } {
  if (startPage < 1 || startPage > totalPages) {
    return {
      isValid: false,
      error: `Start page must be between 1 and ${totalPages}`,
    };
  }

  if (endPage < startPage || endPage > totalPages) {
    return {
      isValid: false,
      error: `End page must be between ${startPage} and ${totalPages}`,
    };
  }

  return { isValid: true };
}
```

#### Filename Validation

```typescript
function validateFilename(filename: string): { isValid: boolean; error?: string } {
  if (filename.trim().length === 0) {
    return { isValid: false, error: 'Filename cannot be empty' };
  }

  // Check for invalid characters (platform-specific)
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(filename)) {
    return {
      isValid: false,
      error: 'Filename contains invalid characters',
    };
  }

  return { isValid: true };
}
```

## Rotate PDF Tab - Detailed Design

### Functional Requirements

1. **PDF Selection**

   - Allow user to select a single PDF file from the local file system
   - Support both file dialog selection and drag-and-drop
   - Validate that selected file is a PDF
   - Once a PDF is selected, display PDF information and show "Add Rotate" button
   - Allow user to change/remove selected PDF

2. **PDF Information Display**

   - Display selected PDF metadata:
     - **File Path**: Full or relative path to the file
     - **File Size**: Human-readable format (e.g., "2.5 MB", "150 KB")
     - **Total Pages**: Number of pages in the PDF
     - **Last Modified**: Timestamp of last modification (formatted date/time)
   - Show PDF icon/badge
   - Display information in a clear, prominent card or section

3. **Rotation Management**

   - Display an "Add Rotate" button that appears after PDF is selected
   - Allow users to add rotations to a list (up to 10 rotations maximum)
   - Each rotation in the list displays:
     - **Start Page**: Number input field for starting page number
     - **End Page**: Number input field for ending page number
     - **Rotation**: Dropdown/select field for rotation angle (90°, -90°, or 180°)
     - Remove button (× or trash icon) to delete a rotation
   - Validate page ranges:
     - Start page must be >= 1 and <= total pages
     - End page must be >= start page and <= total pages
   - Show visual indicators for invalid page ranges
   - Display rotation order/position indicator (e.g., "Rotation 1", "Rotation 2")
   - Default rotation angle: +90° (clockwise)

4. **Output Directory Selection**

   - Allow users to select an output directory for the rotated PDF
   - Display selected output directory path
   - Allow users to specify output filename via text input
   - Filename input box shows only the filename (without extension)
   - Static ".pdf" text displayed immediately after the input box
   - Default filename: "rotated" (which becomes "rotated.pdf")
   - Validate write permissions for selected directory

5. **Rotate Actions**
   - "Rotate PDF" button displayed at the bottom of the tab
   - Button is only enabled when:
     - A PDF file is selected
     - At least one rotation is defined (with valid page ranges)
     - Output directory is selected
     - Output filename is provided (non-empty)
   - Button shows processing state during rotate operation
   - Progress indicator during rotate operation
   - Success notification with output file path
   - Error notifications with descriptive messages

### UI Components

#### RotateTab Component

```typescript
interface SelectedPDF {
  path: string;
  size: number; // bytes
  lastModified: Date;
  name: string; // filename only
  totalPages: number;
}

interface RotateDefinition {
  id: string; // Unique identifier for the rotation
  startPage: number;
  endPage: number;
  rotation: number; // Rotation angle: 90, -90, or 180
}

interface RotateTabState {
  selectedPDF: SelectedPDF | null;
  rotations: RotateDefinition[];
  outputDirectory: string; // Selected output directory path
  outputFilename: string; // Output filename without extension (default: "rotated")
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}
```

#### Rotation List Component

- Material-UI `Paper` component containing a scrollable list
- Each rotation item shows:
  - Rotation number/order indicator (e.g., "Rotation 1", "Rotation 2")
  - Start page number input (number field)
  - End page number input (number field)
  - Rotation angle dropdown (Select with options: +90°, -90°, 180°)
  - Remove button (× or trash icon)
- Visual feedback:
  - Highlight invalid page ranges (e.g., out of bounds, end < start)
  - Show page range preview (e.g., "Pages 1-10 (10 pages) • +90°")
  - Disable inputs during processing
- Maximum of 10 rotations allowed
- Disable "Add Rotate" button when maximum reached

### Backend API Design

#### Go Methods (bound to frontend)

```go
// PDF selection and metadata (shared with SplitTab)
SelectPDFFile() (string, error)                    // Opens file dialog, returns single path
GetPDFMetadata(path string) (PDFMetadata, error)   // Gets PDF info including page count

// Output directory selection (shared with other tabs)
SelectOutputDirectory() (string, error)            // Opens directory dialog, returns path

// PDF rotation
RotatePDF(inputPath string, rotations []RotateDefinition, outputDirectory string, outputFilename string) error
```

#### RotateDefinition Struct

```go
type RotateDefinition struct {
    StartPage int `json:"startPage"` // 1-based page number
    EndPage   int `json:"endPage"`   // 1-based page number (inclusive)
    Rotation  int `json:"rotation"`  // Rotation angle: 90, -90, or 180
}
```

### PDF Selection Flow

1. **User clicks "Select PDF File" button or drags PDF onto window**

   - Calls `SelectPDFFile()` from Go backend
   - Opens native file dialog (single-select, PDF filter)
   - Returns file path

2. **For selected PDF:**

   - Call `GetPDFMetadata(path)` to get PDF information including total pages
   - Update `selectedPDF` state
   - Display PDF information in UI
   - Show "Add Rotate" button
   - Enable rotation functionality

3. **Alternative: Drag and Drop PDF Selection**
   - Use Wails `OnFileDrop` runtime API (handled at App level)
   - Filter for single PDF file (ignore if multiple files dropped)
   - Process same as file dialog selection

### Rotation Management Flow

1. **User clicks "Add Rotate" button**

   - Create new rotation definition with:
     - Default start page: Next available page after last rotation (or 1 if first)
     - Default end page: Based on start page + suggested range or total pages
     - Default rotation: 90° (clockwise)
   - Add to `rotations` state array
   - Update UI to display new rotation
   - If 10 rotations reached, disable "Add Rotate" button

2. **User edits rotation details:**

   - Update start page: Validate against total pages, ensure <= end page
   - Update end page: Validate against total pages, ensure >= start page
   - Update rotation: Select from dropdown (90°, -90°, or 180°)
   - Show validation errors inline if invalid

3. **User removes a rotation:**

   - Remove rotation from `rotations` array
   - Update UI to reflect removal
   - Re-enable "Add Rotate" button if under 10 rotations

4. **Output Directory Selection Flow**

   - User clicks "Select Output Directory" button
   - Calls `SelectOutputDirectory()` from Go backend
   - Opens native directory dialog
   - Updates `outputDirectory` state
   - Displays selected directory path in UI

5. **Rotate Execution Flow**
   - User clicks "Rotate PDF" button (only enabled when PDF, rotations, and output directory are selected)
   - Validate all rotations:
     - All page ranges are valid (within 1 to totalPages, end >= start)
     - All rotation angles are valid (90, -90, or 180)
   - Show progress indicator
   - Call `RotatePDF(inputPath, rotations, outputDirectory, outputFilename)`
   - On success: Show notification with output file path, clear PDF and rotations, reset filename to "rotated"
   - On error: Display error message to user

### UI Layout

```
┌────────────────────────────────────────────────────────────┐
│ Select PDF File                                            │
│ [Select PDF File] button                                   │
│ Or drag and drop a PDF file anywhere on the window         │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Selected PDF Information:                                  │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ 📄 document.pdf                                       │ │
│ │ /Users/.../document.pdf                               │ │
│ │ 2.5 MB • 45 pages • Modified: Nov 2, 2024 at 14:30  │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ [➕ Add Rotate] button                                     │
│                                                             │
│ Rotation Definitions:                                       │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Rotation 1                                  [×]      │ │
│ │ Start Page: [  1  ]  End Page: [  10 ]               │ │
│ │ Rotation: [ +90° (Clockwise) ▼ ]                     │ │
│ │ Pages 1-10 (10 pages) • +90°                         │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌───────────────────────────────────────────────────────┐ │
│ │ Rotation 2                                  [×]      │ │
│ │ Start Page: [ 11  ]  End Page: [  25 ]               │ │
│ │ Rotation: [ 180° (Upside down) ▼ ]                   │ │
│ │ Pages 11-25 (15 pages) • 180°                        │ │
│ └───────────────────────────────────────────────────────┘ │
│                                                             │
│ (Add more rotations up to 10 total)                        │
│                                                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│ Output Directory: /Users/.../output/ [Change...]           │
│                                                             │
│ Output Filename: [rotated        ].pdf                      │
│                                                             │
│                    [Rotate PDF]                            │
│                    (with bottom padding)                    │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Implementation Details

#### Frontend Implementation

**Key Implementation Details:**

- Uses `onFileDrop` prop callback to register drag-and-drop handler with App component
- Rotation removal and editing handled entirely in frontend state
- Error and success messages displayed using Material-UI `Alert` components
- Rotations list rendered in scrollable `Paper` component
- Button shows `CircularProgress` spinner during processing
- PDF cleared, rotations cleared, and filename reset after successful rotation

**Main Components Used:**

- Material-UI: `Box`, `Button`, `Typography`, `TextField`, `Paper`, `Alert`, `CircularProgress`, `IconButton`, `Card`, `CardContent`, `Select`, `MenuItem`, `FormControl`, `InputLabel`
- Icons: `DeleteIcon`, `AddIcon`, `CloudUploadIcon`, `FolderIcon`
- Utilities: `formatFileSize()`, `formatDate()` from `utils/formatters`

**State Management:**

```typescript
const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
const [rotations, setRotations] = useState<RotateDefinition[]>([]);
const [outputDirectory, setOutputDirectory] = useState<string>('');
const [outputFilename, setOutputFilename] = useState<string>('rotated');
const [isProcessing, setIsProcessing] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
```

**Key Functions:**

- `handleDroppedPDF()` - Processes PDF dropped on window
- `handleSelectPDF()` - Opens file dialog and loads PDF metadata
- `handleAddRotate()` - Adds new rotation definition
- `handleRemoveRotate()` - Removes rotation from list
- `handleUpdateRotate()` - Updates rotation field (startPage, endPage, rotation)
- `validateRotate()` - Validates rotation configuration
- `handleRotate()` - Executes rotate operation, clears state on success

#### Backend Implementation

**PDF Rotation:**

```go
// RotatePDF rotates specified page ranges in a PDF file
func (s *PDFService) RotatePDF(inputPath string, rotations []models.RotateDefinition, outputDirectory string, outputFilename string) error {
    // Validate input file exists
    if _, err := os.Stat(inputPath); os.IsNotExist(err) {
        return fmt.Errorf("input file not found: %s", inputPath)
    }

    // Check if file has .pdf extension
    if strings.ToLower(filepath.Ext(inputPath)) != ".pdf" {
        return fmt.Errorf("input file is not a PDF: %s", inputPath)
    }

    // Validate output directory exists and is writable
    info, err := os.Stat(outputDirectory)
    if os.IsNotExist(err) {
        return fmt.Errorf("output directory does not exist: %s", outputDirectory)
    }
    if err != nil {
        return fmt.Errorf("error accessing output directory: %w", err)
    }
    if !info.IsDir() {
        return fmt.Errorf("output path is not a directory: %s", outputDirectory)
    }

    // Validate output filename
    if strings.TrimSpace(outputFilename) == "" {
        return fmt.Errorf("output filename cannot be empty")
    }

    // Get PDF page count for validation
    totalPages, err := s.fileService.GetPDFPageCount(inputPath)
    if err != nil {
        return fmt.Errorf("failed to get page count: %w", err)
    }

    // Validate all rotations
    for i, rotation := range rotations {
        if rotation.StartPage < 1 || rotation.StartPage > totalPages {
            return fmt.Errorf("rotation %d: start page %d is out of range (1-%d)", i+1, rotation.StartPage, totalPages)
        }
        if rotation.EndPage < rotation.StartPage || rotation.EndPage > totalPages {
            return fmt.Errorf("rotation %d: end page %d is invalid (must be >= start page and <= %d)", i+1, rotation.EndPage, totalPages)
        }
        // Validate rotation angle: 90, -90, or 180
        if rotation.Rotation != 90 && rotation.Rotation != -90 && rotation.Rotation != 180 {
            return fmt.Errorf("rotation %d: invalid rotation angle %d (must be 90, -90, or 180)", i+1, rotation.Rotation)
        }
    }

    // outputFilename from frontend does not include .pdf extension
    // Always append .pdf extension
    outputPath := filepath.Join(outputDirectory, outputFilename+".pdf")

    // Create a temporary copy of the input file for rotation operations
    // pdfcpu RotateFile modifies the file in place, so we need to work with a copy
    tempPath := outputPath + ".tmp"
    if err := copyFile(inputPath, tempPath); err != nil {
        return fmt.Errorf("failed to create temporary copy: %w", err)
    }
    defer os.Remove(tempPath) // Clean up temp file

    // Use pdfcpu to rotate pages
    config := model.NewDefaultConfiguration()

    // Process each rotation
    for i, rotation := range rotations {
        // Build page selection string (e.g., "1-5" for pages 1 to 5)
        pageSelection := fmt.Sprintf("%d-%d", rotation.StartPage, rotation.EndPage)

        // Rotate the pages
        // pdfcpu uses degrees, and RotateFile rotates the selected pages
        err := api.RotateFile(tempPath, "", rotation.Rotation, []string{pageSelection}, config)
        if err != nil {
            return fmt.Errorf("failed to rotate pages for rotation %d (pages %d-%d, angle %d): %w", i+1, rotation.StartPage, rotation.EndPage, rotation.Rotation, err)
        }
    }

    // Remove existing output file if it exists
    if _, err := os.Stat(outputPath); err == nil {
        if err := os.Remove(outputPath); err != nil {
            return fmt.Errorf("failed to remove existing output file: %w", err)
        }
    }

    // Move the temporary file to the final output location
    if err := os.Rename(tempPath, outputPath); err != nil {
        return fmt.Errorf("failed to move rotated file to output location: %w", err)
    }

    // Validate the rotated file was created
    if _, err := os.Stat(outputPath); os.IsNotExist(err) {
        return fmt.Errorf("rotated file was not created at: %s", outputPath)
    }

    return nil
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
    sourceFile, err := os.Open(src)
    if err != nil {
        return err
    }
    defer sourceFile.Close()

    destFile, err := os.Create(dst)
    if err != nil {
        return err
    }
    defer destFile.Close()

    _, err = destFile.ReadFrom(sourceFile)
    return err
}
```

**Key Implementation Notes:**

- Uses temporary file copy because pdfcpu's `RotateFile` modifies files in place
- Multiple rotations are applied sequentially to the same temporary file
- Final output file is created by renaming the temporary file after all rotations are applied
- All rotations are validated before processing begins

## Technical Considerations

### Dependencies

**Go Backend:**

- `github.com/wailsapp/wails/v2` - Wails framework
- `github.com/wailsapp/wails/v2/pkg/runtime` - File dialogs and runtime operations
- `github.com/pdfcpu/pdfcpu/pkg/api` - PDF processing library
- `github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model` - Configuration models

**Frontend:**

- React 18+
- Material-UI v7
- TypeScript
- Wails runtime bindings
- `@dnd-kit/core`, `@dnd-kit/sortable`, and `@dnd-kit/utilities` - For drag-and-drop file reordering (replaced deprecated react-beautiful-dnd)

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

## Implementation Phases

### Phase 1: Merge Tab - Basic Functionality

1. Tab structure and navigation
2. File selection dialog and drag-and-drop file selection
3. File list display with metadata
4. Output directory selection
5. Merge button with basic merge functionality

### Phase 2: Merge Tab - Enhanced UI

1. Drag-and-drop file reordering (within list)
2. Output directory selection UI
3. Better error handling and validation
4. Progress indicators and status messages
5. Success/error notifications

### Phase 3: Split Tab

1. Implement split tab UI
2. Split functionality
3. Output configuration

### Phase 4: Rotate Tab

1. Implement rotate tab UI
2. Rotation functionality
3. Output configuration

### Phase 5: Polish & Optimization

1. Performance optimization
2. Enhanced error messages
3. User feedback improvements
4. Documentation

## Notes

- Uses Wails runtime package (`pkg/runtime`) for native file dialogs
- Leverages Wails `OnFileDrop` API for drag-and-drop (handled at App level)
- Material-UI components for consistent UI
- TypeScript for type safety
- Go structs with JSON tags for data exchange
- Service-based architecture for separation of concerns
- pdfcpu library for all PDF processing operations (merge, split, rotate)
- @dnd-kit library for drag-and-drop file reordering in Merge tab (modern replacement for deprecated react-beautiful-dnd)
