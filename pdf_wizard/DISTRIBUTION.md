# PDF Wizard Distribution Guide

Step-by-step packaging for maintainers (DMG, ZIP, Windows binaries, NSIS). Prerequisites and the global documentation index are in the repository **[README.md](../README.md)**; architecture notes live in **[SYSTEM_DESIGN.md](../SYSTEM_DESIGN.md)**. This file intentionally holds the **release build** detail so it is not duplicated in the root README.

**Version control:** Prebuilt packages that ship from this repo (DMG, ZIP, Windows binaries, READMEs) live under **`pdf_wizard/dist/`** only. Wails build outputs under **`pdf_wizard/build/`** (binaries, generated plists, etc.) are **gitignored** and not committed—run `wails build` or `./build-dist.sh` locally to create them. The exception is **`pdf_wizard/build/appicon.png`**, which **is** tracked so `wails dev` / `wails build` always have the application icon. Regenerate it from **`assets/img/app_logo.png`** with **`bash scripts/update-app-icons.sh`** (repo root) whenever branding changes.

## Building for Distribution

### macOS Build

#### Step 1: Build the Application

Build for universal binary (works on both Intel and Apple Silicon Macs):

```bash
cd pdf_wizard
wails build -platform darwin/universal
```

Or build for a specific architecture:

- Intel Macs: `wails build -platform darwin/amd64`
- Apple Silicon Macs: `wails build -platform darwin/arm64`

#### Step 2: Prepare for Distribution

The built app will be in `build/bin/PDF Wizard.app`. To make it portable:

#### Option A: Remove Quarantine Attributes (Recommended for Personal Use)

On the target machine, after copying the app, run:

```bash
/usr/bin/xattr -cr "/path/to/PDF Wizard.app"
```

Then open it normally.

#### Transfer method and Gatekeeper

Copying the app or DMG via **AirDrop, WeChat, USB, etc.** does **not** bypass macOS **Gatekeeper** or **notarization** requirements. Recipients still see the same “unidentified developer” / quarantine behavior as with a download from the web until the app is **signed and notarized** (or they use **Right-click → Open**). See the root **[README.md](../README.md)** troubleshooting section.

#### Option B: Code Signing (Recommended for Public Distribution)

For distribution to other users, you should code sign the app:

1. **Get an Apple Developer Certificate** (optional, but recommended)

   - Join Apple Developer Program ($99/year)
   - Create a Developer ID Application certificate

2. **Sign the app:**

   ```bash
   codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" "build/bin/PDF Wizard.app"
   ```

3. **Verify signing:**
   ```bash
   codesign --verify --verbose "build/bin/PDF Wizard.app"
   ```

### Windows Build

#### Step 1: Build the Application

Build for Windows:

```bash
cd pdf_wizard
wails build -nsis
```

This creates `build/bin/PDF Wizard.exe`. With NSIS on your PATH (`makensis` available), Wails also writes an installer next to it, named like **`pdf_wizard-amd64-installer.exe`** (from `build/windows/installer/project.nsi`: `${INFO_PROJECTNAME}-${ARCH}-installer.exe`), not `PDF Wizard Installer.exe`.

**Note**: NSIS is required for the installer artifact:

- Download from: https://nsis.sourceforge.io/Download
- Or install via Chocolatey: `choco install nsis`
- Ensure the NSIS `Bin` folder is on your PATH (open a **new** terminal after install), or `wails build -nsis` will not produce the installer
- **`build-dist.ps1`** prepends PATH for the build only if it finds `makensis.exe` under typical locations (e.g. `Program Files (x86)\NSIS`, Chocolatey `lib\nsis`)

Use `wails build` (without `-nsis`) if you only need the standalone `.exe` and not the installer.

#### Step 2: Prepare for Distribution

The built executable will be in `build/bin/PDF Wizard.exe`. For distribution:

- **Standalone executable**: Copy `PDF Wizard.exe` directly
- **NSIS installer**: If you run `wails build -nsis` and `makensis` is on PATH, you get `build/bin/*-installer.exe` (e.g. `pdf_wizard-amd64-installer.exe`)
- **Portable ZIP**: Create a ZIP archive containing the executable

## Distribution Methods

### macOS Distribution

#### Method 1: Direct .app Bundle (Simplest)

1. Copy `build/bin/PDF Wizard.app` to the target machine
2. Right-click the app → Open → Click "Open" to bypass security warning
3. Or run: `/usr/bin/xattr -cr "PDF Wizard.app"` then double-click

#### Method 2: Create a Disk Image (.dmg)

Create a professional-looking DMG file with Applications folder:

```bash
# Create temporary directory
DMG_TEMP=$(mktemp -d)
cp -R "build/bin/PDF Wizard.app" "$DMG_TEMP/"
ln -s /Applications "$DMG_TEMP/Applications"

# Create DMG
hdiutil create -volname "PDF Wizard" \
    -srcfolder "$DMG_TEMP" \
    -ov -format UDZO pdf_wizard.dmg

rm -rf "$DMG_TEMP"
```

