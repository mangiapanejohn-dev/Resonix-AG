#!/usr/bin/env bash
set -euo pipefail

# Resonix-AG installer for macOS/Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.sh | bash
# Updated: 2026-03-04 (Resonix style + stability refresh)

REPO_URL="${RESONIX_REPO_URL:-https://github.com/mangiapanejohn-dev/Resonix-AG.git}"
INSTALL_ROOT="${RESONIX_INSTALL_ROOT:-$HOME/.resonix-ag}"
SOURCE_DIR="${RESONIX_SOURCE_DIR:-$INSTALL_ROOT/source}"
BIN_DIR="${RESONIX_BIN_DIR:-$HOME/.local/bin}"
PNPM_VERSION="${RESONIX_PNPM_VERSION:-10.23.0}"
SKIP_PATH_SETUP="${RESONIX_INSTALL_SKIP_PATH:-0}"

BOLD='\033[1m'
ACCENT='\033[38;2;147;51;255m'
INFO='\033[38;2;210;130;255m'
SUCCESS='\033[38;2;47;201;113m'
WARN='\033[38;2;255;176;32m'
ERROR='\033[38;2;226;61;100m'
MUTED='\033[38;2;139;127;119m'
NC='\033[0m'

PM_KIND=""
PM_CMD=()

print_banner() {
    echo ""
    echo -e "${ACCENT} RRRR    EEEE   SSS   OOO   N   N   III  X   X ${NC}"
    echo -e "${ACCENT} R   R   E     S     O   O  NN  N    I    X X  ${NC}"
    echo -e "${ACCENT} RRRR    EEE    SS   O   O  N N N    I     X   ${NC}"
    echo -e "${ACCENT} R   R   E        S  O   O  N  NN    I    X X  ${NC}"
    echo -e "${ACCENT} R   R   EEEE  SSS    OOO   N   N   III  X   X ${NC}"
    echo ""
    echo -e "${BOLD}👾 Resonix Installer (macOS/Linux)${NC}"
    echo -e "${MUTED}Source: ${SOURCE_DIR}${NC}"
    echo -e "${MUTED}Binary: ${BIN_DIR}/resonix${NC}"
    echo -e "${MUTED}State directory: ~/.resonix${NC}"
    echo ""
    echo -e "${INFO}Hey bro, Resonix is warming up the engines...${NC}"
    echo ""
}

ui_error() {
    echo -e "${ERROR}[ERROR] $1${NC}" >&2
    exit 1
}

ui_info() {
    echo -e "${INFO}[INFO] $1${NC}"
}

ui_warn() {
    echo -e "${WARN}[WARN] $1${NC}"
}

ui_success() {
    echo -e "${SUCCESS}[OK] $1${NC}"
}

detect_os() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*) echo "linux" ;;
        *) ui_error "Unsupported OS: $(uname -s)" ;;
    esac
}

check_requirements() {
    detect_os >/dev/null

    if ! command -v node >/dev/null 2>&1; then
        ui_error "Node.js not found. Install Node.js 22+ first: https://nodejs.org"
    fi

    local node_major
    node_major=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0")
    if [[ "$node_major" -lt 22 ]]; then
        ui_error "Node.js 22+ is required. Current: $(node -v)"
    fi

    if ! command -v git >/dev/null 2>&1; then
        ui_error "Git is required. Install from https://git-scm.com"
    fi

    if ! command -v npm >/dev/null 2>&1; then
        ui_error "npm is required. Reinstall Node.js with npm included."
    fi

    ui_success "Requirements checked (Node $(node -v))"
}

setup_package_manager() {
    if command -v pnpm >/dev/null 2>&1; then
        PM_KIND="pnpm"
        PM_CMD=(pnpm)
        ui_success "Using pnpm ($(pnpm --version))"
        return
    fi

    if command -v corepack >/dev/null 2>&1; then
        ui_info "pnpm not found, trying corepack (quick coffee break)."
        if corepack enable >/dev/null 2>&1 && corepack prepare "pnpm@${PNPM_VERSION}" --activate >/dev/null 2>&1; then
            PM_KIND="pnpm"
            if command -v pnpm >/dev/null 2>&1; then
                PM_CMD=(pnpm)
            else
                PM_CMD=(corepack pnpm)
            fi
            ui_success "pnpm enabled via corepack"
            return
        fi
        ui_warn "corepack setup failed; falling back strategy in progress."
    fi

    ui_warn "pnpm unavailable; using npm. Resonix can still cook."
    PM_KIND="npm"
    PM_CMD=(npm)
}

backup_path() {
    local path="$1"
    local stamp
    stamp=$(date +%Y%m%d%H%M%S)
    local backup="${path}.backup.${stamp}"
    mv "$path" "$backup"
    ui_warn "Preserved existing path as: ${backup}"
}

