#!/bin/bash
set -euo pipefail

# Resonix-AG Installer for macOS and Linux
# Usage: curl -fsSL --proto '=https' --tlsv1.2 https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.sh | bash

BOLD='\033[1m'
ACCENT='\033[38;2;139;92;246m'      # purple #8B5CF6
ACCENT_BRIGHT='\033[38;2;167;139;250m' # light purple #A78BFA
INFO='\033[38;2;196;181;253m'       # lavender #C4B5FD
SUCCESS='\033[38;2;47;201;113m'    # green #2FBF71
WARN='\033[38;2;255;176;32m'       # amber
ERROR='\033[38;2;226;61;100m'       # pink
MUTED='\033[38;2;139;127;119m'    # muted #8B7F77
NC='\033[0m' # No Color

DEFAULT_TAGLINE="Autonomous AI Agent with Self-Cognition"

ORIGINAL_PATH="${PATH:-}"

TMPFILES=()
cleanup_tmpfiles() {
    local f
    for f in "${TMPFILES[@]:-}"; do
        rm -rf "$f" 2>/dev/null || true
    done
}
trap cleanup_tmpfiles EXIT

mktempfile() {
    local f
    f="$(mktemp)"
    TMPFILES+=("$f")
    echo "$f"
}

DOWNLOADER=""
detect_downloader() {
    if command -v curl &> /dev/null; then
        DOWNLOADER="curl"
        return 0
    fi
    if command -v wget &> /dev/null; then
        DOWNLOADER="wget"
        return 0
    fi
    ui_error "Missing downloader (curl or wget required)"
    exit 1
}

download() {
    if [[ "$DOWNLOADER" == "curl" ]]; then
        curl -fsSL --proto '=https' --tlsv1.2 -o "$1" "$2"
    else
        wget -q -O "$1" "$2"
    fi
}

ui_header() {
    echo ""
    echo -e "${BOLD}${ACCENT}██████╗ ███████╗███████╗ ██████╗ ███╗ ██╗██╗██╗ ██╗ ██╔══██╗${NC}"
    echo -e "${BOLD}${ACCENT}██████╗ ███████╗███████╗█████╗  ████╗ ██║██║╚██╗██║${NC}"
    echo -e "${BOLD}${ACCENT}██╔══██╗██╔════╝██╔════╝██╔══██╗██╔██╗ ██║██║ ╚████║${NC}"
    echo -e "${BOLD}${ACCENT}██║  ██║█████╗  █████╗  ██████╔╝██║╚██╗██║██║  ╚██╔╝${NC}"
    echo -e "${BOLD}${ACCENT}██║  ██║██╔══╝  ██╔══╝  ██╔══██╗██║ ╚████║██║   ██║${NC}"
    echo -e "${BOLD}${ACCENT}██████╔╝███████╗███████╗██║  ██║██║  ╚═══╝╚═╝   ╚═╝${NC}"
    echo -e "${BOLD}${ACCENT}╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝       ${NC}"
    echo ""
    echo -e "${BOLD}  Resonix-AG Installer${NC} $1"
    echo ""
}

ui_error() {
    echo -e "${ERROR}Error: $1${NC}" >&2
    exit 1
}

ui_info() {
    echo -e "${INFO}$1${NC}"
}

ui_success() {
    echo -e "${SUCCESS}$1${NC}"
}

ui_warn() {
    echo -e "${WARN}Warning: $1${NC}"
}

check_minimum_requirements() {
    local node_version
    node_version=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1) || true
    
    if [[ -z "$node_version" ]]; then
        ui_error "Node.js not found. Please install Node.js 22+ first: https://nodejs.org"
    fi
    
    if [[ "$node_version" -lt 22 ]]; then
        ui_warn "Node.js 22+ recommended. Current: $(node -v)"
    fi
    
    if ! command -v npm &> /dev/null; then
        ui_error "npm not found. Please install Node.js with npm: https://nodejs.org"
    fi
}

install_resonix() {
    ui_header "v2026.2.20"
    
    ui_info "Checking requirements..."
    check_minimum_requirements
    
    ui_info "Installing Resonix-AG globally..."
    if npm install -g resonix@latest 2>&1; then
        ui_success "✓ Resonix-AG installed successfully!"
    else
        ui_error "Failed to install Resonix-AG"
    fi
    
    echo ""
    echo -e "${BOLD}👾 Next steps:${NC}"
    echo ""
    echo -e "  ${ACCENT}1.${NC} Run onboarding:"
    echo -e "     ${ACCENT_BRIGHT}resonix onboard${NC}"
    echo ""
    echo -e "  ${ACCENT}2.${NC} Start gateway:"
    echo -e "     ${ACCENT_BRIGHT}resonix gateway start${NC}"
    echo ""
    echo -e "  ${ACCENT}3.${NC} Get help:"
    echo -e "     ${ACCENT_BRIGHT}resonix --help${NC}"
    echo ""
    echo -e "${MUTED}Join community:${NC} ${INFO}https://discord.gg/FKXPBAtPwG${NC}"
    echo -e "${MUTED}Follow updates:${NC} ${INFO}https://x.com/moralesjavx1032${NC}"
    echo ""
}

main() {
    detect_downloader
    install_resonix
}

main "$@"
