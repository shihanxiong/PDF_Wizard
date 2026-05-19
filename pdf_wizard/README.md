# PDF Wizard — Wails application (`pdf_wizard/`)

This directory is the Wails project (Go + embedded React). User-facing overview, screenshots, and downloads: **[README.md](../README.md)**. Documentation map (single source per topic): **[SYSTEM_DESIGN.md § Documentation map](../SYSTEM_DESIGN.md#documentation-map)**.

## Configuration

Edit **`wails.json`** for Wails project settings. Reference: [Wails project config](https://wails.io/docs/reference/project-config).

## Development

```bash
cd pdf_wizard
wails dev
```

Vite hot reload; optional browser devtools UI at `http://localhost:34115`.

**Dock icon in dev:** `wails dev` runs a bare binary (no `.app` bundle), so macOS does not apply `Info.plist` / `icns`. The app sets **`NSApplication.applicationIconImage`** on startup from the embedded `build/appicon.png`, matching the packaged app icon.

## Build and distribution

- **App icon**: `build/appicon.png` is **committed** (Wails uses it for the dock / taskbar icon in `wails dev` and `wails build`). It is generated at **1024×1024** from the canonical **`../assets/img/app_logo.png`** — from the **repository root**, run **`bash scripts/update-app-icons.sh`** after changing that file (it also refreshes `frontend/src/assets/img/app_logo.png` and `services/app_logo.png`). Everything else under `build/` is gitignored.
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

After adding a locale, update **`i18n/supported-languages.json`** and the translation modules — see **[frontend/src/utils/i18n/DESIGN.md](frontend/src/utils/i18n/DESIGN.md)**.
