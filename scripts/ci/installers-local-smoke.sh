#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TMP_HOME="$(mktemp -d)"
TMP_ROOT="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_HOME" "$TMP_ROOT"
}
trap cleanup EXIT

export HOME="$TMP_HOME"
export RESONIX_REPO_URL="${RESONIX_REPO_URL:-$ROOT_DIR}"
export RESONIX_INSTALL_ROOT="${RESONIX_INSTALL_ROOT:-$TMP_ROOT/resonix-install}"
export RESONIX_SOURCE_DIR="${RESONIX_SOURCE_DIR:-$RESONIX_INSTALL_ROOT/source}"
export RESONIX_BIN_DIR="${RESONIX_BIN_DIR:-$TMP_ROOT/resonix-bin}"
export RESONIX_INSTALL_SKIP_PATH="1"

echo "==> First install"
bash "$ROOT_DIR/install.sh"
"$RESONIX_BIN_DIR/resonix" -v
"$RESONIX_BIN_DIR/resonix" --help >/dev/null

echo "==> Second install (upgrade path)"
bash "$ROOT_DIR/install.sh"
"$RESONIX_BIN_DIR/resonix" -v
"$RESONIX_BIN_DIR/resonix" --help >/dev/null

echo "==> Installer smoke passed"
