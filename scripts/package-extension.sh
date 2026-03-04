#!/bin/bash
# Package Sentinel Extension for distribution
# Creates a .zip file in public/downloads/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXT_DIR="$PROJECT_ROOT/extension"
DIST_DIR="$EXT_DIR/dist"
OUT_DIR="$PROJECT_ROOT/public/downloads"
VERSION=$(node -e "console.log(require('$EXT_DIR/package.json').version)")
ZIP_NAME="sentinel-extension-v${VERSION}.zip"

echo "Packaging Sentinel Extension v${VERSION}..."

# Build extension
cd "$EXT_DIR"
pnpm build

# Prepare staging directory
STAGING=$(mktemp -d)
STAGE="$STAGING/sentinel-extension"
mkdir -p "$STAGE/assets/icons"

# Copy built files
cp "$DIST_DIR/background.js" "$STAGE/"
cp "$DIST_DIR/content.js" "$STAGE/"
cp "$DIST_DIR/search-content.js" "$STAGE/"
cp "$DIST_DIR/sc-content.js" "$STAGE/"
cp "$DIST_DIR/popup.js" "$STAGE/"
cp -r "$DIST_DIR/chunks" "$STAGE/" 2>/dev/null || true
cp -r "$DIST_DIR/assets" "$STAGE/" 2>/dev/null || true

# Copy popup HTML
cp "$DIST_DIR/src/popup/popup.html" "$STAGE/"

# Copy manifest
cp "$EXT_DIR/manifest.json" "$STAGE/"

# Copy icons
cp "$EXT_DIR/icons/"*.png "$STAGE/assets/icons/"

# Copy content CSS if exists
[ -f "$DIST_DIR/assets/popup.css" ] && cp "$DIST_DIR/assets/popup.css" "$STAGE/assets/"

# Create zip
mkdir -p "$OUT_DIR"
cd "$STAGING"
zip -r "$OUT_DIR/$ZIP_NAME" sentinel-extension/

# Cleanup
rm -rf "$STAGING"

echo "Created: public/downloads/$ZIP_NAME"
echo "Size: $(du -h "$OUT_DIR/$ZIP_NAME" | cut -f1)"
