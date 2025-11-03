import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing of PDF Wizard
 *
 * Note: This tests the frontend UI using Vite dev server.
 * For full integration with Go backend, run `wails dev` separately.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Use single worker to avoid port conflicts
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Increase timeout for slow loading
    navigationTimeout: 30000,
    actionTimeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start Vite dev server before running tests
  // This is faster and simpler than wails dev for UI testing
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30 * 1000, // 30 seconds to start
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
