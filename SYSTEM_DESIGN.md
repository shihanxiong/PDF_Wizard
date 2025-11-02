# PDF Wizard System Design Document

## Overview

PDF Wizard is a desktop application built with Wails v2 that provides PDF manipulation capabilities, specifically merging and splitting PDF files. The application uses a Go backend for file operations and a React/TypeScript frontend with Material-UI for the user interface.

## Architecture

### Technology Stack

- **Backend**: Go 1.21+ with Wails v2.8.1+
- **Frontend**: React 18+ with TypeScript, Material-UI (MUI) v5
- **PDF Processing**: PyPDF2 (via Go bindings) or native Go PDF libraries
- **Build Tool**: Wails CLI
- **UI Framework**: Material-UI with styled-components

### Project Structure

```
pdf_wizard/
├── main.go                 # Application entry point
├── app.go                  # Main application struct and business logic
├── services/               # PDF processing services
│   ├── merger.go          # PDF merging service
│   └── splitter.go        # PDF splitting service
├── models/                 # Data models
│   └── file.go            # File metadata models
├── frontend/
│   ├── src/
│   │   ├── App.tsx        # Main application component
│   │   ├── components/    # React components
│   │   │   ├── MergeTab.tsx
│   │   │   ├── SplitTab.tsx
│   │   │   └── FileList.tsx
│   │   └── types/         # TypeScript type definitions
│   └── wailsjs/           # Auto-generated Wails bindings
└── go.mod                  # Go dependencies
```

## User Interface Design

### Tab-Based Layout

The application will feature a tabbed interface with two main tabs:

1. **Merge PDFs Tab** - For combining multiple PDF files
2. **Split PDFs Tab** - For dividing a PDF into multiple files

### Tab Component Structure

```
┌─────────────────────────────────────────┐
│  [Merge PDFs] [Split PDFs]              │
├─────────────────────────────────────────┤
│                                         │
│  Tab Content Area                       │
│                                         │
└─────────────────────────────────────────┘
```

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
  selectedFiles: SelectedFile[];
  outputDirectory: string; // Selected output directory path
  outputFilename: string; // Output filename without extension (default: "merged")
  isProcessing: boolean;
  error: string | null;
  mergeProgress: number; // 0.0 to 1.0
}
```

#### File List Component

- Material-UI `List` component with drag-and-drop support
- Uses `react-beautiful-dnd` or Material-UI's `DragDropContext` for reordering
- Each list item shows:
  - Drag handle icon (grip indicator)
  - Order indicator (e.g., "1", "2", "3")
  - File icon/PDF badge
  - Filename (truncated if too long)
  - Full path (expandable/tooltip)
  - File size
  - Last modified timestamp
  - Remove button (× or trash icon)
- Visual feedback:
  - Highlight drag source item
  - Show drop indicator between items
  - Animate position changes during reorder

### Backend API Design

#### Go Methods (bound to frontend)

```go
// File selection and metadata
SelectPDFFiles() ([]string, error)              // Opens file dialog, returns paths
GetFileMetadata(path string) (FileMetadata, error)  // Gets file info

// Output directory selection
SelectOutputDirectory() (string, error)        // Opens directory dialog, returns path

// File operations
RemoveFile(path string) error
ReorderFiles(paths []string) error             // Updates file order (used internally)

