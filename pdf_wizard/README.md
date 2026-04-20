# PDF Wizard — Wails application (`pdf_wizard/`)

This directory is the Wails project (Go + embedded React). User-facing overview, screenshots, and downloads: **[README.md](../README.md)**. Documentation map (single source per topic): **[SYSTEM_DESIGN.md § Documentation map](../SYSTEM_DESIGN.md#documentation-map)**.

## Configuration

Edit **`wails.json`** for Wails project settings. Reference: [Wails project config](https://wails.io/docs/reference/project-config).

## Development

Wails reads **`build/appicon.png`** for the macOS dock / Windows taskbar icon. Because **`build/` is gitignored**, the committed source is **`icons/appicon.png`**, copied into `build/` by the script below. If you run plain `wails dev` without that copy, you may see the default Wails icon.

```bash
cd pdf_wizard
./dev.sh
```

Equivalent: `bash scripts/sync-app-icon.sh && wails dev`. On Windows, use **`.\dev.ps1`** or `.\scripts\sync-app-icon.ps1` then `wails dev`.

Vite hot reload; optional browser devtools UI at `http://localhost:34115`.

## Build and distribution

- **Binary**: `wails build` → `build/bin/` (gitignored; not committed)
- **DMG / ZIP / renamed Windows artifacts**: `./build-dist.sh` or `.\build-dist.ps1` after a successful build — full procedure in **[DISTRIBUTION.md](DISTRIBUTION.md)** only.

**LAN phone upload** (Images to PDF): architecture and behavior are documented in **[SYSTEM_DESIGN.md](../SYSTEM_DESIGN.md#images-to-pdf-tab)** and **[services/DESIGN.md](services/DESIGN.md#lan-phone-image-upload)**.

## Tests

```bash
go test -v ./...
```

```bash
cd frontend && npm run test:e2e
```

Playwright layout and CI: **[frontend/e2e/README.md](frontend/e2e/README.md)**. Go coverage and `-run` filters: **[SYSTEM_DESIGN.md § Testing](../SYSTEM_DESIGN.md#testing)**.
