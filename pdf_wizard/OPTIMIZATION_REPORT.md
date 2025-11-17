# Code Optimization Report

This document outlines optimization opportunities and improvements identified in the PDF Wizard codebase.

## Summary

After reviewing the codebase, the following optimization opportunities have been identified:

### High Priority
1. **Extract PDF validation helper** - Reduce code duplication
2. **Extract output directory validation** - Reduce code duplication
3. **Improve TypeScript type safety** - Replace `any` types
4. **Extract constants** - Centralize magic strings/numbers

### Medium Priority
5. **Create shared tab component logic** - Reduce duplication between SplitTab and RotateTab
6. **Improve error handling consistency** - Standardize error patterns
7. **Optimize file operations** - Reduce redundant file system calls

### Low Priority
8. **Code organization improvements** - Better separation of concerns
9. **Performance optimizations** - React memoization where beneficial

## Detailed Findings

### 1. PDF Extension Validation Duplication (High Priority)

**Location**: `services/file_service.go`, `services/pdf_service.go`

**Issue**: PDF extension validation (`strings.ToLower(filepath.Ext(path)) != ".pdf"`) is repeated 4+ times.

**Solution**: Create a helper function:
```go
func isPDFFile(path string) bool {
    return strings.ToLower(filepath.Ext(path)) == ".pdf"
}
```

**Impact**: Reduces code duplication, improves maintainability.

### 2. Output Directory Validation Duplication (High Priority)

**Location**: `services/pdf_service.go` (MergePDFs, SplitPDF, RotatePDF)

**Issue**: Output directory validation logic is duplicated 3 times.

**Solution**: Extract to helper function:
```go
func validateOutputDirectory(path string) error {
    info, err := os.Stat(path)
    if os.IsNotExist(err) {
        return fmt.Errorf("output directory does not exist: %s", path)
    }
    if err != nil {
        return fmt.Errorf("error accessing output directory: %w", err)
    }
    if !info.IsDir() {
        return fmt.Errorf("output path is not a directory: %s", path)
    }
    return nil
}
```

**Impact**: Reduces ~30 lines of duplicated code.

### 3. TypeScript Type Safety (High Priority)

**Location**: Multiple frontend files

**Issues**:
- `err: any` in catch blocks (MergeTab, SplitTab, RotateTab, SettingsDialog)
- `metadata: any` in `convertToSelectedFile`
- `event: any` in SettingsDialog

**Solution**: Use proper types:
```typescript
// Error type
type AppError = Error | { message: string };

// Metadata type
import { PDFMetadata } from '../wailsjs/go/models';

// Event type
React.ChangeEvent<HTMLInputElement>
```

**Impact**: Better type safety, catch errors at compile time.

### 4. Extract Constants (High Priority)

**Location**: Multiple files

**Issues**:
- `".pdf"` string repeated throughout codebase
- Magic numbers: `MAX_SPLITS = 10`, `MAX_ROTATIONS = 10`
- File permissions: `0755`, `0644`

**Solution**: Create constants file:
```go
// Go: services/constants.go
const (
    PDFExtension = ".pdf"
    DefaultFilePerm = 0644
    DefaultDirPerm = 0755
)
```

```typescript
// TypeScript: frontend/src/utils/constants.ts
export const MAX_SPLITS = 10;
export const MAX_ROTATIONS = 10;
export const PDF_EXTENSION = '.pdf';
```

**Impact**: Easier to maintain, single source of truth.

### 5. Shared Tab Component Logic (Medium Priority)

**Location**: `SplitTab.tsx`, `RotateTab.tsx`

**Issue**: Both components have very similar patterns:
- PDF selection logic
- File drop handling
- Error/success state management
- Output directory selection

**Solution**: Create shared hooks or base component:
```typescript
// hooks/usePDFSelection.ts
export function usePDFSelection() {
  // Shared PDF selection logic
}

// hooks/useFileDrop.ts
export function useFileDrop(onFileDrop: (handler: ...) => void) {
  // Shared file drop logic
}
```

**Impact**: Reduces ~200 lines of duplicated code.

### 6. Error Handling Consistency (Medium Priority)

**Location**: All service files

**Issue**: Inconsistent error message formatting and error wrapping.

**Solution**: Standardize error handling:
```go
// Use fmt.Errorf with %w for wrapping
// Use consistent error message format
// Create error types for common errors
```

**Impact**: Better error messages, easier debugging.

### 7. File Operations Optimization (Medium Priority)

**Location**: `services/pdf_service.go`

**Issue**: 
- `os.Stat()` called multiple times for same file
- File existence checks before operations

**Solution**: Cache file stats, optimize validation order.

**Impact**: Slight performance improvement for large operations.

### 8. Code Organization (Low Priority)

**Suggestions**:
- Group related functions
- Add more inline documentation
- Consider extracting validation to separate package

### 9. React Performance (Low Priority)

**Suggestions**:
- Use `React.memo` for expensive components
- Memoize callbacks with `useCallback`
- Consider code splitting for large components

## Implementation Plan

### Phase 1: High Priority (Immediate)
1. Extract PDF validation helper
2. Extract output directory validation
3. Extract constants
4. Improve TypeScript types

### Phase 2: Medium Priority (Next Sprint)
5. Create shared tab component logic
6. Standardize error handling

### Phase 3: Low Priority (Future)
7. Performance optimizations
8. Code organization improvements

## Estimated Impact

- **Code Reduction**: ~300-400 lines of duplicated code
- **Type Safety**: 100% elimination of `any` types in user code
- **Maintainability**: Significant improvement through DRY principles
- **Performance**: Minor improvements in file operations

