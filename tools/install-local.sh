#!/usr/bin/env bash
#
# Build dsh-lumina and install it into a DSH profile.
#
# The install is a copy, not a link: pnpm snapshots the directory at install
# time, so editing the source afterwards changes nothing until the package is
# reinstalled. This script therefore always does the full cycle:
#
#   build -> remove the old package -> clear the installed copy -> add again
#
# Usage:
#   tools/install-local.sh [profile]        # default profile: web
#
# The client is only restarted by the user: `dsh web` for the web profile, or
# a full quit and relaunch for the desktop app. The client reads the plugin
# manifest at startup and does not hot-reload plugins.

set -euo pipefail

PROFILE="${1:-web}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DSH="${DSH_CLI:-/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh}"

if [[ ! -x "$DSH" ]]; then
  echo "error: dsh CLI not found at $DSH" >&2
  echo "       set DSH_CLI to override" >&2
  exit 1
fi

echo "==> building"
cd "$ROOT"
npm run build

echo "==> removing the previous copy from profile '$PROFILE'"
"$DSH" plugin --profile "$PROFILE" remove dsh-lumina || true
rm -rf "$HOME/.dsh/profiles/$PROFILE/node_modules/dsh-lumina"

echo "==> installing into profile '$PROFILE'"
# The path must be absolute: a relative path is resolved against the profile
# directory and fails with ERR_PNPM_LINKED_PKG_DIR_NOT_FOUND.
"$DSH" plugin --profile "$PROFILE" add "file:$ROOT"

echo
echo "==> done. restart the client to pick the plugin up:"
echo "      web:      dsh web --profile $PROFILE"
echo "      desktop:  quit and relaunch DeepSeek Harness"
