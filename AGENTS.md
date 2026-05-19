# AGENTS.md

## Cursor Cloud specific instructions

For commands, stack versions, and project structure see [README.md](README.md) and [pdf_wizard/README.md](pdf_wizard/README.md).

### Cloud-specific gotchas

- **`wails dev` won't work** — it requires a native WebView/display. Use `npm run dev` (Vite) for frontend work and Playwright for UI testing.
- **Frontend `dist/` must exist before `go test`** — `main.go` uses `go:embed frontend/dist`. Run `npm run build` in `pdf_wizard/frontend/` first.
- **nvm must be sourced** before npm/node commands: `export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`
- **Go lives at `/usr/local/go/bin`** — ensure PATH includes it and `$HOME/go/bin` (for Wails CLI).
