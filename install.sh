#!/bin/bash

# PDF Wizard Installation Script
# This script installs all necessary dependencies for PDF Wizard development
# Includes: Go, Node.js 22.21.1 (via asdf), Wails2 CLI, and frontend dependencies

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Go installation
check_go() {
    info "Checking Go installation..."
    
    if command_exists go; then
        GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
        GO_MAJOR=$(echo $GO_VERSION | cut -d. -f1)
        GO_MINOR=$(echo $GO_VERSION | cut -d. -f2)
        
        if [ "$GO_MAJOR" -gt 1 ] || ([ "$GO_MAJOR" -eq 1 ] && [ "$GO_MINOR" -ge 21 ]); then
            success "Go $GO_VERSION is installed"
            return 0
        else
            error "Go version $GO_VERSION found, but version 1.21+ is required"
            return 1
        fi
    else
        error "Go is not installed"
        return 1
    fi
}

# Install Go
install_go() {
    info "Installing Go..."
    
    OS=$(uname -s)
    
    if [ "$OS" = "Darwin" ]; then
        if command_exists brew; then
            info "Installing Go via Homebrew..."
            brew install go
            success "Go installed via Homebrew"
        else
            warning "Homebrew not found. Please install Go manually from https://go.dev/doc/install"
            warning "After installation, run this script again."
            exit 1
        fi
    elif [ "$OS" = "Linux" ]; then
        info "To install Go on Linux, please visit: https://go.dev/doc/install"
        warning "Or use your package manager: sudo apt-get install golang-go (check version requirements)"
        exit 1
    else
        error "Unsupported OS: $OS"
        error "Please install Go manually from https://go.dev/doc/install"
        exit 1
    fi
}

# Check Node.js installation
check_node() {
    info "Checking Node.js installation..."
    
    REQUIRED_NODE_VERSION="22.21.1"
    
    # Source asdf if available (to find asdf-managed Node.js)
    if [ -s "$HOME/.asdf/asdf.sh" ]; then
        source "$HOME/.asdf/asdf.sh" 2>/dev/null || true
    fi
    
    if command_exists node; then
        NODE_VERSION=$(node --version | sed 's/v//')
        
        if [ "$NODE_VERSION" = "$REQUIRED_NODE_VERSION" ]; then
            success "Node.js $NODE_VERSION is installed (required version)"
            
            if command_exists npm; then
                NPM_VERSION=$(npm --version)
                success "npm $NPM_VERSION is installed"
                return 0
            else
                error "npm is not installed"
                return 1
            fi
        else
            error "Node.js version $NODE_VERSION found, but version $REQUIRED_NODE_VERSION is required"
            return 1
        fi
    else
        error "Node.js is not installed"
        return 1
    fi
}

# Check if asdf is installed
check_asdf() {
    if [ -s "$HOME/.asdf/asdf.sh" ] || command_exists asdf; then
        return 0
    else
        return 1
    fi
}

# Source asdf
source_asdf() {
    if [ -s "$HOME/.asdf/asdf.sh" ]; then
        source "$HOME/.asdf/asdf.sh"
    fi
    # Also source completions if available
    if [ -s "$HOME/.asdf/completions/asdf.bash" ]; then
        source "$HOME/.asdf/completions/asdf.bash"
    fi
}