Or use the automated script:

```bash
./build-dist.sh
```

This creates `pdf_wizard.dmg` that can be shared. Users can:

1. Double-click the DMG to mount it
2. Drag the app to the Applications folder (shown in the DMG window)
3. Eject the DMG

#### Method 3: Create a ZIP Archive

Simple compression:

```bash
cd build/bin
zip -r pdf_wizard.zip "PDF Wizard.app"
```

Users extract and run the app.

### Windows Distribution

#### Method 1: Standalone Executable (Simplest)

1. Copy `build/bin/PDF Wizard.exe` to the target machine
2. Double-click to run - no installation required!

#### Method 2: NSIS Installer (Recommended for Installation)

If you build with `wails build -nsis` and NSIS is available on PATH, an installer will be created:

1. The installer (e.g. `pdf_wizard-amd64-installer.exe`) will be in `build/bin/`
2. Users can run the installer to install PDF Wizard
3. Creates Start menu shortcuts and desktop icon

**Note**: NSIS installer is only created if NSIS is installed on the build machine.

#### Method 3: Portable ZIP Archive

Create a ZIP archive containing the executable:

```bash
cd build/bin
zip pdf_wizard-windows-portable.zip "PDF Wizard.exe"
```

Users extract and run the executable.

## Automated Distribution Scripts

### Cross-Platform Build Script

Use the automated build script that detects your OS:

**On macOS/Linux:**

```bash
cd pdf_wizard
./build-dist.sh
```

**On Windows (PowerShell):**

```powershell
cd pdf_wizard
.\build-dist.ps1
```

**On Windows (Git Bash/WSL):**

```bash
cd pdf_wizard
./build-dist.sh
```

The script automatically:

- Detects your operating system
- Builds the application
- Creates distribution packages:
  - **macOS** (`build-dist.sh`): DMG installer and ZIP archive
  - **Windows** (`build-dist.ps1`): standalone executable, NSIS installer when NSIS is on PATH (`wails build -nsis`), and portable ZIP
  - **Windows** (`build-dist.sh` from Git Bash/WSL): standalone executable and portable ZIP only (use `build-dist.ps1` for the NSIS installer)

All distribution files are created in the `pdf_wizard/dist` directory.

## Troubleshooting

### macOS Issues

#### "App is damaged and can't be opened"

This is a macOS security feature. Solutions:

1. **Remove quarantine (quick fix):**

   ```bash
   /usr/bin/xattr -cr "PDF Wizard.app"
   ```

2. **Right-click → Open (first time only):**

   - Right-click the app
   - Select "Open"
   - Click "Open" in the security dialog

3. **Allow in System Settings:**
   - System Settings → Privacy & Security
   - Scroll to "Security" section
   - Click "Open Anyway" if the app is listed

#### "App won't run on different architecture"

Build a universal binary:

```bash
wails build -platform darwin/universal
```

#### "Missing dependencies"

Ensure all resources are embedded:

- Check `wails.json` configuration
- Verify `build/bin/PDF Wizard.app/Contents/Resources/` contains necessary files

### Windows Issues

#### "Windows Defender or SmartScreen blocks the app"

This is a Windows security feature for unsigned applications. Solutions:

1. **Click "More info"** on the warning screen
2. **Click "Run anyway"**
3. The app is safe - it's just not code-signed

#### "App won't run"

1. Check Windows Defender → Virus & threat protection
2. Add an exclusion for the PDF Wizard folder if needed
3. Ensure you have Windows 10 or later
4. Install Visual C++ Redistributable if prompted

#### "NSIS installer not created"

The NSIS installer is only created when you run **`wails build -nsis`** (as **`build-dist.ps1`** does) and **`makensis`** is on your PATH:

1. Download NSIS from: https://nsis.sourceforge.io/Download
2. Or install via Chocolatey (as Administrator): `choco install nsis`
3. Open a **new** terminal and confirm: `makensis /VERSION`
4. Rebuild: `wails build -nsis`
5. The installer will be created in `build/bin/` as `*-installer.exe` (e.g. `pdf_wizard-amd64-installer.exe`)

## Best Practices

1. **Test on a clean machine** before distribution
2. **Include a README** with installation instructions
3. **Version your releases** in the app info
4. **Consider code signing** for wider distribution (macOS: Apple Developer Certificate, Windows: Code Signing Certificate)
5. **Test on both Intel and Apple Silicon** if building universal macOS binary
6. **Test on both 32-bit and 64-bit Windows** if targeting both architectures
7. **Use the automated build scripts** (`build-dist.sh` or `build-dist.ps1`) for consistent distribution packages
