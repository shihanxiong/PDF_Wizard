import { test, expect } from '@playwright/test';
import { setupTestPage } from './helpers/test-setup';

/**
 * E2E Tests for PDF Wizard Application - App Loading and Basic Structure
 *
 * Tests verify:
 * - App loads correctly
 * - Title and logo are displayed
 * - Basic UI structure is present
 */
test.describe('PDF Wizard - App Loading', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestPage(page);
  });

  test('should load the application with correct title and logo', async ({ page }) => {
    // Check that the app title is visible (Typography renders as div with h6 variant)
    await expect(page.getByText('PDF Wizard')).toBeVisible();

    // Check that the logo image is present
    const logo = page.locator('img[alt="PDF Wizard Logo"]');
    await expect(logo).toBeVisible();
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
});
