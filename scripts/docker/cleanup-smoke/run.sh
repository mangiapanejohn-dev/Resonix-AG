#!/usr/bin/env bash
set -euo pipefail

cd /repo

export RESONIX_STATE_DIR="/tmp/resonix-test"
export RESONIX_CONFIG_PATH="${RESONIX_STATE_DIR}/resonix.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${RESONIX_STATE_DIR}/credentials"
mkdir -p "${RESONIX_STATE_DIR}/agents/main/sessions"
echo '{}' >"${RESONIX_CONFIG_PATH}"
echo 'creds' >"${RESONIX_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${RESONIX_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm resonix reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${RESONIX_CONFIG_PATH}"
test ! -d "${RESONIX_STATE_DIR}/credentials"
test ! -d "${RESONIX_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${RESONIX_STATE_DIR}/credentials"
echo '{}' >"${RESONIX_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm resonix uninstall --state --yes --non-interactive

test ! -d "${RESONIX_STATE_DIR}"

echo "OK"