// PDF merging
MergePDFs(inputPaths []string, outputDirectory string, outputFilename string) error
GetMergeProgress() (float64, error)             // 0.0 to 1.0
```

#### FileMetadata Struct

```go
type FileMetadata struct {
    Path        string    `json:"path"`
    Name        string    `json:"name"`
    Size        int64     `json:"size"`         // bytes
    LastModified time.Time `json:"lastModified"`
    IsPDF       bool      `json:"isPDF"`
}
```

### File Selection Flow

1. **User clicks "Select PDF Files" button**

   - Calls `SelectPDFFiles()` from Go backend
   - Opens native file dialog (multi-select, PDF filter)
   - Returns array of file paths

2. **For each selected file path:**

   - Call `GetFileMetadata(path)` to get file information
   - Add to `selectedFiles` state array
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
   - Visual feedback shows drop target position
   - On drop, reorder the `selectedFiles` array
   - Update UI to reflect new order
   - Order determines merge sequence

6. **Merge Execution Flow**
   - User clicks "Merge PDFs" button (only enabled when files and output directory selected)
   - Validate all files are accessible
   - Show progress indicator
   - Call `MergePDFs(inputPaths, outputDirectory, outputFilename)`
   - Monitor progress via `GetMergeProgress()` if available
   - On success: Show notification with output file path
   - On error: Display error message to user

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

#### UI Layout Options

**Option 1: Table View**

```
┌────────────────────────────────────────────────────────────┐
│ File Name     │ Path                    │ Size  │ Modified│
├────────────────────────────────────────────────────────────┤
│ document1.pdf │ /Users/.../docs/...     │ 2.5MB │ Nov 2... │
│ document2.pdf │ /Users/.../docs/...     │ 1.2MB │ Nov 1... │
└────────────────────────────────────────────────────────────┘
```

**Option 2: Drag-and-Drop List View (Recommended)**

```
┌────────────────────────────────────────────────────────────┐
│ [≡] 1. 📄 document1.pdf              [×]                  │
│      /Users/.../document1.pdf                              │
│      2.5 MB • Modified: Nov 2, 2024 at 14:30               │
├────────────────────────────────────────────────────────────┤
│ [≡] 2. 📄 document2.pdf              [×]                  │
│      /Users/.../document2.pdf                              │
│      1.2 MB • Modified: Nov 1, 2024 at 10:15               │
└────────────────────────────────────────────────────────────┘

Output Directory: /Users/.../output/ [Change...]
Output Filename: [merged        ].pdf

                    [Merge PDFs]
```

- `[≡]` indicates draggable handle
- Numbers show merge order
- Files can be reordered by dragging
- "Merge PDFs" button is always visible at bottom but only enabled when:
  - At least one PDF file is selected
  - Output directory is selected

### Implementation Details

#### Frontend Implementation

```typescript
// MergeTab.tsx structure
import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { SelectPDFFiles, GetFileMetadata, SelectOutputDirectory, MergePDFs } from '../wailsjs/go/main/App';
import { OnFileDrop } from '../wailsjs/runtime/runtime';
import { Button, Box, TextField, Typography } from '@mui/material';

