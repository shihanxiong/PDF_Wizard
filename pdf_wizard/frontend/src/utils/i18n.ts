// Translation keys and their translations
export type Language = 'en' | 'zh';

export interface Translations {
  // App
  appTitle: string;

  // Tabs
  mergeTab: string;
  splitTab: string;
  rotateTab: string;

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

  // Common
  modified: string;
  selectFiles: string;
  selectFile: string;
  selectDirectory: string;
}

const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'PDF Wizard',
    mergeTab: 'Merge PDF',
    splitTab: 'Split PDF',
    rotateTab: 'Rotate PDF',
    settings: 'Settings',
    language: 'Language',
    english: 'English',
    chinese: 'Chinese',
    selectPDFFiles: 'Select PDF Files',
    dragDropHint: 'Or drag and drop PDF files anywhere on the window',
    noFilesSelected: 'No files selected',
    selectOutputDirectory: 'Select Output Directory',
    outputFilename: 'Output Filename:',
    mergePDF: 'Merge PDF',
    merging: 'Merging...',
    pdfsMergedSuccessfully: 'PDFs merged successfully! Output:',
    mergeFailed: 'Merge failed:',
    noPDFFilesFound: 'No PDF files found in dropped files',
    failedToLoadFiles: 'Failed to load files:',
    failedToSelectFiles: 'Failed to select files:',
    failedToSelectOutputDirectory: 'Failed to select output directory:',
    selectPDFFile: 'Select PDF File',
    dragDropPDFHint: 'Or drag and drop a PDF file anywhere on the window',
    addSplit: 'Add Split',
    splits: 'splits',
    noSplitsDefined: 'No splits defined. Click "Add Split" to create one.',
    split: 'Split',
    startPage: 'Start Page',
    endPage: 'End Page',
    fileName: 'File Name:',
    pages: 'pages',
    page: 'page',
    selectOutputDirectorySplit: 'Select Output Directory',
    splitPDF: 'Split PDF',
    splitting: 'Splitting...',
    pdfSplitSuccessfully: 'PDF split successfully! Created',
    createdFiles: 'file(s):',
    splitFailed: 'Split failed:',
    pleaseDropOnlyOnePDF: 'Please drop only one PDF file',
    failedToLoadPDF: 'Failed to load PDF:',
    failedToSelectPDF: 'Failed to select PDF:',
    failedToSelectOutputDirectorySplit: 'Failed to select output directory:',
    pleaseFixInvalidSplits: 'Please fix invalid split configurations before proceeding',
    addRotate: 'Add Rotate',
    rotations: 'rotations',
    noRotationsDefined: 'No rotations defined. Click "Add Rotate" to create one.',
    rotation: 'Rotation',
    rotationLabel: 'Rotation',
    clockwise: '+90° (Clockwise)',
    counterClockwise: '-90° (Counter-clockwise)',
    upsideDown: '180° (Upside down)',
    selectOutputDirectoryRotate: 'Select Output Directory',
    rotatePDF: 'Rotate PDF',
    rotating: 'Rotating...',
    pdfRotatedSuccessfully: 'PDF rotated successfully! Output:',
    rotateFailed: 'Rotation failed:',
    failedToLoadPDFRotate: 'Failed to load PDF:',
    failedToSelectPDFRotate: 'Failed to select PDF:',
    failedToSelectOutputDirectoryRotate: 'Failed to select output directory:',
    pleaseFixInvalidRotations: 'Please fix invalid rotation configurations before proceeding',
    modified: 'Modified:',
    selectFiles: 'Select Files',
    selectFile: 'Select File',
    selectDirectory: 'Select Directory',
  },
  zh: {
    appTitle: 'PDF 工具',
    mergeTab: '合并 PDF',
    splitTab: '拆分 PDF',
    rotateTab: '旋转 PDF',
    settings: '设置',
    language: '语言',
    english: '英语',
    chinese: '中文',
    selectPDFFiles: '选择 PDF 文件',
    dragDropHint: '或将 PDF 文件拖放到窗口任意位置',
    noFilesSelected: '未选择文件',
    selectOutputDirectory: '选择输出目录',
    outputFilename: '输出文件名：',
    mergePDF: '合并 PDF',
    merging: '合并中...',
    pdfsMergedSuccessfully: 'PDF 合并成功！输出：',
    mergeFailed: '合并失败：',
    noPDFFilesFound: '拖放的文件中未找到 PDF 文件',
    failedToLoadFiles: '加载文件失败：',
    failedToSelectFiles: '选择文件失败：',
    failedToSelectOutputDirectory: '选择输出目录失败：',
    selectPDFFile: '选择 PDF 文件',
    dragDropPDFHint: '或将 PDF 文件拖放到窗口任意位置',
    addSplit: '添加拆分',
    splits: '拆分',
    noSplitsDefined: '未定义拆分。点击"添加拆分"创建一个。',
    split: '拆分',
    startPage: '起始页',
    endPage: '结束页',
    fileName: '文件名：',
    pages: '页',
    page: '页',
    selectOutputDirectorySplit: '选择输出目录',
    splitPDF: '拆分 PDF',
    splitting: '拆分中...',
    pdfSplitSuccessfully: 'PDF 拆分成功！创建了',
    createdFiles: '个文件：',
    splitFailed: '拆分失败：',
    pleaseDropOnlyOnePDF: '请只拖放一个 PDF 文件',
    failedToLoadPDF: '加载 PDF 失败：',
    failedToSelectPDF: '选择 PDF 失败：',
    failedToSelectOutputDirectorySplit: '选择输出目录失败：',
    pleaseFixInvalidSplits: '请先修复无效的拆分配置',
    addRotate: '添加旋转',
    rotations: '旋转',
    noRotationsDefined: '未定义旋转。点击"添加旋转"创建一个。',
    rotation: '旋转',
    rotationLabel: '旋转',
    clockwise: '+90°（顺时针）',
    counterClockwise: '-90°（逆时针）',
    upsideDown: '180°（倒置）',
    selectOutputDirectoryRotate: '选择输出目录',
    rotatePDF: '旋转 PDF',
    rotating: '旋转中...',
    pdfRotatedSuccessfully: 'PDF 旋转成功！输出：',
    rotateFailed: '旋转失败：',
    failedToLoadPDFRotate: '加载 PDF 失败：',
    failedToSelectPDFRotate: '选择 PDF 失败：',
    failedToSelectOutputDirectoryRotate: '选择输出目录失败：',
    pleaseFixInvalidRotations: '请先修复无效的旋转配置',
    modified: '修改时间：',
    selectFiles: '选择文件',
    selectFile: '选择文件',
    selectDirectory: '选择目录',
  },
};

let currentLanguage: Language = 'en';

export const setLanguage = (lang: Language) => {
  currentLanguage = lang;
};

export const getLanguage = (): Language => {
  return currentLanguage;
};

export const t = (key: keyof Translations): string => {
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
};

export const getTranslations = (): Translations => {
  return translations[currentLanguage] || translations.en;
};
