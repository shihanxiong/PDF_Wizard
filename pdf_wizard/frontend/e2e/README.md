# E2E Testing with Playwright

This directory contains end-to-end (E2E) tests for the PDF Wizard application using Playwright.

## Overview

These tests run against the Vite development server and test the full UI flow of the application.

## Running Tests

### Basic Test Run

```bash
npm run test:e2e
```

This will:

1. Automatically start Vite dev server
2. Wait for the server to be ready at `http://localhost:5173`
3. Run all E2E tests
4. Automatically stop the server when tests complete

### Other Test Commands

- **UI Mode** (interactive test runner - BEST for watching tests): `npm run test:e2e:ui`

  - Opens a visual UI where you can watch tests run step-by-step in real-time
  - You can see the browser actions, screenshots, and test progress
  - Highly recommended for development and debugging

- **Headed Mode** (see browser window): `npm run test:e2e:headed`

  - Runs tests with a visible browser window
  - You can watch the browser actions in real-time
  - Good for quick visual verification

- **Debug Mode** (step through tests): `npm run test:e2e:debug`
  - Opens Playwright Inspector for step-by-step debugging
  - Pauses at each action, allowing you to inspect the page state
  - Best for deep debugging of specific issues

## Test Structure

The test suite is organized into multiple files by functionality:

### Test Files

1. **`app.spec.ts`** - App Loading and Basic Structure

   - Verifies the application loads with correct title and logo
   - Validates Material-UI components render correctly
   - Tests basic UI structure

2. **`tabs.spec.ts`** - Tab Navigation and Content

   - Tests that all four tabs (Merge, Split, Rotate, and Watermark) are visible and functional
   - Verifies tab switching works correctly
   - Tests tab content display when tabs are active
   - Verifies tab state is maintained correctly

3. **`components.spec.ts`** - UI Components and Interactions

   - Tests form input and button interactions
   - Verifies buttons are enabled/disabled based on state
   - Tests error and success state handling
   - Validates component interactions

4. **`i18n.spec.ts`** - Internationalization
   - Tests default language (English) display
   - Verifies language switching functionality (supports all 12 languages)
   - Tests settings dialog functionality
   - Verifies language persistence across navigation
   - Tests translated UI elements
   - Validates language switching between English and Chinese (with examples for other languages)

### Shared Utilities

- **`helpers/test-setup.ts`** - Common test setup utilities
  - `setupWailsMocks()` - Sets up Wails runtime and Go bindings mocks
  - `setupTestPage()` - Common beforeEach setup for all tests
  - Reduces code duplication across test files
  - Mocks `SelectPDFFile` to return `test.pdf` for PDF selection testing
  - Mocks `GetPDFMetadata` and `GetPDFPageCount` with test PDF metadata

- **`helpers/test.pdf`** - Minimal valid PDF file for testing
  - Used by E2E tests to simulate PDF selection and operations
  - Provides a real PDF file for testing without external dependencies
  - Contains a single page with "Test PDF" text

## Configuration

The Playwright configuration (`playwright.config.ts`) is set to:

- Use Chromium browser
- Connect to Vite dev server at `http://localhost:5173`
- Automatically start/stop the dev server
- Generate HTML reports and screenshots on failure
- Uses single worker to avoid conflicts
- Mocks Wails runtime for UI-only testing

## Continuous Integration

The E2E tests are integrated into GitHub Actions CI/CD:

- **Workflow**: `.github/workflows/pdf_wizard_frontend_e2e_tests.yml`
- **Parallel Execution**: Tests run in parallel using a matrix strategy
  - 4 separate jobs, one for each test file (`app.spec.ts`, `components.spec.ts`, `tabs.spec.ts`, `i18n.spec.ts`)
  - Each job runs independently, improving CI speed
  - Fail-fast is disabled, so all tests run even if one fails
- **Triggers**: Runs on push/PR to master/main branches when `pdf_wizard/**` files change
- **Environment**: Ubuntu latest with Node.js 22.21.1 and Playwright browsers
- **Test Command**: Each matrix job runs `npx playwright test e2e/${{ matrix.test-file }}`

## Test PDF File

The E2E tests use a minimal valid PDF file (`helpers/test.pdf`) for testing:

- **Purpose**: Provides a real PDF file for testing PDF selection and operations
- **Location**: `pdf_wizard/frontend/e2e/helpers/test.pdf`
- **Content**: Single-page PDF with "Test PDF" text
- **Usage**: Mocked `SelectPDFFile` function returns this file path, allowing tests to simulate PDF selection
- **Benefits**: 
  - Tests can perform actual PDF operations without external dependencies
  - Consistent test environment across all test runs
  - No need to create temporary PDF files during test execution

## Notes

- Tests run against the **development** server, not production builds
- The Wails runtime messages in the console are expected (tests access the web UI, not the full desktop app)
- For testing production builds, you would need platform-specific UI automation tools
- The i18n tests verify language switching for all 12 supported languages, with detailed examples for English and Chinese
- All Wails Go bindings are mocked, so tests run without a running Go backend
- The test PDF file is included in the repository and used by all tests that require PDF selection
