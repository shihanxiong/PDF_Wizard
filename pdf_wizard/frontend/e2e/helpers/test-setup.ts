import { Page } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Shared test setup utilities for PDF Wizard E2E tests
 */

// Get the test PDF path relative to the helpers directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_PDF_PATH = path.join(__dirname, 'test.pdf');
const TEST_IMAGE_PATH = path.join(__dirname, 'test-image.png');
const TEST_IMAGE_PATH_2 = path.join(__dirname, 'test-image-2.png');

export type SetupTestPageOptions = {
  /** Absolute paths returned by SelectImageFiles mock (defaults to two tiny PNGs). */
  imagePaths?: string[];
};

/**
 * Sets up Wails runtime and Go bindings mocks
 * This must be called in addInitScript before the app loads
 */
export function setupWailsMocks() {
  // Get test PDF path from window context (set by test setup)
  const pdfPath = (window as any).__testPDFPath || '';

  // Initialize language mock with sessionStorage persistence
  if (!(window as any).__mockLanguage) {
    const savedLang = sessionStorage.getItem('__test_mock_language');
    (window as any).__mockLanguage = savedLang || 'en';
  }

  // Create a mock window.runtime object for Wails bindings
  (window as any).runtime = {
    OnFileDrop: (callback: any, useDropTarget: boolean) => {
      return;
    },
    OnFileDropOff: () => {
      return;
    },
    WindowSetBackgroundColour: (R: number, G: number, B: number, A: number) => {
      // Mock window background color setting
      return;
    },
    CanResolveFilePaths: () => {
      return false;
    },
    EventsOnMultiple: (event: string, callback: () => void, maxCallbacks?: number) => {
      if (!(window as any).__wailsEventHandlers) {
        (window as any).__wailsEventHandlers = {};
      }
      (window as any).__wailsEventHandlers[event] = callback;
      return () => {}; // Return unsubscribe function
    },
    EventsOn: (event: string, callback: () => void) => {
      // EventsOn calls EventsOnMultiple internally
      return (window as any).runtime.EventsOnMultiple(event, callback, -1);
    },
    EventsEmit: (event: string, data?: any) => {
      if ((window as any).__wailsEventHandlers && (window as any).__wailsEventHandlers[event]) {
        (window as any).__wailsEventHandlers[event](data);
      }
    },
  };

  // Mock Wails Go bindings - MUST be set up before modules try to access window.go
  (window as any).go = {
    main: {
      App: {
        GetLanguage: async () => {
          return (window as any).__mockLanguage || 'en';
        },
        SetLanguage: async (lang: string) => {
          (window as any).__mockLanguage = lang;
          sessionStorage.setItem('__test_mock_language', lang);
        },
        EmitSettingsEvent: () => {
          if ((window as any).runtime && (window as any).runtime.EventsEmit) {
            (window as any).runtime.EventsEmit('show-settings');
          }
        },
        SelectPDFFiles: async (_labels: unknown) => [],
        SelectPDFFile: async (_labels: unknown) => pdfPath || '',
        SelectOutputDirectory: async (_labels: unknown) => '/tmp',
        SelectImageFiles: async (_labels: unknown) => {
          const paths = (window as any).__testImagePaths as string[] | undefined;
          return paths && paths.length ? [...paths] : [];
        },
        GetFileMetadata: async (filePath: string) => {
          const name = filePath.replace(/^.*[/\\\\]/, '') || filePath;
          const lower = name.toLowerCase();
          if (lower.endsWith('.pdf')) {
            return {
              path: filePath,
              name,
              size: 520,
              lastModified: new Date().toISOString(),
              isPDF: true,
              totalPages: 1,
            };
          }
          return {
            path: filePath,
            name,
            size: 70,
            lastModified: new Date().toISOString(),
            isPDF: false,
            totalPages: 0,
          };
        },
        GetPDFMetadata: async (path: string) => {
          if (path === pdfPath || path) {
            return {
              path: pdfPath || path,
              name: 'test.pdf',
              size: 520,
              lastModified: new Date().toISOString(),
              isPDF: true,
              totalPages: 1,
            };
          }
          return {};
        },
        GetPDFPageCount: async (path: string) => {
          if (path === pdfPath || path) {
            return 1;
          }
          return 0;
        },
        MergePDFs: async () => {},
        SplitPDF: async () => {},
        RotatePDF: async () => {},
        ApplyWatermark: async () => {},
        ImagesToPDF: async (paths: string[], outputDirectory: string, outputFilename: string) => {
          (window as any).__imagesToPdfLastCall = {
            paths: [...paths],
            outputDirectory,
            outputFilename,
          };
        },
        StartImagesPhoneUpload: async () => {
          (window as any).__phoneUploadSessionCount = ((window as any).__phoneUploadSessionCount || 0) + 1;
          return 'http://127.0.0.1:65530/u/e2e-mock-token/';
        },
        StopImagesPhoneUpload: async () => {
          (window as any).__phoneUploadStopped = true;
        },
      },
    },
  };
}

/**
 * Common beforeEach setup for all tests
 * Sets up mocks, navigates to app, and waits for React to render
 */
export async function setupTestPage(page: Page, options?: SetupTestPageOptions) {
  const imagePaths = options?.imagePaths?.length ? options.imagePaths : [TEST_IMAGE_PATH, TEST_IMAGE_PATH_2];

  // Mock Wails runtime and Go bindings BEFORE the app loads
  await page.addInitScript(
    ({ pdfPath, imagePaths: imgs }: { pdfPath: string; imagePaths: string[] }) => {
      (window as any).__testPDFPath = pdfPath;
      (window as any).__testImagePaths = imgs;
    },
    { pdfPath: TEST_PDF_PATH, imagePaths },
  );
  await page.addInitScript(setupWailsMocks);

  // Ignore console errors from Wails runtime (not available in Vite-only mode)
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'error' && (text.includes('wails') || text.includes('runtime') || text.includes('OnFileDrop'))) {
      // Ignore Wails-related errors when testing UI only
      return;
    }
  });

  // Navigate to the app (Vite dev server)
  await page.goto('/', { waitUntil: 'networkidle' });

  // Wait for the root div to exist (basic HTML structure)
  await page.waitForSelector('#root', { state: 'attached' });

  // Wait for React to render - look for any React-rendered content
  // Try tabs first as they're more reliable than #App
  try {
    await page.waitForSelector('[role="tab"]');
  } catch (error) {
    // If tabs don't appear, check what's actually on the page
    const bodyText = await page.textContent('body');
    const html = await page.content();
    throw new Error(
      `React app failed to render. Body content: ${bodyText?.substring(0, 200)}. HTML length: ${html.length}`,
    );
  }
}
