#!/usr/bin/env bash
# Run from pdf_wizard/: ensures dock/taskbar icon then starts Wails dev.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
"$DIR/scripts/sync-app-icon.sh"
exec wails dev "$@"
