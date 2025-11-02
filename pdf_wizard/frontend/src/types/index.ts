export interface SelectedFile {
  path: string;
  size: number; // bytes
  lastModified: Date;
  name: string; // filename only
}

export interface PDFMetadata {
  path: string;
  name: string;
  size: number;
  lastModified: string; // ISO string from backend
  isPDF: boolean;
  totalPages: number; // Total number of pages (0 for non-PDF files or when not needed)
}

export interface SelectedPDF {
  path: string;
  size: number; // bytes
  lastModified: Date;
  name: string; // filename only
  totalPages: number;
}

export interface SplitDefinition {
  id: string; // Unique identifier for the split
  startPage: number;
  endPage: number;
  filename: string; // Filename without extension
}