clone_fresh() {
    if [[ -e "$SOURCE_DIR" ]]; then
        backup_path "$SOURCE_DIR"
    fi
    git clone --depth 1 "$REPO_URL" "$SOURCE_DIR"
}

install_or_update_source() {
    mkdir -p "$(dirname "$SOURCE_DIR")"

    if [[ -d "$SOURCE_DIR/.git" ]]; then
        local dirty
        dirty=$(git -C "$SOURCE_DIR" status --porcelain 2>/dev/null || true)
        if [[ -n "$dirty" ]]; then
            ui_warn "Local changes found in ${SOURCE_DIR}; cloning a fresh copy to keep your edits safe."
            clone_fresh
            return
        fi

        ui_info "Updating existing Resonix checkout..."
        git -C "$SOURCE_DIR" remote set-url origin "$REPO_URL" >/dev/null 2>&1 || true
        if git -C "$SOURCE_DIR" fetch --depth 1 origin main >/dev/null 2>&1; then
            git -C "$SOURCE_DIR" checkout -q main >/dev/null 2>&1 || true
            git -C "$SOURCE_DIR" reset --hard origin/main >/dev/null 2>&1
            ui_success "Source updated"
        else
            ui_warn "Git update failed; recloning from scratch."
            clone_fresh
        fi
        return
    fi

    if [[ -e "$SOURCE_DIR" ]]; then
        ui_warn "Existing non-git path at ${SOURCE_DIR}; preserving and recloning."
    fi

    ui_info "Cloning Resonix source..."
    clone_fresh
    ui_success "Source cloned"
}

run_install() {
    cd "$SOURCE_DIR"

    if [[ "$PM_KIND" == "pnpm" ]]; then
        ui_info "Installing dependencies with pnpm (Resonix is stocking the fridge)."
        if ! "${PM_CMD[@]}" install --frozen-lockfile; then
            ui_warn "Frozen lockfile install failed; retrying with relaxed mode."
            "${PM_CMD[@]}" install
        fi
        ui_success "Dependencies installed"
        return
    fi

    ui_info "Installing dependencies with npm"
    npm install
    ui_success "Dependencies installed"
}

run_build() {
    cd "$SOURCE_DIR"
    ui_info "Building Resonix CLI and runtime..."

    if [[ "$PM_KIND" == "pnpm" ]]; then
        "${PM_CMD[@]}" build
    else
        npm run build
    fi

    ui_success "Build completed"
}

install_launcher() {
    mkdir -p "$BIN_DIR"

    cat >"$BIN_DIR/resonix" <<WRAPPER
#!/usr/bin/env bash
set -euo pipefail
SOURCE_DIR="\${RESONIX_SOURCE_DIR:-$SOURCE_DIR}"
ENTRY="\$SOURCE_DIR/resonix.mjs"

if [[ ! -f "\$ENTRY" ]]; then
  echo "[resonix] CLI entry not found at \$ENTRY" >&2
  echo "[resonix] Re-run installer: curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.sh | bash" >&2
  exit 1
fi

exec node "\$ENTRY" "\$@"
WRAPPER

    chmod +x "$BIN_DIR/resonix"
    ui_success "Launcher installed at ${BIN_DIR}/resonix"
}

ensure_path() {
    local path_line
    path_line="export PATH=\"$BIN_DIR:\$PATH\""

    local touched=0
    local profile
    for profile in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
        if [[ -f "$profile" ]]; then
            if ! grep -Fqs "$path_line" "$profile"; then
                printf '\n%s\n' "$path_line" >>"$profile"
                touched=1
            fi
        fi
    done

    if [[ "$touched" -eq 0 ]]; then
        local default_profile="$HOME/.profile"
        case "$(basename "${SHELL:-}")" in
            zsh) default_profile="$HOME/.zshrc" ;;
            bash) default_profile="$HOME/.bashrc" ;;
        esac
        touch "$default_profile"
        if ! grep -Fqs "$path_line" "$default_profile"; then
            printf '\n%s\n' "$path_line" >>"$default_profile"
        fi
    fi

    if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
        export PATH="$BIN_DIR:$PATH"
    fi

    ui_success "PATH updated for current and future shells"
}

print_success() {
    echo ""
    ui_success "Resonix installed successfully. Your digital roommate just moved in."
    echo ""
    echo -e "${BOLD}Next steps${NC}"
    echo "  1) Verify: resonix -v"
    echo "  2) Onboard: resonix onboard"
    echo "  3) Start gateway: resonix gateway start"
    echo ""
    echo -e "${MUTED}If 'resonix' is not found yet, open a new terminal session.${NC}"
}

main() {
    print_banner
    check_requirements
    setup_package_manager
    install_or_update_source
    run_install
    run_build
    install_launcher

    if [[ "$SKIP_PATH_SETUP" == "1" ]]; then
        ui_warn "Skipping PATH/profile updates (RESONIX_INSTALL_SKIP_PATH=1)"
    else
        ensure_path
    fi

    print_success
}

main "$@"