# Install asdf
install_asdf() {
    info "Installing asdf version manager..."
    
    OS=$(uname -s)
    
    if [ "$OS" = "Darwin" ]; then
        if command_exists brew; then
            info "Installing asdf via Homebrew..."
            brew install asdf
            success "asdf installed via Homebrew"
        else
            info "Installing asdf via git..."
            git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.0
            success "asdf installed via git"
        fi
    elif [ "$OS" = "Linux" ]; then
        info "Installing asdf via git..."
        git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.0
        success "asdf installed via git"
    else
        error "Unsupported OS: $OS"
        error "Please install asdf manually from https://asdf-vm.com/guide/getting-started.html"
        exit 1
    fi
    
    # Add asdf to shell profile
    SHELL_PROFILE=""
    if [ -n "$ZSH_VERSION" ] || [ -f ~/.zshrc ]; then
        SHELL_PROFILE="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ] || [ -f ~/.bashrc ]; then
        SHELL_PROFILE="$HOME/.bashrc"
    elif [ -f ~/.bash_profile ]; then
        SHELL_PROFILE="$HOME/.bash_profile"
    fi
    
    if [ -n "$SHELL_PROFILE" ]; then
        if ! grep -q "asdf.sh" "$SHELL_PROFILE" 2>/dev/null; then
            info "Adding asdf to $SHELL_PROFILE..."
            echo "" >> "$SHELL_PROFILE"
            echo "# asdf version manager" >> "$SHELL_PROFILE"
            echo ". \"$HOME/.asdf/asdf.sh\"" >> "$SHELL_PROFILE"
            echo ". \"$HOME/.asdf/completions/asdf.bash\"" >> "$SHELL_PROFILE"
            success "Added asdf to $SHELL_PROFILE"
        fi
    fi
    
    # Source asdf in current session
    source_asdf
}

# Install Node.js
install_node() {
    info "Installing Node.js 22.21.1..."
    
    REQUIRED_NODE_VERSION="22.21.1"
    
    # Check if asdf is installed
    if ! check_asdf; then
        echo ""
        read -p "asdf is not installed. Install it now? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_asdf
        else
            error "asdf is required to install Node.js $REQUIRED_NODE_VERSION"
            error "Please install asdf manually from https://asdf-vm.com/guide/getting-started.html"
            exit 1
        fi
    fi
    
    # Source asdf
    source_asdf
    
    if ! command_exists asdf; then
        error "asdf is not available. Please restart your terminal and run this script again."
        exit 1
    fi
    
    # Check if nodejs plugin is installed
    if ! asdf plugin list | grep -q "^nodejs$"; then
        info "Installing asdf nodejs plugin..."
        asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
        success "nodejs plugin installed"
    fi
    
    # Install Node.js version
    info "Installing Node.js $REQUIRED_NODE_VERSION via asdf..."
    asdf install nodejs "$REQUIRED_NODE_VERSION"
    
    # Set as global default (using asdf set for newer versions)
    info "Setting Node.js $REQUIRED_NODE_VERSION as global default..."
    
    # Create or update ~/.tool-versions for global setting
    if [ -f ~/.tool-versions ]; then
        # Update existing .tool-versions
        if grep -q "^nodejs " ~/.tool-versions; then
            # Replace existing nodejs version (macOS-compatible sed)
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/^nodejs .*/nodejs $REQUIRED_NODE_VERSION/" ~/.tool-versions
            else
                sed -i "s/^nodejs .*/nodejs $REQUIRED_NODE_VERSION/" ~/.tool-versions
            fi
        else
            # Add nodejs version
            echo "nodejs $REQUIRED_NODE_VERSION" >> ~/.tool-versions
        fi
    else
        # Create new .tool-versions
        echo "nodejs $REQUIRED_NODE_VERSION" > ~/.tool-versions
    fi
    
    # Also set in current directory for project
    asdf set nodejs "$REQUIRED_NODE_VERSION" 2>/dev/null || true
    
    # Reshim to make sure node is available
    asdf reshim nodejs "$REQUIRED_NODE_VERSION" 2>/dev/null || true
    
    # Verify installation
    source_asdf
    if command_exists node; then
        INSTALLED_VERSION=$(node --version | sed 's/v//')
        if [ "$INSTALLED_VERSION" = "$REQUIRED_NODE_VERSION" ]; then
            success "Node.js $REQUIRED_NODE_VERSION installed via asdf"
            return 0
        else
            warning "Node.js installed but version mismatch. Expected $REQUIRED_NODE_VERSION, got $INSTALLED_VERSION"
            warning "You may need to restart your terminal or run: source ~/.zshrc"
            return 1
        fi
    else
        warning "Node.js installation completed, but command not immediately available"
        warning "Please restart your terminal or run: source ~/.zshrc"
        return 1
    fi
}

# Check Wails2 installation
check_wails() {
    info "Checking Wails2 CLI installation..."
    
    if command_exists wails; then
        WAILS_VERSION=$(wails version 2>/dev/null | head -n1 || echo "unknown")
        success "Wails2 CLI is installed: $WAILS_VERSION"
        return 0
    else
        error "Wails2 CLI is not installed"
        return 1
    fi
}

