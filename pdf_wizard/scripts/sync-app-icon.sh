#!/usr/bin/env bash
# Wails uses pdf_wizard/build/appicon.png for the dock / taskbar icon.
# The build/ tree is gitignored, so the canonical PNG lives under icons/.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/build"
cp "$ROOT/icons/appicon.png" "$ROOT/build/appicon.png"
