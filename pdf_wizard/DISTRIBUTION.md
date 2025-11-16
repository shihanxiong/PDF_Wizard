# PDF Wizard Distribution Guide

This guide explains how to build and distribute PDF Wizard as a portable macOS application.

## Building for Distribution

### Step 1: Build the Application

Build for universal binary (works on both Intel and Apple Silicon Macs):

```bash
cd pdf_wizard
wails build -platform darwin/universal
```

Or build for a specific architecture:

- Intel Macs: `wails build -platform darwin/amd64`
- Apple Silicon Macs: `wails build -platform darwin/arm64`

### Step 2: Prepare for Distribution

The built app will be in `build/bin/PDF Wizard.app`. To make it portable:

#### Option A: Remove Quarantine Attributes (Recommended for Personal Use)

On the target machine, after copying the app, run:

```bash
xattr -cr "/path/to/PDF Wizard.app"
```

Then open it normally.

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

## Distribution Methods

### Method 1: Direct .app Bundle (Simplest)

1. Copy `build/bin/PDF Wizard.app` to the target machine
2. Right-click the app → Open → Click "Open" to bypass security warning
3. Or run: `xattr -cr "PDF Wizard.app"` then double-click

### Method 2: Create a Disk Image (.dmg)

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

### Method 3: Create a ZIP Archive

Simple compression:

```bash
cd build/bin
zip -r pdf_wizard.zip "PDF Wizard.app"
```

Users extract and run the app.

## Troubleshooting

### "App is damaged and can't be opened"

This is a macOS security feature. Solutions:

1. **Remove quarantine (quick fix):**

   ```bash
   xattr -cr "PDF Wizard.app"
   ```

2. **Right-click → Open (first time only):**

   - Right-click the app
   - Select "Open"
   - Click "Open" in the security dialog

3. **Allow in System Settings:**
   - System Settings → Privacy & Security
   - Scroll to "Security" section
   - Click "Open Anyway" if the app is listed

### "App won't run on different architecture"

Build a universal binary:

```bash
wails build -platform darwin/universal
```

### "Missing dependencies"

Ensure all resources are embedded:

- Check `wails.json` configuration
- Verify `build/bin/PDF Wizard.app/Contents/Resources/` contains necessary files

## Best Practices

1. **Test on a clean machine** before distribution
2. **Include a README** with installation instructions
3. **Version your releases** in the app info
4. **Consider code signing** for wider distribution
5. **Test on both Intel and Apple Silicon** if building universal

## Quick Distribution Script

See `build-dist.sh` for an automated build and packaging script.
