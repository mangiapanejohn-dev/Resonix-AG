#!/bin/bash
set -euo pipefail

# Resonix-AG Installer for macOS and Linux
# Usage: curl -fsSL --proto '=https' --tlsv1.2 https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.sh | bash

BOLD='\033[1m'
PURPLE='\033[38;2;139;92;246m'
LIGHT_PURPLE='\033[38;2;167;139;250m'
LAVENDER='\033[38;2;196;181;253m'
GREEN='\033[38;2;47;201;113m'
AMBER='\033[38;2;255;176;32m'
PINK='\033[38;2;226;61;100m'
MUTED='\033[38;2;139;127;119m'
NC='\033[0m'

print_banner() {
    echo ""
    echo -e "${PURPLE}██████╗  ██████╗  ██████╗  ███████╗${NC}"
    echo -e "${PURPLE}██╔══██╗██╔════╝ ██╔══██╗ ██╔════╝${NC}"
    echo -e "${PURPLE}██████╔╝██║  ███╗██████╔╝ ███████╗${NC}"
    echo -e "${PURPLE}██╔══██╗██║   ██║██╔══██╗ ╚════██║${NC}"
    echo -e "${PURPLE}██║  ██║╚██████╔╝██║  ██║███████║${NC}"
    echo -e "${PURPLE}╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝${NC}"
    echo ""
    echo -e "${BOLD}  Resonix-AG Installer${NC} v2026.2.20"
    echo ""
}

ui_error() {
    echo -e "${PINK}Error: $1${NC}" >&2
    exit 1
}

ui_info() {
    echo -e "${LAVENDER}$1${NC}"
}

ui_success() {
    echo -e "${GREEN}$1${NC}"
}

check_minimum_requirements() {
    local node_version
    node_version=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1) || true
    
    if [[ -z "$node_version" ]]; then
        ui_error "Node.js not found. Please install Node.js 22+ first: https://nodejs.org"
    fi
    
    if [[ "$node_version" -lt 22 ]]; then
        ui_info "Warning: Node.js 22+ recommended. Current: $(node -v)"
    fi
    
    if ! command -v npm &> /dev/null; then
        ui_error "npm not found. Please install Node.js with npm: https://nodejs.org"
    fi
}

install_from_github() {
    local install_dir="$HOME/.resonix-ag"
    
    ui_info "Cloning Resonix-AG from GitHub..."
    
    if [[ -d "$install_dir" ]]; then
        rm -rf "$install_dir"
    fi
    
    git clone --depth 1 https://github.com/mangiapanejohn-dev/Resonix-AG.git "$install_dir"
    
    cd "$install_dir"
    
    ui_info "Installing dependencies..."
    pnpm install 2>/dev/null || npm install
    
    ui_info "Building..."
    pnpm build 2>/dev/null || npm run build
    
    ui_info "Creating CLI symlink..."
    mkdir -p "$HOME/.local/bin"
    ln -sf "$install_dir/dist/entry.mjs" "$HOME/.local/bin/resonix-ag"
    
    # Add to PATH if not already
    if ! grep -q ".local/bin" "$HOME/.zshrc" 2>/dev/null; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
    fi
    
    export PATH="$HOME/.local/bin:$PATH"
    
    ui_success "✓ Resonix-AG installed successfully!"
    echo ""
    echo -e "${BOLD}👾 Next steps:${NC}"
    echo ""
    echo -e "  ${LIGHT_PURPLE}1.${NC} Run onboarding:"
    echo -e "     ${BOLD}resonix-ag onboard${NC}"
    echo ""
    echo -e "  ${LIGHT_PURPLE}2.${NC} Start gateway:"
    echo -e "     ${BOLD}resonix-ag gateway start${NC}"
    echo ""
    echo -e "  ${LIGHT_PURPLE}3.${NC} Get help:"
    echo -e "     ${BOLD}resonix-ag --help${NC}"
    echo ""
    echo -e "${MUTED}Join community:${NC} ${LAVENDER}https://discord.gg/FKXPBAtPwG${NC}"
    echo -e "${MUTED}Follow updates:${NC} ${LAVENDER}https://x.com/moralesjavx1032${NC}"
    echo ""
}

main() {
    print_banner
    
    ui_info "Checking requirements..."
    check_minimum_requirements
    
    ui_info "Installing Resonix-AG..."
    install_from_github
}

main "$@"
