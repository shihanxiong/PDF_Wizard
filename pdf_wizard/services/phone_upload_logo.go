package services

import (
	_ "embed"
)

// App logo bytes served at GET /u/{token}/logo.png (same file as frontend/src/assets/img/app_logo.png; update both when replacing).
//
//go:embed app_logo.png
var phonePageLogoPNG []byte
