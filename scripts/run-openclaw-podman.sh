#!/usr/bin/env bash
# Backward-compat wrapper. Prefer: scripts/run-resonix-podman.sh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/run-resonix-podman.sh" "$@"
