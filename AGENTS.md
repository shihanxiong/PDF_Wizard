# AGENTS.md

## Cursor Cloud specific instructions

### Overview

PDF Wizard is a **Wails v2 desktop app** (Go backend + React/TypeScript frontend in an embedded WebView). It cannot be fully launched with `wails dev` in headless cloud environments since Wails requires a native window/WebView. For development and testing, the **frontend** runs independently via Vite and the **Go backend** is tested via `go test`.

### Environment

- **Go 1.25** installed at `/usr/local/go`. Ensure `PATH` includes `/usr/local/go/bin:$HOME/go/bin`.
- **Node.js 22.21.1** managed by nvm (default alias set). Source nvm before running npm commands:
  ```
  export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
  ```
- **Wails CLI v2.12.0** at `$HOME/go/bin/wails`.

### Key commands (see `pdf_wizard/README.md` for full reference)

| Task | Command | Working directory |
|------|---------|-------------------|
| Go tests | `go test -v ./...` | `pdf_wizard/` |
| Go lint | `go vet ./...` | `pdf_wizard/` |
| Frontend build (required before Go tests due to `go:embed`) | `npm run build` | `pdf_wizard/frontend/` |
| TypeScript type-check | `npx tsc --noEmit` | `pdf_wizard/frontend/` |
| E2E tests (auto-starts Vite) | `npm run test:e2e` | `pdf_wizard/frontend/` |
| Vite dev server (standalone frontend) | `npm run dev` | `pdf_wizard/frontend/` |
| Install Playwright browsers | `npx playwright install --with-deps chromium` | `pdf_wizard/frontend/` |

### Gotchas

- **Frontend `dist/` must exist before running Go tests.** `main.go` uses `go:embed frontend/dist` — if `dist/` is missing, `go build` and `go test` will fail. Always run `npm run build` in `pdf_wizard/frontend/` first.
- **Playwright E2E tests auto-start Vite** via `webServer` config in `playwright.config.ts`. No need to start the dev server manually before running `npm run test:e2e`.
- **`wails dev` requires a display/WebView** and will fail in headless environments. Use the Vite dev server directly (`npm run dev`) for frontend development and Playwright for UI testing.
- **No external services required.** No database, Docker, or external APIs — everything is local/in-process.
