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

## Build and distribution

- **Binary**: `wails build` → `build/bin/`
- **DMG / ZIP / renamed Windows artifacts**: `./build-dist.sh` or `.\build-dist.ps1` after a successful build — full procedure in **[DISTRIBUTION.md](DISTRIBUTION.md)** only.

## Tests

```bash
go test -v ./...
```

```bash
cd frontend && npm run test:e2e
```

Playwright layout and CI: **[frontend/e2e/README.md](frontend/e2e/README.md)**. Go coverage and `-run` filters: **[SYSTEM_DESIGN.md § Testing](../SYSTEM_DESIGN.md#testing)**.
