# Copy tracked source icon to Wails build dir (build/ is gitignored).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BuildDir = Join-Path $Root "build"
$Src = Join-Path $Root "icons\appicon.png"
$Dst = Join-Path $BuildDir "appicon.png"
New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
Copy-Item -Force $Src $Dst
