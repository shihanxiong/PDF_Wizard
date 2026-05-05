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
  imagesToPdfTab: string;
  pdfToTextTab: string;
  lockUnlockTab: string;
  formFillTab: string;

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
  /** Native file-dialog filter label for PDFs */
  fileDialogFilterPdfFiles: string;
  /** Native file-dialog filter label for raster images */
  fileDialogFilterImages: string;

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

  // Images to PDF Tab
  selectImageFiles: string;
  dragDropImagesHint: string;
  noImageFilesFound: string;
  failedToSelectImageFiles: string;
  imagesToPdf: string;
  convertingImagesToPdf: string;
  imagesToPdfSuccessfully: string;
  imagesToPdfFailed: string;
  imagesPhoneReceive: string;
  imagesPhoneReceiveHint: string;
  imagesPhoneReceiveStop: string;
  imagesPhoneReceiveFailed: string;
  imagesPhonePageTitle: string;
  imagesPhonePagePhotosLabel: string;
  imagesPhonePageChooseFiles: string;
  imagesPhonePageUpload: string;
  imagesPhonePageDoneTitle: string;
  imagesPhonePageDoneBody: string;
  imagesPhonePageNoFiles: string;
  imagesPhonePageRetry: string;
  /** Use __COUNT__ placeholder; phone page JS substitutes the number of files chosen. */
  imagesPhonePageSelectedCount: string;
  /** Use __MAX__ placeholder; replaced with the per-session image limit (25). */
  imagesPhonePageTooManyFiles: string;
  imagesPhonePageSessionClosedTitle: string;
  imagesPhonePageSessionClosedBody: string;

  // PDF to Text tab
  pdfToTextExtract: string;
  pdfToTextExtracting: string;
  pdfToTextCopy: string;
  pdfToTextCopied: string;
  pdfToTextCopyFailed: string;
  pdfToTextSelectAll: string;
  pdfToTextOutputLabel: string;
  pdfToTextAriaLabel: string;
  pdfToTextScannedHint: string;
  pdfToTextFailedToLoadPDF: string;
  pdfToTextFailedToSelectPDF: string;
  pdfToTextExtractFailed: string;
  pdfToTextEmptyResult: string;

  // Lock / Unlock Tab
  lockUnlockSelectPDF: string;
  /** Shown on selected file metadata when pdfcpu can open the PDF without a password. */
  lockUnlockStatusUnlocked: string;
  /** Shown on selected file metadata when opening requires a password (encrypt/protect). */
  lockUnlockStatusLocked: string;
  lockUnlockPassword: string;
  lockUnlockSelectOutputDirectory: string;
  lockUnlockActionLock: string;
  lockUnlockActionUnlock: string;
  lockUnlockLocking: string;
  lockUnlockUnlocking: string;
  lockUnlockSuccessLocked: string;
  lockUnlockSuccessUnlocked: string;
  lockUnlockLockFailed: string;
  lockUnlockUnlockFailed: string;
  lockUnlockFailedToLoadPDF: string;
  lockUnlockFailedToSelectPDF: string;
  lockUnlockFailedToSelectOutputDirectory: string;

  // Form Fill Tab
  formFillSelectPDF: string;
  formFillSelectOutputDirectory: string;
  formFillSubmit: string;
  formFillSubmitting: string;
  formFillLoadingFields: string;
  formFillNoFields: string;
  formFillFieldLocked: string;
  formFillSuccess: string;
  formFillLoadFailed: string;
  formFillSubmitFailed: string;
  formFillSelectPDFFailed: string;
  formFillSelectOutputDirectoryFailed: string;

  // Common
  modified: string;
  selectFiles: string;
  selectFile: string;
  selectDirectory: string;
  cancel: string;
  save: string;
}
