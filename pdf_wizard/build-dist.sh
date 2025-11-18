#!/bin/bash

# PDF Wizard Distribution Builder
# This script builds and packages PDF Wizard for macOS and Windows distribution

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build/bin"
OUTPUT_DIR="$SCRIPT_DIR/dist"

# Detect operating system
detect_os() {
    case "$(uname -s)" in
        Darwin*)
            echo "darwin"
            ;;
        Linux*)
            echo "linux"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            echo "windows"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

OS=$(detect_os)

echo "🔨 Building PDF Wizard for $OS..."
cd "$SCRIPT_DIR"

# Clean previous build
if [ -d "$BUILD_DIR" ]; then
    echo "Cleaning previous build..."
    rm -rf "$BUILD_DIR"
fi

# Build based on OS
if [ "$OS" = "darwin" ]; then
    # macOS build
    echo "Building universal binary for macOS..."
    wails build -platform darwin/universal
    
    # Wails creates the bundle with the 'name' field from wails.json (pdf_wizard.app)
    # We need to rename it to "PDF Wizard.app" for proper display name
    if [ ! -d "$BUILD_DIR/pdf_wizard.app" ]; then
        echo "❌ Build failed: pdf_wizard.app not found"
        exit 1
    fi
    
    # Rename the bundle to "PDF Wizard.app" for proper display in Applications folder
    if [ -d "$BUILD_DIR/pdf_wizard.app" ]; then
        echo "Renaming app bundle to 'PDF Wizard.app'..."
        mv "$BUILD_DIR/pdf_wizard.app" "$BUILD_DIR/PDF Wizard.app"
    fi
    
    if [ ! -d "$BUILD_DIR/PDF Wizard.app" ]; then
        echo "❌ Failed to rename app bundle"
        exit 1
    fi
    
    echo "✅ Build successful!"
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Remove quarantine attributes
    echo "Removing quarantine attributes..."
    xattr -cr "$BUILD_DIR/PDF Wizard.app"
    
    # Create ZIP archive
    echo "Creating ZIP archive..."
    cd "$BUILD_DIR"
    zip -r "$OUTPUT_DIR/pdf_wizard-macos-universal.zip" "PDF Wizard.app"
    echo "✅ Created: $OUTPUT_DIR/pdf_wizard-macos-universal.zip"
    
    # Create DMG with Applications folder (professional installer)
    if command -v hdiutil &> /dev/null; then
        echo "Creating DMG installer with Applications folder..."
        
        # Create a temporary directory for DMG contents
        DMG_TEMP_DIR=$(mktemp -d)
        DMG_TEMP_FILE=$(mktemp -u).dmg
        MOUNT_POINT=""
        
        # Combined cleanup function for DMG and temp directory
        cleanup_dmg() {
            if [ -n "$MOUNT_POINT" ] && [ -d "$MOUNT_POINT" ]; then
                hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
            fi
            if [ -f "$DMG_TEMP_FILE" ]; then
                rm -f "$DMG_TEMP_FILE"
            fi
            if [ -d "$DMG_TEMP_DIR" ]; then
                rm -rf "$DMG_TEMP_DIR"
            fi
        }
        trap cleanup_dmg EXIT
        
        # Copy app to temp directory
        cp -R "$BUILD_DIR/PDF Wizard.app" "$DMG_TEMP_DIR/"
        
        # Create Applications folder link (symbolic link) - will be replaced with proper alias
        ln -s /Applications "$DMG_TEMP_DIR/Applications"
        
        hdiutil create -volname "PDF Wizard" \
            -fs HFS+ \
            -srcfolder "$DMG_TEMP_DIR" \
            -ov -format UDRW \
            "$DMG_TEMP_FILE"
        
        # Mount the DMG
        MOUNT_OUTPUT=$(hdiutil attach -readwrite -noverify -noautoopen "$DMG_TEMP_FILE" 2>&1)
        # Extract mount point from the line containing Apple_HFS (the actual mounted volume)
        # The output is tab-separated, so use tab as field separator to preserve spaces in mount point
        MOUNT_POINT=$(echo "$MOUNT_OUTPUT" | grep "Apple_HFS" | awk -F'\t' '{print $3}' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        if [ -z "$MOUNT_POINT" ] || [ ! -d "$MOUNT_POINT" ]; then
            echo "❌ Failed to mount DMG"
            echo "   Output: $MOUNT_OUTPUT"
            echo "   Extracted mount point: '$MOUNT_POINT'"
            cleanup_dmg
            exit 1
        fi
        
        # Remove the symlink and create a proper alias with icon
        rm -f "$MOUNT_POINT/Applications"
        
        # Create a proper alias using osascript (preserves icon)
        osascript <<EOF
tell application "Finder"
    set sourceFolder to POSIX file "/Applications"
    set destFolder to POSIX file "$MOUNT_POINT"
    make alias file to sourceFolder at destFolder with properties {name:"Applications"}
end tell
EOF
        
        # Ensure the alias has the correct icon by setting its type
        # This forces macOS to recognize it as an Applications folder alias
        if [ -f "$MOUNT_POINT/Applications" ]; then
            # Set the file type to ensure proper icon display
            SetFile -a C "$MOUNT_POINT/Applications" 2>/dev/null || true
        fi
        
        # Unmount the DMG
        hdiutil detach "$MOUNT_POINT" -quiet
        MOUNT_POINT=""  # Clear mount point so cleanup function doesn't try to unmount again
        
        # Convert to compressed format
        hdiutil convert "$DMG_TEMP_FILE" \
            -format UDZO \
            -o "$OUTPUT_DIR/pdf_wizard-macos-universal.dmg" \
            -ov
        
        # Cleanup temporary DMG (trap will handle if script exits early)
        rm -f "$DMG_TEMP_FILE"
        rm -rf "$DMG_TEMP_DIR"
        trap - EXIT  # Remove the cleanup trap since we're done
        
        if [ -f "$OUTPUT_DIR/pdf_wizard-macos-universal.dmg" ]; then
            echo "✅ Created: $OUTPUT_DIR/pdf_wizard-macos-universal.dmg"
            echo "   Users can drag the app to the Applications folder to install"
        fi
    fi
    
    # Create README for macOS distribution
    cat > "$OUTPUT_DIR/README-macOS.txt" << 'EOF'
PDF Wizard - macOS Installation Instructions
===========================================

QUICK START (DMG):
1. Double-click the DMG file to mount it
2. Drag PDF Wizard.app to the Applications folder (shown in the DMG window)
3. Open Applications folder and launch PDF Wizard
4. On first launch: Right-click → Open → Click "Open" to bypass security warning

QUICK START (ZIP):
1. Extract the ZIP file
2. Right-click PDF Wizard.app → Open → Click "Open"
3. Or run in Terminal: xattr -cr "PDF Wizard.app"

SYSTEM REQUIREMENTS:
- macOS 10.13 or later
- Works on Intel and Apple Silicon Macs

TROUBLESHOOTING:
If you see "App is damaged and can't be opened":
1. Right-click the app → Open → Click "Open"
2. Or run: xattr -cr "PDF Wizard.app"

If the app won't run:
1. Check System Settings → Privacy & Security
2. Allow the app if it's blocked
3. Ensure you have macOS 10.13 or later

For more information, visit: https://github.com/your-repo/pdf_wizard
EOF

elif [ "$OS" = "windows" ]; then
    # Windows build
    echo "Building Windows executable..."
    wails build
    
    # Check for executable
    EXE_NAME="PDF Wizard.exe"
    if [ ! -f "$BUILD_DIR/$EXE_NAME" ]; then
        echo "❌ Build failed: $EXE_NAME not found"
        exit 1
    fi
    
    echo "✅ Build successful!"
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Copy standalone executable to dist with naming convention matching macOS
    echo "Copying standalone executable to dist..."
    cp "$BUILD_DIR/$EXE_NAME" "$OUTPUT_DIR/pdf_wizard-windows.exe"
    echo "✅ Created: $OUTPUT_DIR/pdf_wizard-windows.exe"
    
    # Check if NSIS installer was created
    NSIS_INSTALLER="$BUILD_DIR/PDF Wizard Installer.exe"
    if [ -f "$NSIS_INSTALLER" ]; then
        echo "NSIS installer found, copying to dist..."
        cp "$NSIS_INSTALLER" "$OUTPUT_DIR/pdf_wizard-windows-installer.exe"
        echo "✅ Created: $OUTPUT_DIR/pdf_wizard-windows-installer.exe"
    else
        echo "⚠️  NSIS installer not found. Make sure NSIS is installed:"
        echo "   Download from: https://nsis.sourceforge.io/Download"
        echo "   Or install via: choco install nsis"
    fi
    
    # Create ZIP archive with executable
    echo "Creating ZIP archive..."
    cd "$BUILD_DIR"
    
    # Use zip if available (Git Bash, WSL)
    if command -v zip &> /dev/null; then
        zip -r "$OUTPUT_DIR/pdf_wizard-windows-portable.zip" "$EXE_NAME"
        echo "✅ Created: $OUTPUT_DIR/pdf_wizard-windows-portable.zip"
    # Use PowerShell if zip is not available
    elif command -v powershell.exe &> /dev/null; then
        powershell.exe -Command "Compress-Archive -Path '$EXE_NAME' -DestinationPath '$OUTPUT_DIR/pdf_wizard-windows-portable.zip' -Force"
        echo "✅ Created: $OUTPUT_DIR/pdf_wizard-windows-portable.zip"
    else
        echo "⚠️  Neither zip nor PowerShell found. Please manually create ZIP archive."
    fi
    
    # Create README for Windows distribution
    cat > "$OUTPUT_DIR/README-Windows.txt" << 'EOF'
PDF Wizard - Windows Installation Instructions
===============================================

QUICK START (Standalone Executable):
1. Double-click "pdf_wizard-windows.exe" to run
2. No installation required - it's portable!

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
EOF

else
    echo "❌ Unsupported operating system: $OS"
    echo "Supported OS: macOS (darwin), Windows (MINGW/MSYS/CYGWIN)"
    exit 1
fi

echo ""
echo "📦 Distribution packages created in: $OUTPUT_DIR"
echo ""
echo "Files created:"
if [ "$OS" = "darwin" ]; then
    ls -lh "$OUTPUT_DIR" | tail -n +2 | grep -E "\.(dmg|zip|txt)$"
elif [ "$OS" = "windows" ]; then
    # List Windows files: .exe (standalone and installer) and .zip
    ls -lh "$OUTPUT_DIR" | tail -n +2 | grep -E "pdf_wizard-windows"
fi
echo ""
echo "✅ Ready for distribution!"
