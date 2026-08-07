#!/usr/bin/env bash
# Publish a Xcode-built Penopta Sync.app into public/downloads/ (zip + version
# manifest). Does not build — you build in Xcode, drop the .app here, then run.
#
# Change detection: MD5 of the .app bundle contents vs `contentMd5` in the
# last published Penopta-Sync.json. Same hash → nothing to publish.
# When content changes, marketing Version must be higher than the last
# publish. Build is scoped to that Version (it may stay the same or reset).
#
# Usage (from penopta-app):
#   npm run macos:publish
#   npm run macos:publish -- --notes "Fixes hourly sync."
#
# Drop the built app at:
#   macos-build/Penopta Sync.app
# (or set PENOPTA_SYNC_APP=/path/to/Penopta Sync.app)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DROP_DIR="$ROOT/macos-build"
DEFAULT_APP="$DROP_DIR/Penopta Sync.app"
APP_PATH="${PENOPTA_SYNC_APP:-$DEFAULT_APP}"
DEST_DIR="$ROOT/public/downloads"
DEST_ZIP="$DEST_DIR/Penopta-Sync.zip"
DEST_JSON="$DEST_DIR/Penopta-Sync.json"
SYNC_REPO="${PENOPTA_SYNC_REPO:-}"
if [[ -z "$SYNC_REPO" ]]; then
  if [[ -d "$ROOT/../Penopta Sync" ]]; then
    SYNC_REPO="$(cd "$ROOT/../Penopta Sync" && pwd)"
  else
    SYNC_REPO="$ROOT/../Penopta Sync"
  fi
fi

NOTES=""
NOTES_SET=0

usage() {
  cat <<EOF
Usage:
  npm run macos:publish
  npm run macos:publish -- --notes "..."

Version and build are read from the .app (set them in Xcode).

Optional:
  --notes "..."     Release notes for the update banner

Change detection:
  MD5 of macos-build/Penopta Sync.app vs contentMd5 in Penopta-Sync.json

Drop folder (after building in Xcode):
  $DEFAULT_APP

Override app path: PENOPTA_SYNC_APP=/path/to/Penopta Sync.app
EOF
}