# Add GOPATH/bin to shell profile
# Returns the shell profile path via global variable SHELL_PROFILE_PATH
add_gopath_to_profile() {
    GOPATH_BIN=$(go env GOPATH)/bin
    PATH_EXPORT="export PATH=\$PATH:$GOPATH_BIN"
    
    # Detect shell profile file
    SHELL_PROFILE=""
    if [ -n "$ZSH_VERSION" ] || [ -f ~/.zshrc ]; then
        SHELL_PROFILE="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ] || [ -f ~/.bashrc ]; then
        SHELL_PROFILE="$HOME/.bashrc"
    elif [ -f ~/.bash_profile ]; then
        SHELL_PROFILE="$HOME/.bash_profile"
    fi
    
    if [ -n "$SHELL_PROFILE" ]; then
        # Check if already added
        if ! grep -q "GOPATH.*bin" "$SHELL_PROFILE" 2>/dev/null; then
            info "Adding GOPATH/bin to $SHELL_PROFILE..."
            echo "" >> "$SHELL_PROFILE"
            echo "# Added by PDF Wizard install.sh - Go binaries path" >> "$SHELL_PROFILE"
            echo "$PATH_EXPORT" >> "$SHELL_PROFILE"
            success "Added to $SHELL_PROFILE"
            SHELL_PROFILE_PATH="$SHELL_PROFILE"
            return 0
        else
            info "GOPATH/bin already configured in $SHELL_PROFILE"
            SHELL_PROFILE_PATH="$SHELL_PROFILE"
            return 0
        fi
    else
        warning "Could not detect shell profile file"
        SHELL_PROFILE_PATH=""
        return 1
    fi
}

# Install Wails2
install_wails() {
    info "Installing Wails2 CLI..."
    
    # Ensure Go is in PATH
    if ! command_exists go; then
        error "Go is required to install Wails2 CLI"
        exit 1
    fi
    
    info "Installing Wails2 CLI via go install..."
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
    
    # Check if GOPATH/bin is in PATH
    GOPATH_BIN=$(go env GOPATH)/bin
    if [[ ":$PATH:" != *":$GOPATH_BIN:"* ]]; then
        info "Adding GOPATH/bin to your PATH..."
        
        # Add to shell profile
        SHELL_PROFILE_PATH=""
        if add_gopath_to_profile; then
            # Also add to current session
            export PATH="$PATH:$GOPATH_BIN"
            success "GOPATH/bin added to PATH"
            
            # Source the profile to make it available immediately
            if [ -n "$SHELL_PROFILE_PATH" ] && [ -f "$SHELL_PROFILE_PATH" ]; then
                info "Sourcing $SHELL_PROFILE_PATH to make Wails2 available in current session..."
                source "$SHELL_PROFILE_PATH" 2>/dev/null || true
            fi
        else
            warning "Could not automatically add to shell profile"
            warning "Please manually add this to your shell profile (~/.zshrc, ~/.bashrc, etc.):"
            echo "  export PATH=\$PATH:$GOPATH_BIN"
            echo ""
            info "Attempting to add to PATH for current session..."
            export PATH="$PATH:$GOPATH_BIN"
        fi
    fi
    
    if command_exists wails; then
        WAILS_VERSION=$(wails version 2>/dev/null | head -n1 || echo "unknown")
        success "Wails2 CLI installed: $WAILS_VERSION"
    else
        warning "Wails2 installation completed, but command not immediately available"
        info "Please run: source ~/.zshrc (or restart your terminal)"
        info "Then verify with: wails version"
    fi
}

# Install frontend dependencies
install_frontend_deps() {
    info "Installing frontend dependencies..."
    
    if [ ! -d "pdf_wizard/frontend" ]; then
        error "Frontend directory not found: pdf_wizard/frontend"
        return 1
    fi
    
    cd pdf_wizard/frontend
    
    if [ -f "package.json" ]; then
        info "Running npm install..."
        npm install
        success "Frontend dependencies installed"
        cd ../..
        return 0
    else
        warning "package.json not found in pdf_wizard/frontend"
        cd ../..
        return 1
    fi
}

