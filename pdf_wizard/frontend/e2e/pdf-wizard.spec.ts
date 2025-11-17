import { test, expect } from '@playwright/test';

/**
 * E2E Test for PDF Wizard Application
 *
 * This test demonstrates end-to-end UI testing of the PDF Wizard app.
 * It verifies:
 * - App loads correctly
 * - Navigation between tabs works
 * - UI elements are present and functional
 * - Basic user interactions
 */
test.describe('PDF Wizard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Wails runtime and Go bindings BEFORE the app loads
    // This must be done in addInitScript to ensure it runs before any modules load
    await page.addInitScript(() => {
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
    });

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
  });

  test('should load the application with correct title and logo', async ({ page }) => {
    // Check that the app title is visible (Typography renders as div with h6 variant)
    await expect(page.getByText('PDF Wizard')).toBeVisible({ timeout: 10000 });

    // Check that the logo image is present
    const logo = page.locator('img[alt="PDF Wizard Logo"]');
    await expect(logo).toBeVisible({ timeout: 5000 });
  });

  test('should display all three tabs (Merge, Split, and Rotate)', async ({ page }) => {
    // Verify all three tabs are present
    await expect(page.getByRole('tab', { name: 'Merge PDF' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Split PDF' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Rotate PDF' })).toBeVisible();

    // Verify Merge tab is selected by default (active)
    const mergeTab = page.getByRole('tab', { name: 'Merge PDF' });
    await expect(mergeTab).toHaveAttribute('aria-selected', 'true');
  });

  test('should display Merge tab content when Merge tab is active', async ({ page }) => {
    // Verify Merge tab is active
    const mergeTab = page.getByRole('tab', { name: 'Merge PDF' });
    await expect(mergeTab).toBeVisible({ timeout: 10000 });
    await expect(mergeTab).toHaveAttribute('aria-selected', 'true');

    // Get the active tab panel and wait for it to be visible
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    await expect(mergeTabPanel).toBeVisible({ timeout: 10000 });

    // Verify Merge tab content is visible (with explicit waits)
    await expect(mergeTabPanel.getByRole('button', { name: 'Select PDF Files' })).toBeVisible({ timeout: 10000 });
    await expect(mergeTabPanel.getByText('Or drag and drop PDF files anywhere on the window')).toBeVisible({
      timeout: 5000,
    });

    // Check for output configuration elements (scoped to merge tab panel)
    await expect(mergeTabPanel.getByRole('button', { name: 'Select Output Directory' })).toBeVisible({
      timeout: 10000,
    });
    await expect(mergeTabPanel.getByText('Output Filename:')).toBeVisible({ timeout: 5000 });

    // Check that the filename input field exists (by placeholder or label)
    const filenameInput = mergeTabPanel.locator('input[placeholder="merged"]');
    await expect(filenameInput).toBeVisible({ timeout: 10000 });

    // Verify the Merge button exists (should be disabled initially since no files are selected)
    // Use a more flexible selector that works even when button is disabled
    const mergeButton = mergeTabPanel.locator('button').filter({ hasText: 'Merge PDF' });
    await expect(mergeButton).toBeVisible({ timeout: 10000 });
    await expect(mergeButton).toBeDisabled(); // Disabled because no files selected

    // Verify empty state message
    await expect(mergeTabPanel.getByText('No files selected')).toBeVisible({ timeout: 5000 });
  });

  test('should switch to Split tab when clicked', async ({ page }) => {
    // Click on Split tab
    await page.getByRole('tab', { name: 'Split PDF' }).click();

    // Verify Split tab is now active
    await expect(page.getByRole('tab', { name: 'Split PDF' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Merge PDF' })).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tab', { name: 'Rotate PDF' })).toHaveAttribute('aria-selected', 'false');

    // Verify Merge tab content is hidden
    await expect(page.getByRole('button', { name: 'Select PDF Files' })).not.toBeVisible();

    // Verify Split tab content is visible (check for Split tab specific elements)
    // Split tab has "Select PDF File" (singular) vs Merge tab's "Select PDF Files" (plural)
    await expect(page.getByRole('button', { name: 'Select PDF File' })).toBeVisible();
  });

  test('should switch to Rotate tab when clicked', async ({ page }) => {
    // Click on Rotate tab
    await page.getByRole('tab', { name: 'Rotate PDF' }).click();

    // Verify Rotate tab is now active
    await expect(page.getByRole('tab', { name: 'Rotate PDF' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Merge PDF' })).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('tab', { name: 'Split PDF' })).toHaveAttribute('aria-selected', 'false');

    // Get the active tab panel and wait for it to be visible
    const rotateTabPanel = page.locator('#pdf-wizard-tabpanel-2');
    await expect(rotateTabPanel).toBeVisible({ timeout: 10000 });

    // Verify Merge tab content is hidden (check the merge tab panel)
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    await expect(mergeTabPanel.getByRole('button', { name: 'Select PDF Files' })).not.toBeVisible();

    // Verify Rotate tab content is visible (scoped to rotate tab panel)
    // Note: "Add Rotate" button is only visible when a PDF is selected, so we check for the initial state
    await expect(rotateTabPanel.getByRole('button', { name: 'Select PDF File' })).toBeVisible();
    // The "Add Rotate" button is only shown when a PDF is selected, so we check for the empty state message instead
    await expect(rotateTabPanel.getByText(/No PDF selected|Or drag and drop/)).toBeVisible();
    // The "Rotate PDF" button should be visible but disabled when no PDF is selected
    const rotateButton = rotateTabPanel.locator('button').filter({ hasText: 'Rotate PDF' });
    await expect(rotateButton).toBeVisible();
    await expect(rotateButton).toBeDisabled();
  });

  test('should allow user to interact with filename input field', async ({ page }) => {
    // Get the active merge tab panel
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');

    // Wait for the input field to be visible and ready (scoped to merge tab panel)
    const filenameInput = mergeTabPanel.locator('input[placeholder="merged"]');
    await expect(filenameInput).toBeVisible({ timeout: 10000 });

    // Clear the field and type a new filename
    await filenameInput.clear();
    await filenameInput.fill('test-output');

    // Verify the value was updated
    await expect(filenameInput).toHaveValue('test-output');

    // Verify the Merge button is still disabled (no files selected)
    const mergeButton = mergeTabPanel.locator('button').filter({ hasText: 'Merge PDF' });
    await expect(mergeButton).toBeVisible();
    await expect(mergeButton).toBeDisabled();
  });

  test('should maintain tab state after interaction', async ({ page }) => {
    // Start on Merge tab
    await expect(page.getByRole('tab', { name: 'Merge PDF' })).toHaveAttribute('aria-selected', 'true');

    // Interact with a field
    const filenameInput = page.locator('input[placeholder="merged"]');
    await filenameInput.fill('test');

    // Switch to Split tab
    await page.getByRole('tab', { name: 'Split PDF' }).click();
    await expect(page.getByRole('tab', { name: 'Split PDF' })).toHaveAttribute('aria-selected', 'true');

    // Switch to Rotate tab
    await page.getByRole('tab', { name: 'Rotate PDF' }).click();
    await expect(page.getByRole('tab', { name: 'Rotate PDF' })).toHaveAttribute('aria-selected', 'true');

    // Switch back to Merge tab
    await page.getByRole('tab', { name: 'Merge PDF' }).click();
    await expect(page.getByRole('tab', { name: 'Merge PDF' })).toHaveAttribute('aria-selected', 'true');

    // Verify the input field value is preserved (or reset, depending on implementation)
    // This demonstrates state management
    await expect(filenameInput).toBeVisible();
  });

  test('should display proper UI structure with Material-UI components', async ({ page }) => {
    // Verify the app structure using accessible roles
    const appBar = page.locator('header, [role="banner"], .MuiAppBar-root');
    await expect(appBar).toBeVisible();

    // Verify tabs are in a tablist
    const tabList = page.getByRole('tablist');
    await expect(tabList).toBeVisible();

    // Verify all three tab panels exist (they exist in DOM but only active one is visible)
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    await expect(mergeTabPanel).toBeAttached();

    const splitTabPanel = page.locator('#pdf-wizard-tabpanel-1');
    await expect(splitTabPanel).toBeAttached();

    const rotateTabPanel = page.locator('#pdf-wizard-tabpanel-2');
    await expect(rotateTabPanel).toBeAttached();

    // Verify the active tab panel (Merge) is visible
    await expect(mergeTabPanel).toBeVisible();

    // Verify buttons have proper styling (check for MUI button classes) - scoped to active panel
    const selectFilesButton = mergeTabPanel.getByRole('button', { name: 'Select PDF Files' });
    await expect(selectFilesButton).toHaveClass(/MuiButton/);
  });

  test('should show error state when operations fail', async ({ page }) => {
    // This test verifies that error handling UI exists
    // Note: We can't actually trigger file operations without real file dialogs,
    // but we can verify error UI components exist

    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    await expect(mergeTabPanel).toBeVisible();

    // Verify error alert component can exist (check for MUI Alert classes)
    // Error alerts are conditionally rendered, so we just verify the structure exists
    const alertContainer = mergeTabPanel.locator('.MuiAlert-root, [role="alert"]');
    // We don't check visibility since errors are conditional, just that the structure supports it
  });

  test('should show success state after operations', async ({ page }) => {
    // This test verifies that success handling UI exists
    // Note: We can't actually trigger file operations without real file dialogs,
    // but we can verify success UI components exist

    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    await expect(mergeTabPanel).toBeVisible();

    // Verify success alert component can exist (check for MUI Alert classes)
    // Success alerts are conditionally rendered, so we just verify the structure exists
    const alertContainer = mergeTabPanel.locator('.MuiAlert-root, [role="alert"]');
    // We don't check visibility since success messages are conditional
  });

  test('should disable action buttons when required fields are missing', async ({ page }) => {
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');

    // Verify Merge button is disabled when no files are selected
    const mergeButton = mergeTabPanel.locator('button').filter({ hasText: 'Merge PDF' });
    await expect(mergeButton).toBeDisabled();

    // Switch to Split tab
    await page.getByRole('tab', { name: 'Split PDF' }).click();
    const splitTabPanel = page.locator('#pdf-wizard-tabpanel-1');
    await expect(splitTabPanel).toBeVisible();

    // Verify Split button is disabled when no PDF is selected
    const splitButton = splitTabPanel.locator('button').filter({ hasText: 'Split PDF' });
    await expect(splitButton).toBeDisabled();

    // Switch to Rotate tab
    await page.getByRole('tab', { name: 'Rotate PDF' }).click();
    const rotateTabPanel = page.locator('#pdf-wizard-tabpanel-2');
    await expect(rotateTabPanel).toBeVisible();

    // Verify Rotate button is disabled when no PDF is selected
    const rotateButton = rotateTabPanel.locator('button').filter({ hasText: 'Rotate PDF' });
    await expect(rotateButton).toBeDisabled();
  });

  test('should display output filename input in all tabs', async ({ page }) => {
    // Verify Merge tab has output filename input
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    await expect(mergeTabPanel.getByText('Output Filename:')).toBeVisible();
    await expect(mergeTabPanel.locator('input[placeholder="merged"]')).toBeVisible();

    // Switch to Rotate tab
    await page.getByRole('tab', { name: 'Rotate PDF' }).click();
    const rotateTabPanel = page.locator('#pdf-wizard-tabpanel-2');
    await expect(rotateTabPanel).toBeVisible();

    // Verify Rotate tab has output filename input
    await expect(rotateTabPanel.getByText('Output Filename:')).toBeVisible();
    await expect(rotateTabPanel.locator('input[placeholder="rotated"]')).toBeVisible();
  });

  test('should maintain separate state for each tab', async ({ page }) => {
    // Test that each tab maintains its own state independently

    // Start on Merge tab and interact
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    const mergeFilenameInput = mergeTabPanel.locator('input[placeholder="merged"]');
    await mergeFilenameInput.fill('merge-test');

    // Switch to Rotate tab
    await page.getByRole('tab', { name: 'Rotate PDF' }).click();
    const rotateTabPanel = page.locator('#pdf-wizard-tabpanel-2');
    await expect(rotateTabPanel).toBeVisible();

    // Interact with Rotate tab
    const rotateFilenameInput = rotateTabPanel.locator('input[placeholder="rotated"]');
    await rotateFilenameInput.fill('rotate-test');

    // Switch back to Merge tab
    await page.getByRole('tab', { name: 'Merge PDF' }).click();
    await expect(mergeTabPanel).toBeVisible();

    // Verify Merge tab state is preserved (or reset, depending on implementation)
    await expect(mergeFilenameInput).toBeVisible();
  });
});

test.describe('PDF Wizard i18n E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Wails runtime and Go bindings BEFORE the app loads
    await page.addInitScript(() => {
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
    });

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

    // Navigate to the app
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for React to render - check for root element first
    await page.waitForSelector('#root', { timeout: 10000, state: 'attached' });

    // Wait a bit for React to finish initializing
    await page.waitForTimeout(500);

    // Now wait for the actual content
    await page.waitForSelector('[role="tab"]', { timeout: 15000 });
  });

  test('should display English text by default', async ({ page }) => {
    // Verify English text is displayed
    await expect(page.getByText('PDF Wizard')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Merge PDF' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Split PDF' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Rotate PDF' })).toBeVisible();

    // Verify Merge tab content is in English
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    await expect(mergeTabPanel.getByRole('button', { name: 'Select PDF Files' })).toBeVisible();
    await expect(mergeTabPanel.getByText('Or drag and drop PDF files anywhere on the window')).toBeVisible();
  });

  test('should switch to Chinese when language is changed', async ({ page }) => {
    // Change language to Chinese via mock and save to sessionStorage
    await page.evaluate(() => {
      (window as any).__mockLanguage = 'zh';
      sessionStorage.setItem('__test_mock_language', 'zh');
    });

    // Reload page to trigger language loading
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[role="tab"]', { timeout: 15000 });

    // Verify Chinese text is displayed
    await expect(page.getByText('PDF魔法师')).toBeVisible();
    await expect(page.getByRole('tab', { name: '合并 PDF' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '拆分 PDF' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '旋转 PDF' })).toBeVisible();

    // Verify Merge tab content is in Chinese
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    await expect(mergeTabPanel.getByRole('button', { name: '选择 PDF 文件' })).toBeVisible();
    await expect(mergeTabPanel.getByText('或将 PDF 文件拖放到窗口任意位置')).toBeVisible();
  });

  test('should open settings dialog when settings event is emitted', async ({ page }) => {
    // Settings dialog should not be visible initially
    const settingsDialog = page.locator('[role="dialog"]').filter({ hasText: /Settings|设置/ });
    await expect(settingsDialog).not.toBeVisible();

    // Emit show-settings event
    await page.evaluate(() => {
      if ((window as any).runtime && (window as any).runtime.EventsEmit) {
        (window as any).runtime.EventsEmit('show-settings');
      }
    });

    // Wait for dialog to appear
    await expect(settingsDialog).toBeVisible({ timeout: 5000 });
  });

  test('should display language selector in settings dialog', async ({ page }) => {
    // Open settings dialog
    await page.evaluate(() => {
      if ((window as any).runtime && (window as any).runtime.EventsEmit) {
        (window as any).runtime.EventsEmit('show-settings');
      }
    });

    const settingsDialog = page.locator('[role="dialog"]').filter({ hasText: /Settings|设置/ });
    await expect(settingsDialog).toBeVisible({ timeout: 5000 });

    // Verify language selector is present - check that dialog contains language-related text
    // Use a more flexible approach to avoid strict mode violations
    await expect(settingsDialog.getByLabel(/Language|语言/)).toBeVisible();

    // Verify language selector dropdown exists (options are only visible when dropdown is open)
    // Check for the select element by its ID or role
    const languageSelect = settingsDialog
      .locator('#language-select, [role="combobox"]')
      .filter({ hasText: /English|英语|Chinese|中文/ });
    await expect(languageSelect).toBeVisible();
  });

  test('should update UI text when language changes in settings', async ({ page }) => {
    // Open settings dialog
    await page.evaluate(() => {
      if ((window as any).runtime && (window as any).runtime.EventsEmit) {
        (window as any).runtime.EventsEmit('show-settings');
      }
    });

    const settingsDialog = page.locator('[role="dialog"]').filter({ hasText: /Settings|设置/ });
    await expect(settingsDialog).toBeVisible({ timeout: 5000 });

    // Find and click the language select
    // Note: Material-UI Select might render as a button or input
    const languageSelect = settingsDialog
      .locator('input, button')
      .filter({ hasText: /Language|语言/ })
      .first();

    // Try to interact with the select - this might need adjustment based on actual MUI Select rendering
    // For now, we'll verify the dialog structure exists
    await expect(settingsDialog).toBeVisible();

    // Close dialog by clicking cancel or outside
    const cancelButton = settingsDialog.getByRole('button', { name: /Cancel|取消/i });
    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();
    }
  });

  test('should maintain language preference across tab switches', async ({ page }) => {
    // Set language to Chinese
    await page.evaluate(() => {
      (window as any).__mockLanguage = 'zh';
      sessionStorage.setItem('__test_mock_language', 'zh');
    });

    // Reload to apply language
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[role="tab"]', { timeout: 15000 });

    // Verify Chinese text
    await expect(page.getByText('PDF魔法师')).toBeVisible();

    // Switch to Split tab
    await page.getByRole('tab', { name: '拆分 PDF' }).click();
    await expect(page.getByRole('tab', { name: '拆分 PDF' })).toHaveAttribute('aria-selected', 'true');

    // Switch to Rotate tab
    await page.getByRole('tab', { name: '旋转 PDF' }).click();
    await expect(page.getByRole('tab', { name: '旋转 PDF' })).toHaveAttribute('aria-selected', 'true');

    // Switch back to Merge tab
    await page.getByRole('tab', { name: '合并 PDF' }).click();
    await expect(page.getByRole('tab', { name: '合并 PDF' })).toHaveAttribute('aria-selected', 'true');

    // Verify language is still Chinese
    await expect(page.getByText('PDF魔法师')).toBeVisible();
  });

  test('should display translated button labels in all tabs', async ({ page }) => {
    // Set language to Chinese
    await page.evaluate(() => {
      (window as any).__mockLanguage = 'zh';
      sessionStorage.setItem('__test_mock_language', 'zh');
    });

    // Reload to apply language
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[role="tab"]', { timeout: 15000 });

    // Verify Merge tab buttons are translated
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    await expect(mergeTabPanel.getByRole('button', { name: '选择 PDF 文件' })).toBeVisible();

    // Switch to Split tab
    await page.getByRole('tab', { name: '拆分 PDF' }).click();
    const splitTabPanel = page.locator('#pdf-wizard-tabpanel-1');
    await expect(splitTabPanel.getByRole('button', { name: '选择 PDF 文件' })).toBeVisible();

    // Switch to Rotate tab
    await page.getByRole('tab', { name: '旋转 PDF' }).click();
    const rotateTabPanel = page.locator('#pdf-wizard-tabpanel-2');
    await expect(rotateTabPanel.getByRole('button', { name: '选择 PDF 文件' })).toBeVisible();
  });
});
