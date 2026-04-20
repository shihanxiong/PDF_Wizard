package services

import (
	_ "embed"
)

// App logo bytes served at GET /u/{token}/logo.png (synced from repo-root assets/img/app_logo.png via scripts/update-app-icons.sh).
//
//go:embed app_logo.png
var phonePageLogoPNG []byte