# Main installation flow
main() {
    echo ""
    echo "=========================================="
    echo "  PDF Wizard Installation Script"
    echo "=========================================="
    echo ""
    
    # Check/Install Go
    if ! check_go; then
        echo ""
        read -p "Go is not installed or version is too old. Install it now? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_go
            
            # Reload shell environment
            if [ -f ~/.zshrc ]; then
                source ~/.zshrc 2>/dev/null || true
            elif [ -f ~/.bashrc ]; then
                source ~/.bashrc 2>/dev/null || true
            fi
            
            # Recheck
            if ! check_go; then
                error "Go installation verification failed. Please restart your terminal and run this script again."
                exit 1
            fi
        else
            error "Go is required. Please install it manually from https://go.dev/doc/install"
            exit 1
        fi
    fi
    
    # Check/Install Node.js
    if ! check_node; then
        echo ""
        read -p "Node.js is not installed or version is too old. Install it now? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            install_node
            
            # Reload shell environment (including asdf if installed)
            if [ -f ~/.zshrc ]; then
                source ~/.zshrc 2>/dev/null || true
            elif [ -f ~/.bashrc ]; then
                source ~/.bashrc 2>/dev/null || true
            fi
            
            # Also source asdf directly if it exists
            if [ -s "$HOME/.asdf/asdf.sh" ]; then
                source "$HOME/.asdf/asdf.sh" 2>/dev/null || true
            fi
            
            # Recheck
            if ! check_node; then
                error "Node.js installation verification failed. Please restart your terminal and run this script again."
                error "If using asdf, make sure to run: source ~/.zshrc (or ~/.bashrc)"
                exit 1
            fi
        else
            error "Node.js 22.21.1 is required. Please install it manually"
            error "Recommended: Install asdf from https://asdf-vm.com/guide/getting-started.html"
            error "Then run: asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git"
            error "And: asdf install nodejs 22.21.1 && asdf global nodejs 22.21.1"
            exit 1
        fi
    fi
    
    # Check/Install Wails2
    if ! check_wails; then
        # Check if wails exists but just not in PATH
        GOPATH_BIN=$(go env GOPATH)/bin
        if [ -f "$GOPATH_BIN/wails" ]; then
            warning "Wails2 is installed but not in PATH"
            echo ""
            read -p "Add GOPATH/bin to PATH? (y/n) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                SHELL_PROFILE_PATH=""
                if add_gopath_to_profile; then
                    export PATH="$PATH:$GOPATH_BIN"
                    success "GOPATH/bin added to PATH"
                    
                    # Source the profile to make it available immediately
                    if [ -n "$SHELL_PROFILE_PATH" ] && [ -f "$SHELL_PROFILE_PATH" ]; then
                        info "Sourcing $SHELL_PROFILE_PATH to make Wails2 available in current session..."
                        source "$SHELL_PROFILE_PATH" 2>/dev/null || true
                        success "Wails2 is now available in this session"
                    fi
                fi
            fi
        else
            echo ""
            read -p "Wails2 CLI is not installed. Install it now? (y/n) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_wails
                
                # Verify installation
                if ! check_wails; then
                    warning "Wails2 installation completed, but may require adding GOPATH/bin to PATH"
                    warning "After adding to PATH, verify with: wails version"
                fi
            else
                warning "Skipping Wails2 installation. Install manually with:"
                echo "  go install github.com/wailsapp/wails/v2/cmd/wails@latest"
            fi
        fi
    fi
    
    # Install frontend dependencies
    echo ""
    read -p "Install frontend dependencies? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_frontend_deps
    else
        info "Skipping frontend dependency installation"
        info "Install manually with: cd pdf_wizard/frontend && npm install"
    fi
    
    # Summary
    echo ""
    echo "=========================================="
    echo "  Installation Summary"
    echo "=========================================="
    
    check_go || error "Go: Not installed"
    check_node || error "Node.js: Not installed"
    check_wails || warning "Wails2: Not installed or not in PATH"
    
    echo ""
    success "Installation complete!"
    echo ""
    info "Next steps:"
    echo "  1. cd pdf_wizard"
    echo "  2. wails dev"
    echo ""
}

# Run main function
main

