#!/usr/bin/env bash
set -euo pipefail

# Resonix-AG installer for macOS/Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/mangiapanejohn-dev/Resonix-AG/main/install.sh | bash
# Republished: 2026-03-04 (no behavior change)

REPO_URL="${RESONIX_REPO_URL:-https://github.com/mangiapanejohn-dev/Resonix-AG.git}"
INSTALL_ROOT="${RESONIX_INSTALL_ROOT:-$HOME/.resonix-ag}"
SOURCE_DIR="${RESONIX_SOURCE_DIR:-$INSTALL_ROOT/source}"
BIN_DIR="${RESONIX_BIN_DIR:-$HOME/.local/bin}"
PNPM_VERSION="${RESONIX_PNPM_VERSION:-10.23.0}"
SKIP_PATH_SETUP="${RESONIX_INSTALL_SKIP_PATH:-0}"

# === 修改颜色为紫色系 ===
BOLD='\033[1m'
ACCENT='\033[38;2;147;51;255m'    # 高亮紫色 (用于Emoji和旋转圈)
INFO='\033[38;2;210;130;255m'     # 浅紫色 (用于文字)
SUCCESS='\033[38;2;47;201;113m'
WARN='\033[38;2;255;176;32m'
ERROR='\033[38;2;226;61;100m'
MUTED='\033[38;2;139;127;119m'
NC='\033[0m'

# 全局变量用于控制动画
SPINNER_PID=""

print_banner() {
    echo ""
    echo -e "${ACCENT} RRRR    EEEE   SSS   OOO   N   N   III  X   X ${NC}"
    echo -e "${ACCENT} R   R   E     S     O   O  NN  N    I    X X  ${NC}"
    echo -e "${ACCENT} RRRR    EEE    SS   O   O  N N N    I     X   ${NC}"
    echo -e "${ACCENT} R   R   E        S  O   O  N  NN    I    X X  ${NC}"
    echo -e "${ACCENT} R   R   EEEE  SSS    OOO   N   N   III  X   X ${NC}"
    echo ""
    echo -e "${BOLD}Resonix-AG Installer${NC}"
    echo -e "${MUTED}Source: ${SOURCE_DIR}${NC}"
    echo -e "${MUTED}Binary: ${BIN_DIR}/resonix${NC}"
    echo -e "${MUTED}Runtime state remains in ~/.resonix${NC}"
    echo ""
}

ui_error() {
    # 确保动画停止后再打印错误
    kill_spinner
    echo -e "${ERROR}Error: $1${NC}" >&2
    exit 1
}

ui_info() {
    kill_spinner
    echo -e "${INFO}$1${NC}"
}

ui_warn() {
    kill_spinner
    echo -e "${WARN}$1${NC}"
}

ui_success() {
    kill_spinner
    echo -e "${SUCCESS}$1${NC}"
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

    ui_success "Requirements OK (Node $(node -v))"
}

setup_package_manager() {
    if command -v pnpm >/dev/null 2>&1; then
        PM_KIND="pnpm"
        PM_CMD=(pnpm)
        ui_success "Using pnpm ($(pnpm --version))"
        return
    fi

    if command -v corepack >/dev/null 2>&1; then
        ui_info "pnpm not found, enabling via corepack..."
        if corepack enable >/dev/null 2>&1 && corepack prepare "pnpm@${PNPM_VERSION}" --activate >/dev/null 2>&1; then
            PM_KIND="pnpm"
            if command -v pnpm >/dev/null 2>&1; then
                PM_CMD=(pnpm)
            else
                PM_CMD=(corepack pnpm)
            fi
            ui_success "Using pnpm via corepack"
            return
        fi
    fi

    ui_warn "pnpm unavailable, falling back to npm"
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
    git clone --depth 1 "$REPO_URL" "$SOURCE_DIR" >/dev/null
}

