#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${RESONIX_IMAGE:-${RESONIXDBOT_IMAGE:-resonix:local}}"
CONFIG_DIR="${RESONIX_CONFIG_DIR:-${RESONIXDBOT_CONFIG_DIR:-$HOME/.resonix}}"
WORKSPACE_DIR="${RESONIX_WORKSPACE_DIR:-${RESONIXDBOT_WORKSPACE_DIR:-$HOME/.resonix/workspace}}"
PROFILE_FILE="${RESONIX_PROFILE_FILE:-${RESONIXDBOT_PROFILE_FILE:-$HOME/.profile}}"

PROFILE_MOUNT=()
if [[ -f "$PROFILE_FILE" ]]; then
  PROFILE_MOUNT=(-v "$PROFILE_FILE":/home/node/.profile:ro)
fi

echo "==> Build image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/Dockerfile" "$ROOT_DIR"

echo "==> Run gateway live model tests (profile keys)"
docker run --rm -t \
  --entrypoint bash \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e HOME=/home/node \
  -e NODE_OPTIONS=--disable-warning=ExperimentalWarning \
  -e RESONIX_LIVE_TEST=1 \
  -e RESONIX_LIVE_GATEWAY_MODELS="${RESONIX_LIVE_GATEWAY_MODELS:-${RESONIXDBOT_LIVE_GATEWAY_MODELS:-all}}" \
  -e RESONIX_LIVE_GATEWAY_PROVIDERS="${RESONIX_LIVE_GATEWAY_PROVIDERS:-${RESONIXDBOT_LIVE_GATEWAY_PROVIDERS:-}}" \
  -e RESONIX_LIVE_GATEWAY_MODEL_TIMEOUT_MS="${RESONIX_LIVE_GATEWAY_MODEL_TIMEOUT_MS:-${RESONIXDBOT_LIVE_GATEWAY_MODEL_TIMEOUT_MS:-}}" \
  -v "$CONFIG_DIR":/home/node/.resonix \
  -v "$WORKSPACE_DIR":/home/node/.resonix/workspace \
  "${PROFILE_MOUNT[@]}" \
  "$IMAGE_NAME" \
  -lc "set -euo pipefail; [ -f \"$HOME/.profile\" ] && source \"$HOME/.profile\" || true; cd /app && pnpm test:live"
