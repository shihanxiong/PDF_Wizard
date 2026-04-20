import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { setupTestPage } from './helpers/test-setup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SINGLE_IMAGE_SETUP = path.join(__dirname, 'helpers', 'test-image.png');

/**
 * E2E coverage for the Images to PDF tab (Vite + mocked Wails bindings).
 * See helpers/test-setup.ts for SelectImageFiles / GetFileMetadata / ImagesToPDF mocks.
 */
test.describe('PDF Wizard - Images to PDF (two fixtures)', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestPage(page);
  });

  test('shows empty state and disables Create PDF until inputs are ready', async ({ page }) => {
    await page.getByRole('tab', { name: 'Images to PDF' }).click();
    const panel = page.locator('#pdf-wizard-tabpanel-imagesToPdf');
    await expect(panel).toBeVisible();

    await expect(panel.getByText('No files selected')).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Select Image Files' })).toBeEnabled();
    await expect(panel.getByRole('button', { name: 'Create PDF' })).toBeDisabled();
    await expect(panel.getByRole('button', { name: 'Receive from phone' })).toBeEnabled();
  });

  test('adds images from dialog, removes first row, then creates PDF with mocked backend', async ({ page }) => {
    await page.getByRole('tab', { name: 'Images to PDF' }).click();
    const panel = page.locator('#pdf-wizard-tabpanel-imagesToPdf');

    await panel.getByRole('button', { name: 'Select Image Files' }).click();
    // File rows show the basename as an h6; full path is in a separate paragraph — getByText('…png')
    // matches both and violates strict mode, so use role + accessible name.
    await expect(panel.getByRole('heading', { name: 'test-image.png' })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'test-image-2.png' })).toBeVisible();

    await panel.locator('.MuiIconButton-colorError').first().click();
    await expect(panel.getByRole('heading', { name: 'test-image.png' })).toHaveCount(0);
    await expect(panel.getByRole('heading', { name: 'test-image-2.png' })).toBeVisible();

    await panel.getByRole('button', { name: 'Select Output Directory' }).click();
    await expect(panel.getByText('/tmp')).toBeVisible();

    const filenameInput = panel.locator('input[placeholder="from_images"]');
    await filenameInput.clear();
    await filenameInput.fill('e2e-output');

    await panel.getByRole('button', { name: 'Create PDF' }).click();

    await expect(panel.getByRole('alert')).toContainText('PDF created successfully');
    await expect(panel.getByRole('alert')).toContainText('/tmp/e2e-output.pdf');

    const lastCall = (await page.evaluate(
      () => (window as unknown as { __imagesToPdfLastCall?: ImagesToPdfCall }).__imagesToPdfLastCall,
    )) as ImagesToPdfCall;
    expect(lastCall).toBeTruthy();
    expect(lastCall!.outputDirectory).toBe('/tmp');
    expect(lastCall!.outputFilename).toBe('e2e-output');
    expect(lastCall!.paths).toHaveLength(1);
    expect(lastCall!.paths[0]).toContain('test-image-2.png');
  });

  test('reorders images via drag handle', async ({ page }) => {
    await page.getByRole('tab', { name: 'Images to PDF' }).click();
    const panel = page.locator('#pdf-wizard-tabpanel-imagesToPdf');
    await panel.getByRole('button', { name: 'Select Image Files' }).click();

    await expect.poll(async () => panel.locator('.MuiTypography-subtitle1').allTextContents()).toEqual([
      'test-image.png',
      'test-image-2.png',
    ]);

    await panel.getByTestId('images-to-pdf-drag-0').dragTo(panel.getByTestId('images-to-pdf-drag-1'));
    await expect.poll(async () => panel.locator('.MuiTypography-subtitle1').allTextContents()).toEqual([
      'test-image-2.png',
      'test-image.png',
    ]);
  });

  test('starts receive-from-phone flow and shows QR data URL', async ({ page }) => {
    await page.getByRole('tab', { name: 'Images to PDF' }).click();
    const panel = page.locator('#pdf-wizard-tabpanel-imagesToPdf');

    await panel.getByRole('button', { name: 'Receive from phone' }).click();
    await expect(panel.getByRole('button', { name: 'Stop receiving' })).toBeVisible();
    await expect(panel.locator('img[src^="data:image/png"]')).toBeVisible();
    await expect(panel.getByText('http://127.0.0.1:65530/u/e2e-mock-token/')).toBeVisible();

    const started = await page.evaluate(
      () => (window as unknown as { __phoneUploadSessionCount?: number }).__phoneUploadSessionCount,
    );
    expect(started).toBe(1);
  });
});

type ImagesToPdfCall = { paths: string[]; outputDirectory: string; outputFilename: string };

test.describe('PDF Wizard - Images to PDF (single fixture)', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestPage(page, { imagePaths: [SINGLE_IMAGE_SETUP] });
  });

  test('Select Image Files returns only the single configured path', async ({ page }) => {
    await page.getByRole('tab', { name: 'Images to PDF' }).click();
    const panel = page.locator('#pdf-wizard-tabpanel-imagesToPdf');

    await panel.getByRole('button', { name: 'Select Image Files' }).click();
    await expect(panel.getByRole('heading', { name: 'test-image.png' })).toBeVisible();
    await expect(panel.getByRole('heading', { name: 'test-image-2.png' })).toHaveCount(0);
  });
});
