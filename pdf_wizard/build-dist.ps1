# PDF Wizard Distribution Builder (PowerShell)
# This script builds and packages PDF Wizard for Windows distribution

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $ScriptDir "build\bin"
$OutputDir = Join-Path $ScriptDir "dist"

Write-Host "🔨 Building PDF Wizard for Windows..." -ForegroundColor Cyan
Set-Location $ScriptDir

# Clean previous build
if (Test-Path $BuildDir) {
    Write-Host "Cleaning previous build..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $BuildDir
}

# Build Windows executable
Write-Host "Building Windows executable..." -ForegroundColor Cyan
wails build

# Check for executable
$ExeName = "PDF Wizard.exe"
$ExePath = Join-Path $BuildDir $ExeName

if (-not (Test-Path $ExePath)) {
    Write-Host "❌ Build failed: $ExeName not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Check if NSIS installer was created
$NsisInstaller = Join-Path $BuildDir "PDF Wizard Installer.exe"
if (Test-Path $NsisInstaller) {
    Write-Host "NSIS installer found, copying to dist..." -ForegroundColor Cyan
    Copy-Item $NsisInstaller (Join-Path $OutputDir "pdf_wizard-windows-installer.exe")
    Write-Host "✅ Created: pdf_wizard-windows-installer.exe" -ForegroundColor Green
} else {
    Write-Host "⚠️  NSIS installer not found. Make sure NSIS is installed:" -ForegroundColor Yellow
    Write-Host "   Download from: https://nsis.sourceforge.io/Download" -ForegroundColor Yellow
    Write-Host "   Or install via: choco install nsis" -ForegroundColor Yellow
}

# Create ZIP archive with executable
Write-Host "Creating ZIP archive..." -ForegroundColor Cyan
Set-Location $BuildDir

$ZipPath = Join-Path $OutputDir "pdf_wizard-windows-portable.zip"
Compress-Archive -Path $ExeName -DestinationPath $ZipPath -Force
Write-Host "✅ Created: pdf_wizard-windows-portable.zip" -ForegroundColor Green

# Create README for Windows distribution
$ReadmeContent = @"
PDF Wizard - Windows Installation Instructions
===============================================

QUICK START (Installer):
1. Double-click "pdf_wizard-windows-installer.exe"
2. Follow the installation wizard
3. Launch PDF Wizard from the Start menu or desktop shortcut

QUICK START (Portable ZIP):
1. Extract the ZIP file to a folder of your choice
2. Double-click "PDF Wizard.exe" to run
3. No installation required - it's portable!

SYSTEM REQUIREMENTS:
- Windows 10 or later
- Works on both 32-bit and 64-bit Windows

TROUBLESHOOTING:
If Windows Defender or SmartScreen blocks the app:
1. Click "More info" on the warning screen
2. Click "Run anyway"
3. The app is safe - it's just not code-signed

If the app won't run:
1. Check Windows Defender → Virus & threat protection
2. Add an exclusion for the PDF Wizard folder if needed
3. Ensure you have Windows 10 or later
4. Install Visual C++ Redistributable if prompted

For more information, visit: https://github.com/your-repo/pdf_wizard
"@

$ReadmePath = Join-Path $OutputDir "README-Windows.txt"
$ReadmeContent | Out-File -FilePath $ReadmePath -Encoding UTF8

Write-Host ""
Write-Host "📦 Distribution packages created in: $OutputDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Files created:" -ForegroundColor Cyan
Get-ChildItem $OutputDir | Where-Object { $_.Extension -match "\.(exe|zip|txt)$" } | Format-Table Name, Length, LastWriteTime -AutoSize
Write-Host ""
Write-Host "✅ Ready for distribution!" -ForegroundColor Green