print_xcode_instructions() {
  local reason="$1"
  cat >&2 <<EOF

$reason

Steps:
  1. Open: $SYNC_REPO/Penopta Sync.xcodeproj
  2. Select the Penopta Sync target → General
  3. Bump Version (Marketing) — must be higher than the last published version
  4. Set Build (Current Project Version) as you like for that Version
     (Build may stay the same or reset; Version is what marks a newer release)
  5. Product → Build (⌘B), or Archive + Export
  6. Copy the built Penopta Sync.app into:
       $DROP_DIR/
  7. Re-run:
       npm run macos:publish${NOTES:+ -- --notes \"$NOTES\"}

Tip: In Xcode, Products → Penopta Sync.app → Show in Finder, then copy.
EOF
}

# Stable MD5 over every file in the .app (path + bytes), so rebuilds with the
# same bits match and any real content change does not.
app_content_md5() {
  local app="$1"
  python3 - "$app" <<'PY'
import hashlib, os, sys

root = sys.argv[1]
h = hashlib.md5()
for dirpath, dirnames, filenames in os.walk(root):
    dirnames.sort()
    for name in sorted(filenames):
        path = os.path.join(dirpath, name)
        if not os.path.isfile(path) or os.path.islink(path):
            continue
        rel = os.path.relpath(path, root).replace(os.sep, "/")
        h.update(rel.encode("utf-8"))
        h.update(b"\0")
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                h.update(chunk)
print(h.hexdigest())
PY
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --notes)
      if [[ $# -lt 2 || "$2" == --* ]]; then
        echo "Missing value for --notes." >&2
        echo >&2
        usage >&2
        exit 1
      fi
      NOTES="$2"
      NOTES_SET=1
      shift 2
      ;;
    --version)
      echo "--version is no longer used — version is read from the .app." >&2
      echo "Just run: npm run macos:publish" >&2
      exit 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      echo >&2
      usage >&2
      exit 1
      ;;
  esac
done

mkdir -p "$DROP_DIR"

if [[ ! -d "$APP_PATH" ]]; then
  print_xcode_instructions \
    "No Penopta Sync.app found at:
  $APP_PATH"
  exit 1
fi

PLIST="$APP_PATH/Contents/Info.plist"
if [[ ! -f "$PLIST" ]]; then
  echo "Not a valid app bundle (missing Info.plist): $APP_PATH" >&2
  exit 1
fi

APP_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$PLIST")"
APP_BUILD="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$PLIST")"
APP_MD5="$(app_content_md5 "$APP_PATH")"

if [[ -z "$APP_VERSION" || -z "$APP_BUILD" ]]; then
  echo "Could not read Version/Build from $PLIST" >&2
  exit 1
fi

PUBLISHED_BUILD=0
PUBLISHED_VERSION=""
PUBLISHED_MD5=""
if [[ -f "$DEST_JSON" ]]; then
  read -r PUBLISHED_VERSION PUBLISHED_BUILD PUBLISHED_MD5 < <(
    python3 - "$DEST_JSON" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
print(
    data.get("version", "") or "",
    int(data.get("build", 0) or 0),
    data.get("contentMd5", "") or "",
)
PY
  )
fi

if [[ -n "$PUBLISHED_MD5" && "$APP_MD5" == "$PUBLISHED_MD5" ]]; then
  cat >&2 <<EOF
No change detected — this .app matches the last published content.
  contentMd5: $APP_MD5
  published:  v${PUBLISHED_VERSION:-?} (build ${PUBLISHED_BUILD})

Rebuild in Xcode with your changes, bump Version, copy the new .app to:
  $DEFAULT_APP
Then re-run:
  npm run macos:publish
EOF
  exit 1
fi

# Content changed → marketing Version must advance. Build is per-version.
version_is_newer() {
  python3 - "$1" "$2" <<'PY'
import sys

def parts(v: str):
    out = []
    for p in (v or "0").split("."):
        try:
            out.append(int(p))
        except ValueError:
            out.append(0)
    return out

a, b = parts(sys.argv[1]), parts(sys.argv[2])
n = max(len(a), len(b))
a += [0] * (n - len(a))
b += [0] * (n - len(b))
sys.exit(0 if a > b else 1)
PY
}

if [[ -n "$PUBLISHED_VERSION" ]] && ! version_is_newer "$APP_VERSION" "$PUBLISHED_VERSION"; then
  print_xcode_instructions \
    "Content changed (new md5), but Version is not higher than what’s published.
  Dropped app:       v${APP_VERSION} (build ${APP_BUILD})  md5 ${APP_MD5}
  Already published: v${PUBLISHED_VERSION} (build ${PUBLISHED_BUILD})  md5 ${PUBLISHED_MD5:-none}

In Xcode → Penopta Sync target → General:
  • Bump Version above ${PUBLISHED_VERSION} (e.g. next marketing release)
  • Build may stay the same or reset — it is scoped to that Version
Then rebuild, copy the .app into the drop folder, and re-run npm run macos:publish."
  exit 1
fi

PUBLISHED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

mkdir -p "$DEST_DIR"
rm -f "$DEST_ZIP"
ditto -c -k --sequesterRsrc --keepParent "$APP_PATH" "$DEST_ZIP"

json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.argv[1]), end="")' "$1"
}

cat > "$DEST_JSON" <<EOF
{
  "version": $(json_escape "$APP_VERSION"),
  "build": ${APP_BUILD},
  "contentMd5": $(json_escape "$APP_MD5"),
  "downloadPath": "/downloads/Penopta-Sync.zip",
  "notes": $(json_escape "$NOTES"),
  "publishedAt": $(json_escape "$PUBLISHED_AT")
}
EOF

echo ""
echo "Published v${APP_VERSION} (build ${APP_BUILD})"
echo "  contentMd5 $APP_MD5"
echo "  from $APP_PATH"
echo "  $DEST_ZIP ($(du -h "$DEST_ZIP" | awk '{print $1}'))"
echo "  $DEST_JSON"
echo ""
echo "Next: commit public/downloads/Penopta-Sync.{zip,json}, then deploy."
if [[ "$NOTES_SET" -eq 0 ]]; then
  echo "(Tip: pass --notes \"…\" if you want banner text in the Mac app.)"
fi
