#!/usr/bin/env bash
# Build a SIGNED release Android App Bundle (.aab) for Rail Rascals.
#
# Usage:
#   bash build-aab.sh /full/path/to/railrascals-upload.keystore
#
# It will:
#   1. sync the web assets from the repo root into the native project
#      (app/sync-www.sh -> app/www -> cap sync -> android assets)
#   2. ask for the keystore password at a HIDDEN prompt (never echoed,
#      never stored, never left in shell history)
#   3. run the signed Capacitor release build (AAB)
#
# Security: the password is read into a local variable via `read -s` and
# passed straight to the build; it is never printed, logged, or committed.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$REPO_ROOT/app"
KEY_ALIAS="railrascals"

KEYSTORE_PATH="${1:-$REPO_ROOT/app/railrascals-upload.keystore}"
if [ ! -f "$KEYSTORE_PATH" ]; then
  echo "ERROR: keystore not found at: $KEYSTORE_PATH" >&2
  echo "Pass the full path:  bash build-aab.sh /full/path/to/railrascals-upload.keystore" >&2
  exit 1
fi

# Absolute path so the signer (run from app/) can find the keystore.
KEYSTORE_PATH="$(cd "$(dirname "$KEYSTORE_PATH")" && pwd)/$(basename "$KEYSTORE_PATH")"

# 1) sync web assets into the native project
echo "==> Syncing web assets into the native project..."
( cd "$APP_DIR" && bash sync-www.sh )

# 2) hidden password prompt (key & store passwords are the same for this keystore)
printf "Keystore password: "
read -rs KSPW
echo
if [ -z "${KSPW:-}" ]; then echo "ERROR: empty password" >&2; exit 1; fi

# 3) signed release build (AAB)
echo "==> Building signed AAB (this can take a minute)..."
(
  cd "$APP_DIR"
  npx cap build android \
    --keystorepath "$KEYSTORE_PATH" \
    --keystorepass "$KSPW" \
    --keystorealias "$KEY_ALIAS" \
    --keystorealiaspass "$KSPW" \
    --androidreleasetype AAB
)
unset KSPW

OUT="$APP_DIR/android/app/build/outputs/bundle/release/app-release-signed.aab"
if [ -f "$OUT" ]; then
  echo
  echo "✅ Signed AAB ready:"
  echo "   $OUT"
  ls -la "$OUT"
else
  echo "ERROR: build finished but $OUT was not found." >&2
  exit 1
fi
