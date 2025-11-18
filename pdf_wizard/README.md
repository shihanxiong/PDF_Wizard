# PDF Wizard - Wails Application

This directory contains the main Wails application for PDF Wizard.

## About

PDF Wizard is a desktop application built with Wails v2 that provides PDF manipulation capabilities:

- **Merge PDFs**: Combine multiple PDF files into a single document
- **Split PDFs**: Divide a PDF into multiple files based on page ranges
- **Rotate PDFs**: Rotate specific page ranges in a PDF (90°, -90°, or 180°)
- **Watermark PDFs**: Add text watermarks to PDFs with customizable font, size, color, opacity, rotation, and position. Features **language-specific fonts** that automatically adapt based on your selected language

**Key Features:**

- 🌍 **Internationalization**: Supports 12 languages (English, Chinese Simplified, Chinese Traditional, Arabic, French, Japanese, Hindi, Spanish, Portuguese, Russian, Korean, German)
- 🎨 **Modern UI**: Built with Material-UI for a polished, responsive interface
- 🖱️ **Drag & Drop**: Intuitive file handling with drag-and-drop support
- ⚡ **Fast Performance**: Native Go backend ensures quick PDF processing

## Project Configuration

You can configure the project by editing `wails.json`. More information about the project settings can be found
here: https://wails.io/docs/reference/project-config

## Live Development

To run in live development mode, run `wails dev` in the project directory. This will run a Vite development
server that will provide very fast hot reload of your frontend changes. If you want to develop in a browser
and have access to your Go methods, there is also a dev server that runs on http://localhost:34115. Connect
to this in your browser, and you can call your Go code from devtools.

## Building

To build a redistributable, production mode package, use `wails build`.

## Testing

### Backend Tests

Run Go integration tests:

```bash
go test -v ./...
```

### Frontend E2E Tests

Run Playwright end-to-end tests:

```bash
cd frontend
npm run test:e2e
```

For detailed E2E testing information, including test structure, test PDF usage, and CI/CD configuration, see [frontend/e2e/README.md](frontend/e2e/README.md).

For more information, see the main [README.md](../README.md) in the project root.
