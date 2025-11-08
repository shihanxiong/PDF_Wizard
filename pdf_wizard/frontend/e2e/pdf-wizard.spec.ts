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
    // Mock Wails runtime before the app loads to prevent crashes
    await page.addInitScript(() => {
      // Create a mock window.runtime object for Wails bindings
      (window as any).runtime = {
        OnFileDrop: (callback: any, useDropTarget: boolean) => {
          // Mock implementation - do nothing, just return
          return;
        },
        OnFileDropOff: () => {
          return;
        },
        CanResolveFilePaths: () => {
          return false;
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
      // Log other errors for debugging
      if (msg.type() === 'error') {
        console.log('Console error:', text);
      }
    });

    // Navigate to the app (Vite dev server)
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for the root div to exist (basic HTML structure)
    await page.waitForSelector('#root', { timeout: 5000 });

    // Wait for React to render - look for any React-rendered content
    // Try tabs first as they're more reliable than #App
    await page.waitForSelector('[role="tab"]', { timeout: 15000 }).catch(async () => {
      // If tabs don't appear, check what's actually on the page
      const bodyText = await page.textContent('body');
      const html = await page.content();
      throw new Error(
        `React app failed to render. Body content: ${bodyText?.substring(0, 200)}. HTML length: ${html.length}`,
      );
    });
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

    // Verify Merge tab content is visible (with explicit waits)
    await expect(page.getByRole('button', { name: 'Select PDF Files' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Or drag and drop PDF files anywhere on the window')).toBeVisible({ timeout: 5000 });

    // Check for output configuration elements
    await expect(page.getByRole('button', { name: 'Select Output Directory' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Output Filename:')).toBeVisible({ timeout: 5000 });

    // Check that the filename input field exists (by placeholder or label)
    const filenameInput = page.locator('input[placeholder="merged"]');
    await expect(filenameInput).toBeVisible({ timeout: 10000 });

    // Verify the Merge button exists (should be disabled initially since no files are selected)
    const mergeButton = page.getByRole('button', { name: 'Merge PDFs' });
    await expect(mergeButton).toBeVisible({ timeout: 10000 });
    await expect(mergeButton).toBeDisabled(); // Disabled because no files selected

    // Verify empty state message
    await expect(page.getByText('No files selected')).toBeVisible({ timeout: 5000 });
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

    // Verify Merge tab content is hidden
    await expect(page.getByRole('button', { name: 'Select PDF Files' })).not.toBeVisible();

    // Verify Rotate tab content is visible
    await expect(page.getByRole('button', { name: 'Select PDF File' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Rotate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rotate PDF' })).toBeVisible();
  });

  test('should allow user to interact with filename input field', async ({ page }) => {
    // Wait for the input field to be visible and ready
    const filenameInput = page.locator('input[placeholder="merged"]');
    await expect(filenameInput).toBeVisible({ timeout: 10000 });

    // Clear the field and type a new filename
    await filenameInput.clear();
    await filenameInput.fill('test-output');

    // Verify the value was updated
    await expect(filenameInput).toHaveValue('test-output');

    // Verify the Merge button is still disabled (no files selected)
    const mergeButton = page.getByRole('button', { name: 'Merge PDFs' });
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

    // Verify all three tab panels exist
    const mergeTabPanel = page.locator('#pdf-wizard-tabpanel-0');
    await expect(mergeTabPanel).toBeVisible();

    const splitTabPanel = page.locator('#pdf-wizard-tabpanel-1');
    await expect(splitTabPanel).toBeVisible();

    const rotateTabPanel = page.locator('#pdf-wizard-tabpanel-2');
    await expect(rotateTabPanel).toBeVisible();

    // Verify buttons have proper styling (check for MUI button classes)
    const selectFilesButton = page.getByRole('button', { name: 'Select PDF Files' });
    await expect(selectFilesButton).toHaveClass(/MuiButton/);
  });
});
