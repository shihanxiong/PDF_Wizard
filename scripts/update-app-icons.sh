#!/usr/bin/env bash
# Regenerate Wails dock/taskbar icon and embedded copies from the canonical brand asset.
# Source of truth: assets/img/app_logo.png (repo root).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/img/app_logo.png"
BUILD_ICON="$ROOT/pdf_wizard/build/appicon.png"
FRONTEND_LOGO="$ROOT/pdf_wizard/frontend/src/assets/img/app_logo.png"
SERVICE_LOGO="$ROOT/pdf_wizard/services/app_logo.png"

if [[ ! -f "$SRC" ]]; then
  echo "Missing canonical logo: $SRC" >&2
  exit 1
fi

mkdir -p "$(dirname "$BUILD_ICON")" "$(dirname "$FRONTEND_LOGO")" "$(dirname "$SERVICE_LOGO")"

resize_to_1024() {
  local in="$1" out="$2"
  case "$(uname -s)" in
    Darwin*)
      sips -z 1024 1024 "$in" --out "$out" >/dev/null
      ;;
    *)
      if command -v magick >/dev/null 2>&1; then
        magick "$in" -resize 1024x1024 "$out"
      elif command -v convert >/dev/null 2>&1; then
        convert "$in" -resize 1024x1024 "$out"
      else
        echo "Warning: install ImageMagick or run on macOS with sips; copying source pixels to $out" >&2
        cp "$in" "$out"
      fi
      ;;
  esac
}

resize_to_1024 "$SRC" "$BUILD_ICON"

cp "$SRC" "$FRONTEND_LOGO"
cp "$SRC" "$SERVICE_LOGO"

echo "Updated: $BUILD_ICON (1024×1024 from $SRC)"
echo "Synced:  $FRONTEND_LOGO"
echo "Synced:  $SERVICE_LOGO"
