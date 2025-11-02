#!/bin/bash

# PDF Wizard Installation Script
# This script installs all necessary dependencies for PDF Wizard development

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
    
    if command_exists node; then
        NODE_VERSION=$(node --version | sed 's/v//')
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1)
        
        if [ "$NODE_MAJOR" -ge 16 ]; then
            success "Node.js $NODE_VERSION is installed"
            
            if command_exists npm; then
                NPM_VERSION=$(npm --version)
                success "npm $NPM_VERSION is installed"
                return 0
            else
                error "npm is not installed"
                return 1
            fi
        else
            error "Node.js version $NODE_VERSION found, but version 16+ is required"
            return 1
        fi
    else
        error "Node.js is not installed"
        return 1
    fi
}

# Install Node.js
install_node() {
    info "Installing Node.js..."
    
    OS=$(uname -s)
    
    if [ "$OS" = "Darwin" ]; then
        if command_exists brew; then
            info "Installing Node.js via Homebrew..."
            brew install node
            success "Node.js installed via Homebrew"
        else
            warning "Homebrew not found. Please install Node.js manually from https://nodejs.org/"
            warning "After installation, run this script again."
            exit 1
        fi
    elif [ "$OS" = "Linux" ]; then
        info "To install Node.js on Linux, please visit: https://nodejs.org/"
        warning "Or use your package manager or nvm: https://github.com/nvm-sh/nvm"
        exit 1
    else
        error "Unsupported OS: $OS"
        error "Please install Node.js manually from https://nodejs.org/"
        exit 1
    fi
}

# Check Wails installation
check_wails() {
    info "Checking Wails CLI installation..."
    
    if command_exists wails; then
        WAILS_VERSION=$(wails version 2>/dev/null | head -n1 || echo "unknown")
        success "Wails CLI is installed: $WAILS_VERSION"
        return 0
    else
        error "Wails CLI is not installed"
        return 1
    fi
}

# Add GOPATH/bin to shell profile
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
            return 0
        else
            info "GOPATH/bin already configured in $SHELL_PROFILE"
            return 0
        fi
    else
        warning "Could not detect shell profile file"
        return 1
    fi
}

# Install Wails
install_wails() {
    info "Installing Wails CLI..."
    
    # Ensure Go is in PATH
    if ! command_exists go; then
        error "Go is required to install Wails CLI"
        exit 1
    fi
    
    info "Installing Wails v2 CLI via go install..."
    go install github.com/wailsapp/wails/v2/cmd/wails@latest
    
    # Check if GOPATH/bin is in PATH
    GOPATH_BIN=$(go env GOPATH)/bin
    if [[ ":$PATH:" != *":$GOPATH_BIN:"* ]]; then
        info "Adding GOPATH/bin to your PATH..."
        
        # Add to shell profile
        if add_gopath_to_profile; then
            # Also add to current session
            export PATH="$PATH:$GOPATH_BIN"
            success "GOPATH/bin added to PATH"
            info "Note: You may need to restart your terminal or run: source ~/.zshrc (or ~/.bashrc)"
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
        success "Wails CLI installed: $WAILS_VERSION"
    else
        warning "Wails installation completed, but command not immediately available"
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
            
            # Reload shell environment
            if [ -f ~/.zshrc ]; then
                source ~/.zshrc 2>/dev/null || true
            elif [ -f ~/.bashrc ]; then
                source ~/.bashrc 2>/dev/null || true
            fi
            
            # Recheck
            if ! check_node; then
                error "Node.js installation verification failed. Please restart your terminal and run this script again."
                exit 1
            fi
        else
            error "Node.js is required. Please install it manually from https://nodejs.org/"
            exit 1
        fi
    fi
    
    # Check/Install Wails
    if ! check_wails; then
        # Check if wails exists but just not in PATH
        GOPATH_BIN=$(go env GOPATH)/bin
        if [ -f "$GOPATH_BIN/wails" ]; then
            warning "Wails is installed but not in PATH"
            echo ""
            read -p "Add GOPATH/bin to PATH? (y/n) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                if add_gopath_to_profile; then
                    export PATH="$PATH:$GOPATH_BIN"
                    success "GOPATH/bin added to PATH"
                    info "Please run: source ~/.zshrc (or restart your terminal)"
                fi
            fi
        else
            echo ""
            read -p "Wails CLI is not installed. Install it now? (y/n) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_wails
                
                # Verify installation
                if ! check_wails; then
                    warning "Wails installation completed, but may require adding GOPATH/bin to PATH"
                    warning "After adding to PATH, verify with: wails version"
                fi
            else
                warning "Skipping Wails installation. Install manually with:"
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
    check_wails || warning "Wails: Not installed or not in PATH"
    
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

