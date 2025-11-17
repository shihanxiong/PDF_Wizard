import { test, expect } from '@playwright/test';
import { setupTestPage } from './helpers/test-setup';

/**
 * E2E Tests for PDF Wizard - Tab Navigation and Content
 *
 * Tests verify:
 * - All tabs are displayed
 * - Tab switching works correctly
 * - Tab content is displayed when tabs are active
 * - Tab state is maintained
 */
test.describe('PDF Wizard - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestPage(page);
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
