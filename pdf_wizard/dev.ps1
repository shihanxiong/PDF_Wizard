# Windows: same as ./dev.sh — sync icon then wails dev
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $ScriptDir "scripts\sync-app-icon.ps1")
Set-Location $ScriptDir
wails dev @args