const MergeTab = () => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [outputDirectory, setOutputDirectory] = useState<string>('');
  const [outputFilename, setOutputFilename] = useState<string>('merged'); // Filename without extension
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleSelectFiles = async () => {
    const paths = await SelectPDFFiles();
    // Process paths and get metadata for each
    const metadataPromises = paths.map((path) => GetFileMetadata(path));
    const metadataResults = await Promise.all(metadataPromises);
    setFiles((prev) => [...prev, ...metadataResults]);
  };

  const handleSelectOutputDirectory = async () => {
    const dir = await SelectOutputDirectory();
    setOutputDirectory(dir);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFiles(items);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (files.length === 0 || !outputDirectory || !outputFilename.trim()) return;

    setIsProcessing(true);
    try {
      const filePaths = files.map((f) => f.path);
      // outputFilename is sent without .pdf extension, backend will append it
      await MergePDFs(filePaths, outputDirectory, outputFilename.trim());
      // Show success notification
    } catch (error) {
      // Show error notification
    } finally {
      setIsProcessing(false);
    }
  };

  const canMerge = files.length > 0 && outputDirectory.length > 0 && outputFilename.trim().length > 0 && !isProcessing;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Button onClick={handleSelectFiles}>Select PDF Files</Button>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="file-list">
          {(provided) => (
            <Box {...provided.droppableProps} ref={provided.innerRef}>
              {files.map((file, index) => (
                <Draggable key={file.path} draggableId={file.path} index={index}>
                  {(provided) => (
                    <Box ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                      {/* File list item */}
                    </Box>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      </DragDropContext>

      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Button onClick={handleSelectOutputDirectory}>Select Output Directory</Button>
        {outputDirectory && <Typography variant="body2">{outputDirectory}</Typography>}

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
          <Typography variant="body2">Output Filename:</Typography>
          <TextField
            value={outputFilename}
            onChange={(e) => setOutputFilename(e.target.value)}
            size="small"
            placeholder="merged"
            sx={{ width: '200px' }}
          />
          <Typography variant="body2">.pdf</Typography>
        </Box>

        <Button variant="contained" onClick={handleMerge} disabled={!canMerge} sx={{ mt: 2, width: '100%' }}>
          {isProcessing ? 'Merging...' : 'Merge PDFs'}
        </Button>
      </Box>
    </Box>
  );
};
```

#### Backend Implementation

```go
// app.go - File and directory selection
func (a *App) SelectPDFFiles() ([]string, error) {
    return dialog.File().Filter("PDF files", "pdf").Title("Select PDF Files").LoadFiles()
}

func (a *App) SelectOutputDirectory() (string, error) {
    return dialog.Dir().Title("Select Output Directory").Browse()
}

func (a *App) GetFileMetadata(path string) (FileMetadata, error) {
    info, err := os.Stat(path)
    if err != nil {
        return FileMetadata{}, err
    }

    return FileMetadata{
        Path:        path,
        Name:        filepath.Base(path),
        Size:        info.Size(),
        LastModified: info.ModTime(),
        IsPDF:       filepath.Ext(path) == ".pdf",
    }, nil
}

// MergePDFs merges the given PDF files in order and saves to output directory
func (a *App) MergePDFs(inputPaths []string, outputDirectory string, outputFilename string) error {
    // Validate all input files exist
    for _, path := range inputPaths {
        if _, err := os.Stat(path); os.IsNotExist(err) {
            return fmt.Errorf("file not found: %s", path)
        }
    }

    // Validate output directory exists and is writable
    if _, err := os.Stat(outputDirectory); os.IsNotExist(err) {
        return fmt.Errorf("output directory does not exist: %s", outputDirectory)
    }

    // outputFilename from frontend does not include .pdf extension
    // Always append .pdf extension
    outputPath := filepath.Join(outputDirectory, outputFilename+".pdf")

    // TODO: Implement actual PDF merging logic
    // This would use a PDF library like pdfcpu or go-fitz
    // For now, placeholder implementation

    return nil
}
```

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

## Split PDFs Tab - High-Level Design

### Functional Requirements (Future Implementation)

1. **Single PDF Selection**

   - Select one PDF file
   - Display file metadata (path, size, page count)

2. **Split Options**

   - Split by page ranges
   - Split every N pages
   - Split by bookmarks/chapters (if available)

3. **Output Configuration**

   - Select output directory
   - Configure output filename pattern
   - Preview split results

4. **Execution**
   - Execute split operation
   - Show progress
   - Handle errors gracefully

## Technical Considerations

### Dependencies

**Go Backend:**

- `github.com/wailsapp/wails/v2` - Wails framework
- `github.com/wailsapp/wails/v2/pkg/dialog` - File dialogs
- PDF processing library (to be determined):
  - `github.com/gen2brain/go-fitz` (MuPDF bindings)
  - `github.com/pdfcpu/pdfcpu`
  - Native Go PDF library

**Frontend:**

- React 18+
- Material-UI v5
- TypeScript
- Wails runtime bindings
- `react-beautiful-dnd` (or Material-UI drag-and-drop) - For file reordering

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
2. **Page Count**: Display number of pages for each PDF
3. **Bookmarks/Outline**: Preserve or merge bookmarks
4. **Metadata**: Preserve or edit PDF metadata
5. **Batch Operations**: Process multiple merge/split operations
6. **History**: Keep track of recent operations
7. **Settings**: Configure default output locations, naming patterns
8. **Keyboard Shortcuts**: Quick actions via keyboard
9. **Undo/Redo**: Support for undoing file removals or reorders
10. **File Validation**: Pre-check PDF files for corruption before merging

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

### Phase 4: Polish & Optimization

1. Performance optimization
2. Enhanced error messages
3. User feedback improvements
4. Documentation

## Notes

- Use Wails dialog package for native file dialogs
- Leverage Wails file drop API for drag-and-drop
- Material-UI components for consistent UI
- TypeScript for type safety
- Go structs with JSON tags for data exchange
- Consider using goroutines for async operations
