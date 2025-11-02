export interface SelectedFile {
  path: string;
  size: number; // bytes
  lastModified: Date;
  name: string; // filename only
}

export interface FileMetadata {
  path: string;
  name: string;
  size: number;
  lastModified: string; // ISO string from backend
  isPDF: boolean;
}