install_or_update_source() {
    mkdir -p "$(dirname "$SOURCE_DIR")"

    if [[ -d "$SOURCE_DIR/.git" ]]; then
        local dirty
        dirty=$(git -C "$SOURCE_DIR" status --porcelain 2>/dev/null || true)
        if [[ -n "$dirty" ]]; then
            ui_warn "Local changes detected in ${SOURCE_DIR}; preserving checkout and cloning fresh."
            clone_fresh
            return
        fi

        ui_info "Updating existing checkout..."
        git -C "$SOURCE_DIR" remote set-url origin "$REPO_URL" >/dev/null 2>&1 || true
        if git -C "$SOURCE_DIR" fetch --depth 1 origin main >/dev/null 2>&1; then
            git -C "$SOURCE_DIR" checkout -q main >/dev/null 2>&1 || true
            git -C "$SOURCE_DIR" reset --hard origin/main >/dev/null 2>&1
        else
            ui_warn "Git update failed; recloning source."
            clone_fresh
        fi
        return
    fi

    if [[ -e "$SOURCE_DIR" ]]; then
        ui_warn "Existing non-git path at ${SOURCE_DIR}; preserving and cloning fresh."
    fi

    ui_info "Cloning Resonix-AG source..."
    clone_fresh
}

# === END OF PART 1 ===
# === 核心动画与安装逻辑 ===

# 启动动画
start_spinner() {
    _spinner "👾" "Resonix 正在赶到你家的路上..." "预计几分钟到达？" &
    SPINNER_PID=$!
}

# 停止动画
kill_spinner() {
    if [[ -n "${SPINNER_PID:-}" ]] && kill $SPINNER_PID 2>/dev/null; then
        wait $SPINNER_PID 2>/dev/null || true
        # 清理动画留下的行
        printf "\r\033[K\033[A\033[K"
        echo ""
        SPINNER_PID=""
    fi
}

# 旋转动画函数 (原地覆盖模式)
_spinner() {
    local emoji="$1"
    local line1="$2"
    local line2="$3"
    
    # 这是一个平滑旋转的圆圈字符集
    local spin='◐◓◑◒'
    local i=0

    while true; do
        # \r 回到行首, \033[K 清除行尾
        
        # 第一行：Emoji + 旋转圆圈 + 文字
        printf "\r\033[K"
        printf " ${ACCENT}%s %s${NC} %s" "$emoji" "${spin:$i:1}" "$line1"
        
        # 第二行：提示语
        printf "\r\033[K"
        printf "   ${MUTED}%s${NC}" "$line2"
        
        i=$(( (i + 1) % ${#spin} ))
        sleep 0.1
    done
}

# 修改后的安装函数
run_install() {
    cd "$SOURCE_DIR"
    
    if [[ "$PM_KIND" == "pnpm" ]]; then
        start_spinner
        
        if ! setsid "${PM_CMD[@]}" install --frozen-lockfile > /tmp/resonix_install.log 2>&1; then
            "${PM_CMD[@]}" install > /tmp/resonix_install.log 2>&1
        fi
        
        kill_spinner
        echo ""
        ui_success "Dependencies installed."
    else
        npm install
    fi
}

run_build() {
    cd "$SOURCE_DIR"
    if [[ "$PM_KIND" == "pnpm" ]]; then
        "${PM_CMD[@]}" build
    else
        npm run build
    fi
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
    ui_success "Installed launcher: ${BIN_DIR}/resonix"
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
}

print_success() {
    echo ""
    ui_success "Resonix-AG installed successfully."
    echo ""
    echo -e "${BOLD}Next steps${NC}"
    echo "  1) Verify command: resonix -v"
    echo "  2) Run onboarding: resonix onboard"
    echo "  3) Start gateway: resonix gateway start"
    echo ""
    echo -e "${MUTED}If 'resonix' is not found, open a new terminal session.${NC}"
}

main() {
    print_banner
    check_requirements
    setup_package_manager
    install_or_update_source
    run_install
    ui_info "Building Resonix-AG..."
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
