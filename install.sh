#!/bin/bash
set -euo pipefail

# Resonix-AG Installer for macOS and Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.sh | bash
#
# For Windows, use PowerShell:
#   iwr -useb https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.ps1 | iex

BOLD='\033[1m'
ACCENT='\033[38;2;139;92;246m'       # purple #8B5CF6
ACCENT_BRIGHT='\033[38;2;167;139;250m' # light purple #A78BFA
INFO='\033[38;2;196;181;253m'       # lavender #C4B5FD
SUCCESS='\033[38;2;47;201;113m'    # green #2FBF71
WARN='\033[38;2;255;176;32m'       # amber
ERROR='\033[38;2;226;61;100m'       # pink
MUTED='\033[38;2;139;127;119m'    # muted #8B7F77
NC='\033[0m'

print_banner() {
    echo ""
    echo -e "${ACCENT}  RRR    EEE    SSS   OOO   N   N   II   X   X ${NC}"
    echo -e "${ACCENT} R   R   E     S     O   O  NN  N    I    X X  ${NC}"
    echo -e "${ACCENT} RRRR    EEE    SS   O   O  N N N    I     X   ${NC}"
    echo -e "${ACCENT} R   R   E       S   O   O  N  NN    I    X X  ${NC}"
    echo -e "${ACCENT} R   R   EEE   SSS    OOO   N   N   II   X   X ${NC}"
    echo -e "${ACCENT}                                                 ${NC}"
    echo ""
    echo -e "${BOLD}  Resonix-AG Installer${NC} v1.2.7"
    echo ""
    echo -e "${INFO}Autonomous AI Agent with Self-Cognition${NC}"
    echo ""
    echo -e "${MUTED}Windows installer: iwr -useb https://.../install.ps1 | iex${NC}"
    echo ""
}

ui_error() {
    echo -e "${ERROR}Error: $1${NC}" >&2
    exit 1
}

ui_info() {
    echo -e "${INFO}$1${NC}"
}

ui_warn() {
    echo -e "${WARN}$1${NC}"
}

ui_success() {
    echo -e "${SUCCESS}$1${NC}"
}

run_quiet_step() {
    local msg="$1"
    shift
    echo -e "${INFO}→ ${msg}...${NC}"
    "$@" 2>/dev/null || ui_warn "${msg} failed, continuing"
}

detect_os() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*) echo "linux" ;;
        *) ui_error "Unsupported OS: $(uname -s)" ;;
    esac
}

check_requirements() {
    local os
    os=$(detect_os)
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        ui_error "Node.js not found. Please install Node.js 22+ first: https://nodejs.org"
    fi
    
    local node_version
    node_version=$(node -v | sed 's/v//' | cut -d. -f1)
    if [[ "$node_version" -lt 22 ]]; then
        ui_warn "Node.js 22+ recommended. Current: $(node -v)"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        ui_error "npm not found. Please install Node.js with npm"
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        if [[ "$os" == "macos" ]]; then
            run_quiet_step "Installing Git" brew install git
        else
            ui_error "Git not found. Please install git"
        fi
    fi
    
    ui_success "Requirements OK"
}

install_pnpm() {
    if command -v pnpm &> /dev/null; then
        return 0
    fi
    
    ui_info "Installing pnpm..."
    npm install -g pnpm@10
    
    if command -v pnpm &> /dev/null; then
        ui_success "pnpm ready"
    else
        ui_error "pnpm installation failed"
    fi
}

install_resonix() {
    local install_dir="$HOME/.resonix"
    
    print_banner
    
    ui_info "Checking requirements..."
    check_requirements
    
    ui_info "Installing pnpm..."
    install_pnpm
    
    ui_info "Cloning Resonix-AG from GitHub..."
    
    if [[ -d "$install_dir" ]]; then
        rm -rf "$install_dir"
    fi
    
    git clone --depth 1 https://github.com/mangiapanejohn-dev/Resonix-AG.git "$install_dir"
    
    cd "$install_dir"
    
    ui_info "Installing dependencies..."
    pnpm install
    
    ui_info "Building Resonix-AG..."
    pnpm build
    
    # Create wrapper script
    mkdir -p "$HOME/.local/bin"
    
    cat > "$HOME/.local/bin/resonix" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exec node "$HOME/.resonix/resonix.mjs" "$@"
EOF
    chmod +x "$HOME/.local/bin/resonix"
    
    # Add to PATH if needed
    if ! grep -q ".local/bin" "$HOME/.zshrc" 2>/dev/null; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
    fi
    
    export PATH="$HOME/.local/bin:$PATH"
    
    echo ""
    ui_success "👾 Resonix-AG installed successfully!"
    echo ""
    echo -e "${BOLD}Next steps:${NC}"
    echo ""
    echo -e "  ${ACCENT}1.${NC} Restart terminal or run: source ~/.zshrc"
    echo -e "  ${ACCENT}2.${NC} Run onboarding: ${BOLD}resonix onboard${NC}"
    echo -e "  ${ACCENT}3.${NC} Start gateway: ${BOLD}resonix gateway start${NC}"
    echo ""
    echo -e "${MUTED}Join community:${NC} ${INFO}https://discord.gg/FKXPBAtPwG${NC}"
    echo -e "${MUTED}Follow updates:${NC} ${INFO}https://x.com/moralesjavx1032${NC}"
    echo ""
}

install_resonix "$@"
