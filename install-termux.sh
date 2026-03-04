#!/usr/bin/env bash
set -euo pipefail

# Resonix-AG installer for Termux (Android)
# Usage: curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install-termux.sh | bash
# Updated: 2026-03-04

REPO_URL="${RESONIX_REPO_URL:-https://github.com/mangiapanejohn-dev/Resonix-AG.git}"
INSTALL_ROOT="${RESONIX_INSTALL_ROOT:-$HOME/.resonix-ag}"
SOURCE_DIR="${RESONIX_SOURCE_DIR:-$INSTALL_ROOT/source}"
BIN_DIR="${RESONIX_BIN_DIR:-${PREFIX:-$HOME/.local}/bin}"
PNPM_VERSION="${RESONIX_PNPM_VERSION:-10.23.0}"

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

print_banner() {
  echo ""
  echo -e "${ACCENT} RRRR    EEEE   SSS   OOO   N   N   III  X   X ${NC}"
  echo -e "${ACCENT} R   R   E     S     O   O  NN  N    I    X X  ${NC}"
  echo -e "${ACCENT} RRRR    EEE    SS   O   O  N N N    I     X   ${NC}"
  echo -e "${ACCENT} R   R   E        S  O   O  N  NN    I    X X  ${NC}"
  echo -e "${ACCENT} R   R   EEEE  SSS    OOO   N   N   III  X   X ${NC}"
  echo ""
  echo -e "${BOLD}👾 Resonix Installer (Termux)${NC}"
  echo -e "${MUTED}Source: ${SOURCE_DIR}${NC}"
  echo -e "${MUTED}Binary: ${BIN_DIR}/resonix${NC}"
  echo -e "${MUTED}State directory: ~/.resonix${NC}"
  echo ""
  echo -e "${INFO}Resonix says hi from Android. Let's make this shell cozy.${NC}"
  echo ""
}

check_termux() {
  if ! command -v pkg >/dev/null 2>&1; then
    ui_error "This script is for Termux only (pkg command missing)."
  fi

  if [[ "${PREFIX:-}" != *"com.termux"* ]]; then
    ui_warn "PREFIX does not look like Termux. Continuing because pkg exists."
  fi
}

install_termux_packages() {
  ui_info "Updating Termux package index..."
  pkg update -y >/dev/null

  ui_info "Installing base packages (git, nodejs-lts, openssh)..."
  pkg install -y git nodejs-lts openssh >/dev/null

  if ! command -v node >/dev/null 2>&1; then
    ui_error "Node.js installation failed in Termux."
  fi

  local node_major
  node_major=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0")
  if [[ "$node_major" -lt 22 ]]; then
    ui_warn "Detected Node $(node -v). Resonix prefers Node 22+ for full compatibility."
  fi

  ui_success "Termux packages ready"
}

setup_package_manager() {
  if command -v pnpm >/dev/null 2>&1; then
    PM_KIND="pnpm"
    PM_CMD=(pnpm)
    ui_success "Using pnpm ($(pnpm --version))"
    return
  fi

  if command -v corepack >/dev/null 2>&1; then
    ui_info "pnpm not found, trying corepack."
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
    ui_warn "corepack setup failed; trying npm global install."
  fi

  if npm install -g "pnpm@${PNPM_VERSION}" >/dev/null 2>&1 && command -v pnpm >/dev/null 2>&1; then
    PM_KIND="pnpm"
    PM_CMD=(pnpm)
    ui_success "Using pnpm after npm global install"
    return
  fi

  PM_KIND="npm"
  PM_CMD=(npm)
  ui_warn "pnpm unavailable; using npm fallback."
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
  mkdir -p "$(dirname "$SOURCE_DIR")"
  git clone --depth 1 "$REPO_URL" "$SOURCE_DIR" >/dev/null
}

install_or_update_source() {
  if [[ -d "$SOURCE_DIR/.git" ]]; then
    local dirty
    dirty=$(git -C "$SOURCE_DIR" status --porcelain 2>/dev/null || true)
    if [[ -n "$dirty" ]]; then
      ui_warn "Local changes found in ${SOURCE_DIR}; cloning fresh copy."
      clone_fresh
      return
    fi

    ui_info "Updating existing checkout..."
    git -C "$SOURCE_DIR" remote set-url origin "$REPO_URL" >/dev/null 2>&1 || true
    if git -C "$SOURCE_DIR" fetch --depth 1 origin main >/dev/null 2>&1; then
      git -C "$SOURCE_DIR" checkout -q main >/dev/null 2>&1 || true
      git -C "$SOURCE_DIR" reset --hard origin/main >/dev/null 2>&1
      ui_success "Source updated"
    else
      ui_warn "Update failed; recloning fresh copy."
      clone_fresh
    fi
    return
  fi

  if [[ -e "$SOURCE_DIR" ]]; then
    ui_warn "Existing non-git path found; preserving and recloning."
  fi

  ui_info "Cloning Resonix source..."
  clone_fresh
  ui_success "Source cloned"
}

run_install() {
  cd "$SOURCE_DIR"

  if [[ "$PM_KIND" == "pnpm" ]]; then
    ui_info "Installing dependencies (Resonix is unpacking its backpack)."
    if ! "${PM_CMD[@]}" install --frozen-lockfile; then
      ui_warn "Frozen lockfile failed; retrying with relaxed mode."
      "${PM_CMD[@]}" install
    fi
    return
  fi

  npm install
}

run_build() {
  cd "$SOURCE_DIR"
  ui_info "Building Resonix..."

  if [[ "$PM_KIND" == "pnpm" ]]; then
    "${PM_CMD[@]}" build
  else
    npm run build
  fi
}

install_launcher() {
  mkdir -p "$BIN_DIR"

  cat >"$BIN_DIR/resonix" <<WRAPPER
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
SOURCE_DIR="\${RESONIX_SOURCE_DIR:-$SOURCE_DIR}"
ENTRY="\$SOURCE_DIR/resonix.mjs"

if [[ ! -f "\$ENTRY" ]]; then
  echo "[resonix] CLI entry not found at \$ENTRY" >&2
  echo "[resonix] Re-run installer: curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install-termux.sh | bash" >&2
  exit 1
fi

exec node "\$ENTRY" "\$@"
WRAPPER

  chmod +x "$BIN_DIR/resonix"
  ui_success "Launcher installed: ${BIN_DIR}/resonix"
}

ensure_shell_path() {
  local path_line
  path_line="export PATH=\"$BIN_DIR:\$PATH\""

  local profile="$HOME/.bashrc"
  touch "$profile"
  if ! grep -Fqs "$path_line" "$profile"; then
    printf '\n%s\n' "$path_line" >>"$profile"
  fi

  if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    export PATH="$BIN_DIR:$PATH"
  fi

  ui_success "PATH updated for Termux shell"
}

print_success() {
  echo ""
  ui_success "Resonix installed on Termux. Your mobile bro is online."
  echo ""
  echo -e "${BOLD}Next steps${NC}"
  echo "  1) Verify: resonix -v"
  echo "  2) Onboard: resonix onboard"
  echo "  3) Optional keep-alive: termux-wake-lock"
  echo ""
  echo -e "${MUTED}Open a new Termux session if command lookup has not refreshed yet.${NC}"
}

main() {
  print_banner
  check_termux
  install_termux_packages
  setup_package_manager
  install_or_update_source
  run_install
  run_build
  install_launcher
  ensure_shell_path
  print_success
}

main "$@"
