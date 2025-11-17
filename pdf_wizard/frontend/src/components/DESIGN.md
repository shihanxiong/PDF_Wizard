# PDF Wizard Components Design

This document describes the design and implementation of the React components in the PDF Wizard application.

## Overview

The application features three main tab components for PDF manipulation:

- **MergeTab** - Combines multiple PDF files into one
- **SplitTab** - Divides a PDF into multiple files
- **RotateTab** - Rotates specific page ranges in a PDF

All components use Material-UI for consistent styling and support internationalization through the `utils/i18n` system.

## Merge PDFs Tab

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
- Internationalization: `t()` function from `utils/i18n` for all UI text

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

## Split PDFs Tab

### Functional Requirements

1. **PDF Selection**

   - Allow user to select a single PDF file from the local file system
   - Support both file dialog selection and drag-and-drop
   - Validate that selected file is a PDF
   - Once a PDF is selected, display PDF information and show "Add Split" button
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

   - Display an "Add Split" button that appears after PDF is selected
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
  success: string | null;
}
```

#### Split List Component

- Material-UI `Card` component for displaying splits
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
- All UI text uses translation keys from `utils/i18n`

### PDF Selection Flow

1. **User clicks "Select PDF File" button or drags PDF onto drop zone**

   - Calls `SelectPDFFile()` from Go backend
   - Opens native file dialog (single-select, PDF filter)
   - Returns file path

2. **For selected PDF:**

   - Call `GetPDFMetadata(path)` to get PDF information including total pages
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
     - Default start page: Next available page after last split (or 1 if first)
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
     - No duplicate filenames (to prevent overwriting)
   - Show progress indicator
   - Call `SplitPDF(inputPath, splits, outputDirectory)`
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

**Key Implementation Details:**

- Uses `onFileDrop` prop callback to register drag-and-drop handler with App component
- Split removal and editing handled entirely in frontend state
- Error and success messages displayed using Material-UI `Alert` components
- Splits list rendered in scrollable `Card` components
- Button shows `CircularProgress` spinner during processing
- All UI text uses translation keys from `utils/i18n` for internationalization

**Main Components Used:**

- Material-UI: `Box`, `Button`, `Typography`, `TextField`, `Card`, `CardContent`, `Alert`, `CircularProgress`, `IconButton`, `Paper`
- Icons: `DeleteIcon`, `AddIcon`, `CloudUploadIcon`, `FolderIcon`
- Utilities: `formatFileSize()`, `formatDate()` from `utils/formatters`
- Internationalization: `t()` function from `utils/i18n` for all UI text

**State Management:**

```typescript
const [selectedPDF, setSelectedPDF] = useState<SelectedPDF | null>(null);
const [splits, setSplits] = useState<SplitDefinition[]>([]);
const [outputDirectory, setOutputDirectory] = useState<string>('');
const [isProcessing, setIsProcessing] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
```

**Key Functions:**

- `handleDroppedPDF()` - Processes PDF dropped on window
- `handleSelectPDF()` - Opens file dialog and loads PDF metadata
- `handleAddSplit()` - Adds new split definition
- `handleRemoveSplit()` - Removes split from list
- `handleUpdateSplit()` - Updates split field (startPage, endPage, filename)
- `validateSplit()` - Validates split configuration
- `handleSplit()` - Executes split operation

## Rotate PDF Tab

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
- All UI text uses translation keys from `utils/i18n` for internationalization

**Main Components Used:**

- Material-UI: `Box`, `Button`, `Typography`, `TextField`, `Paper`, `Alert`, `CircularProgress`, `IconButton`, `Card`, `CardContent`, `Select`, `MenuItem`, `FormControl`, `InputLabel`
- Icons: `DeleteIcon`, `AddIcon`, `CloudUploadIcon`, `FolderIcon`
- Utilities: `formatFileSize()`, `formatDate()` from `utils/formatters`
- Internationalization: `t()` function from `utils/i18n` for all UI text

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

## Settings Dialog Component

The Settings Dialog is a modal component that allows users to configure application settings, currently supporting language selection.

### Functional Requirements

- Accessible via the "Settings" menu item in the application menu bar
- Allows users to select between English and Chinese
- Changes are saved immediately and persist across application restarts
- Uses Material-UI Dialog component for consistent UI
- Language preference is loaded on application startup
- Frontend listens for "show-settings" event from backend to open dialog

### Implementation

- Uses Material-UI `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`
- Language selection via `Select` dropdown with `MenuItem` options
- Calls `GetLanguage()` on open to load current preference
- Calls `SetLanguage()` on save to persist preference
- Triggers `onLanguageChange` callback to update UI immediately
- All UI text uses translation keys from `utils/i18n`
