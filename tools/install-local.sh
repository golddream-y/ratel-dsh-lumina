#!/usr/bin/env bash
#
# Build Ratel Lumina (@ratel/dsh-lumina) and install it into a DSH profile.
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
"$DSH" plugin --profile "$PROFILE" remove @ratel/dsh-lumina || true
# Remove the pre-rename install as well; the package id changed with the Ratel name.
"$DSH" plugin --profile "$PROFILE" remove dsh-lumina || true
rm -rf "$HOME/.dsh/profiles/$PROFILE/node_modules/dsh-lumina"
rm -rf "$HOME/.dsh/profiles/$PROFILE/node_modules/@ratel/dsh-lumina"

echo "==> installing into profile '$PROFILE'"
# The path must be absolute: a relative path is resolved against the profile
# directory and fails with ERR_PNPM_LINKED_PKG_DIR_NOT_FOUND.
"$DSH" plugin --profile "$PROFILE" add "file:$ROOT"

# `dsh plugin add` installs the dependency, but a remove/add cycle can leave the
# profile bundle row out. Without the row the Loader never inserts the patch:
# the plugin still appears installed, but neither the host entry nor the client
# bundle is composed. Make the row explicit and idempotent.
echo "==> ensuring the profile bundle row exists"
python3 - "$HOME/.dsh/profiles/$PROFILE/package.json" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
data = json.loads(path.read_text(encoding="utf-8"))
profile = data.setdefault("dsh", {}).setdefault("profile", {})
bundles = profile.setdefault("bundles", [])
if "@ratel/dsh-lumina" not in bundles:
    bundles.append("@ratel/dsh-lumina")
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("    appended @ratel/dsh-lumina to dsh.profile.bundles")
else:
    print("    @ratel/dsh-lumina already in dsh.profile.bundles")

# Drop the pre-rename package and bundle row so the old client graph cannot
# compete with the scoped package.
dependencies = data.get("dependencies", {})
if "dsh-lumina" in dependencies:
    dependencies.pop("dsh-lumina", None)
bundles[:] = [item for item in bundles if item != "dsh-lumina"]
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
PY

echo
echo "==> done. restart the client to pick the plugin up:"
echo "      web:      dsh web --profile $PROFILE"
echo "      desktop:  quit and relaunch DeepSeek Harness"
