#!/usr/bin/env bash
set -euo pipefail
exec node "$(dirname "$0")/dist/index.mjs" "$@"
