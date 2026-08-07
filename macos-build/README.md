# Drop a Xcode-built Penopta Sync.app here, then from the repo root:
#
#   npm run macos:publish
#
# Expected path: macos-build/Penopta Sync.app
#
# Build a Release app (Product → Archive → Export), not Debug.
# Debug defaults to http://localhost:3200; Release uses https://app.penopta.com.
#
# Version/build are read from the .app. Publish compares an MD5 of this
# bundle to `contentMd5` in public/downloads/Penopta-Sync.json.
# Same hash → nothing to ship. New content requires a new Version and a
# higher Build in Xcode so installed apps update.
#
# Do not commit the .app — only the dmg + json under public/downloads/ ship.
