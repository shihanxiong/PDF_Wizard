import { Page } from '@playwright/test';

/**
 * Shared test setup utilities for PDF Wizard E2E tests
 */

/**
 * Sets up Wails runtime and Go bindings mocks
 * This must be called in addInitScript before the app loads
 */
export function setupWailsMocks() {
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
        GetLanguage: () => {
          return Promise.resolve((window as any).__mockLanguage || 'en');
        },
        SetLanguage: (lang: string) => {
          (window as any).__mockLanguage = lang;
          sessionStorage.setItem('__test_mock_language', lang);
          return Promise.resolve();
        },
        EmitSettingsEvent: () => {
          if ((window as any).runtime && (window as any).runtime.EventsEmit) {
            (window as any).runtime.EventsEmit('show-settings');
          }
        },
        SelectPDFFiles: () => Promise.resolve([]),
        SelectPDFFile: () => Promise.resolve(''),
        SelectOutputDirectory: () => Promise.resolve(''),
        GetFileMetadata: () => Promise.resolve({}),
        GetPDFMetadata: () => Promise.resolve({}),
        GetPDFPageCount: () => Promise.resolve(0),
        MergePDFs: () => Promise.resolve(),
        SplitPDF: () => Promise.resolve(),
        RotatePDF: () => Promise.resolve(),
      },
    },
  };
}

/**
 * Common beforeEach setup for all tests
 * Sets up mocks, navigates to app, and waits for React to render
 */
export async function setupTestPage(page: Page) {
  // Mock Wails runtime and Go bindings BEFORE the app loads
  await page.addInitScript(setupWailsMocks);

  // Ignore console errors from Wails runtime (not available in Vite-only mode)
  page.on('console', (msg) => {
    const text = msg.text();
    if (
      msg.type() === 'error' &&
      (text.includes('wails') || text.includes('runtime') || text.includes('OnFileDrop'))
    ) {
      // Ignore Wails-related errors when testing UI only
      return;
    }
  });

  // Navigate to the app (Vite dev server)
  await page.goto('/', { waitUntil: 'networkidle' });

  // Wait for the root div to exist (basic HTML structure)
  await page.waitForSelector('#root', { timeout: 10000, state: 'attached' });

  // Wait a bit for React to finish initializing
  await page.waitForTimeout(500);

  // Wait for React to render - look for any React-rendered content
  // Try tabs first as they're more reliable than #App
  try {
    await page.waitForSelector('[role="tab"]', { timeout: 15000 });
  } catch (error) {
    // If tabs don't appear, check what's actually on the page
    const bodyText = await page.textContent('body');
    const html = await page.content();
    throw new Error(
      `React app failed to render. Body content: ${bodyText?.substring(0, 200)}. HTML length: ${html.length}`,
    );
  }
}

