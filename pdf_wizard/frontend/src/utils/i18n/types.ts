// Translation keys and their translations
export type Language = 'en' | 'zh' | 'zh-TW' | 'ar' | 'fr' | 'ja' | 'hi' | 'es' | 'pt' | 'ru' | 'ko' | 'de';

export interface Translations {
  // App
  appTitle: string;

  // Tabs
  mergeTab: string;
  splitTab: string;
  rotateTab: string;
  watermarkTab: string;

  // Settings
  settings: string;
  language: string;
  english: string;
  chinese: string;

  // Merge Tab
  selectPDFFiles: string;
  dragDropHint: string;
  noFilesSelected: string;
  selectOutputDirectory: string;
  outputFilename: string;
  mergePDF: string;
  merging: string;
  pdfsMergedSuccessfully: string;
  mergeFailed: string;
  noPDFFilesFound: string;
  failedToLoadFiles: string;
  failedToSelectFiles: string;
  failedToSelectOutputDirectory: string;

  // Split Tab
  selectPDFFile: string;
  dragDropPDFHint: string;
  addSplit: string;
  splits: string;
  noSplitsDefined: string;
  split: string;
  startPage: string;
  endPage: string;
  fileName: string;
  pages: string;
  page: string;
  selectOutputDirectorySplit: string;
  splitPDF: string;
  splitting: string;
  pdfSplitSuccessfully: string;
  createdFiles: string;
  splitFailed: string;
  pleaseDropOnlyOnePDF: string;
  failedToLoadPDF: string;
  failedToSelectPDF: string;
  failedToSelectOutputDirectorySplit: string;
  pleaseFixInvalidSplits: string;

  // Rotate Tab
  addRotate: string;
  rotations: string;
  noRotationsDefined: string;
  rotation: string;
  rotationLabel: string;
  clockwise: string;
  counterClockwise: string;
  upsideDown: string;
  selectOutputDirectoryRotate: string;
  rotatePDF: string;
  rotating: string;
  pdfRotatedSuccessfully: string;
  rotateFailed: string;
  failedToLoadPDFRotate: string;
  failedToSelectPDFRotate: string;
  failedToSelectOutputDirectoryRotate: string;
  pleaseFixInvalidRotations: string;

  // Watermark Tab
  selectPDFFileWatermark: string;
  watermarkText: string;
  fontSize: string;
  fontColor: string;
  opacity: string;
  position: string;
  fontFamily: string;
  pageRange: string;
  allPages: string;
  specificPages: string;
  selectOutputDirectoryWatermark: string;
  applyWatermark: string;
  applying: string;
  watermarkAppliedSuccessfully: string;
  watermarkFailed: string;
  failedToLoadPDFWatermark: string;
  failedToSelectPDFWatermark: string;
  failedToSelectOutputDirectoryWatermark: string;
  positionCenter: string;
  positionTopLeft: string;
  positionTopCenter: string;
  positionTopRight: string;
  positionMiddleLeft: string;
  positionMiddleRight: string;
  positionBottomLeft: string;
  positionBottomCenter: string;
  positionBottomRight: string;

  // Common
  modified: string;
  selectFiles: string;
  selectFile: string;
  selectDirectory: string;
  cancel: string;
  save: string;
}
