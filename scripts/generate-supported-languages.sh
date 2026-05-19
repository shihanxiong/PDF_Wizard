#!/usr/bin/env bash
# Regenerate Go and TypeScript supported-language lists from pdf_wizard/i18n/supported-languages.json.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PDF_WIZARD="$REPO_ROOT/pdf_wizard"

cd "$PDF_WIZARD"
go run ./tools/genlanguages -root .
