#!/bin/bash

# PDF Wizard Distribution Builder
# This script builds and packages PDF Wizard for macOS distribution

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build/bin"
OUTPUT_DIR="$SCRIPT_DIR/dist"

echo "🔨 Building PDF Wizard..."
cd "$SCRIPT_DIR"

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
    echo "Cleaning previous build..."
    rm -rf "$BUILD_DIR"
fi

# Build for universal binary (Intel + Apple Silicon)
echo "Building universal binary..."
wails build -platform darwin/universal

if [ ! -d "$BUILD_DIR/pdf_wizard.app" ]; then
    echo "❌ Build failed: pdf_wizard.app not found"
    exit 1
fi

echo "✅ Build successful!"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Remove quarantine attributes
echo "Removing quarantine attributes..."
xattr -cr "$BUILD_DIR/pdf_wizard.app"

# Create ZIP archive
echo "Creating ZIP archive..."
cd "$BUILD_DIR"
zip -r "$OUTPUT_DIR/pdf_wizard-macos-universal.zip" pdf_wizard.app
echo "✅ Created: $OUTPUT_DIR/pdf_wizard-macos-universal.zip"

# Create DMG with Applications folder (professional installer)
if command -v hdiutil &> /dev/null; then
    echo "Creating DMG installer with Applications folder..."
    
    # Create a temporary directory for DMG contents
    DMG_TEMP_DIR=$(mktemp -d)
    trap "rm -rf '$DMG_TEMP_DIR'" EXIT
    
    # Copy app to temp directory
    cp -R "$BUILD_DIR/pdf_wizard.app" "$DMG_TEMP_DIR/"
    
    # Create Applications folder link (symbolic link)
    ln -s /Applications "$DMG_TEMP_DIR/Applications"
    
    # Create DMG
    hdiutil create -volname "PDF Wizard" \
        -fs HFS+ \
        -srcfolder "$DMG_TEMP_DIR" \
        -ov -format UDZO \
        "$OUTPUT_DIR/pdf_wizard-macos-universal.dmg"
    
    if [ -f "$OUTPUT_DIR/pdf_wizard-macos-universal.dmg" ]; then
        echo "✅ Created: $OUTPUT_DIR/pdf_wizard-macos-universal.dmg"
        echo "   Users can drag the app to the Applications folder to install"
    fi
    
    # Cleanup
    rm -rf "$DMG_TEMP_DIR"
fi

# Create README for distribution
cat > "$OUTPUT_DIR/README.txt" << 'EOF'
PDF Wizard - Installation Instructions
=====================================

QUICK START (DMG):
1. Double-click the DMG file to mount it
2. Drag pdf_wizard.app to the Applications folder (shown in the DMG window)
3. Open Applications folder and launch PDF Wizard
4. On first launch: Right-click → Open → Click "Open" to bypass security warning

QUICK START (ZIP):
1. Extract the ZIP file
2. Right-click pdf_wizard.app → Open → Click "Open"
3. Or run in Terminal: xattr -cr pdf_wizard.app

SYSTEM REQUIREMENTS:
- macOS 10.13 or later
- Works on Intel and Apple Silicon Macs

TROUBLESHOOTING:
If you see "App is damaged and can't be opened":
1. Right-click the app → Open → Click "Open"
2. Or run: xattr -cr pdf_wizard.app

If the app won't run:
1. Check System Settings → Privacy & Security
2. Allow the app if it's blocked
3. Ensure you have macOS 10.13 or later

For more information, visit: https://github.com/your-repo/pdf_wizard
EOF

echo ""
echo "📦 Distribution packages created in: $OUTPUT_DIR"
echo ""
echo "Files created:"
ls -lh "$OUTPUT_DIR" | tail -n +2
echo ""
echo "✅ Ready for distribution!"

