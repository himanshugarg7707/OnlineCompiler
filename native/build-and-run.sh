#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_NAME="FullCode"
APP_BUNDLE="$SCRIPT_DIR/$APP_NAME.app"

echo "⚡️ Building $APP_NAME for macOS…"

# ── 1. Generate AppIcon.icns if needed ───────────────────────────
if [ ! -f "$SCRIPT_DIR/AppIcon.icns" ]; then
  echo "🎨 Generating high-resolution macOS squircle AppIcon…"
  swift "$SCRIPT_DIR/generate-icon.swift"
  iconutil -c icns /tmp/AppIcon.iconset -o "$SCRIPT_DIR/AppIcon.icns"
fi

# ── 2. Create .app bundle structure ──────────────────────────────
echo "📦 Packaging .app bundle…"
rm -rf "$APP_BUNDLE"
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"

cp "$SCRIPT_DIR/Info.plist" "$APP_BUNDLE/Contents/Info.plist"
cp "$SCRIPT_DIR/AppIcon.icns" "$APP_BUNDLE/Contents/Resources/AppIcon.icns"

# ── 3. Compile Swift Native Application ──────────────────────────
echo "🔨 Compiling Swift native runtime…"
swiftc \
  -o "$APP_BUNDLE/Contents/MacOS/FullCode" \
  "$SCRIPT_DIR/main.swift" \
  -framework Cocoa \
  -framework WebKit \
  -O \
  -suppress-warnings \
  2>&1

# Ad-hoc sign bundle so macOS Gatekeeper allows smooth execution
codesign -s - --force --deep "$APP_BUNDLE" 2>/dev/null || true

echo "✅ Build succeeded → $APP_BUNDLE"

# ── 4. Install into /Applications ────────────────────────────────
DEST_APP="/Applications/$APP_NAME.app"
echo "📲 Installing to ${DEST_APP}..."
rm -rf "$DEST_APP"
cp -R "$APP_BUNDLE" "$DEST_APP"

# ── 5. Kill previous instances if running ────────────────────────
pkill -f "FullCode.app/Contents/MacOS/FullCode" 2>/dev/null || true
pkill -f "OnlineCompiler IDE.app" 2>/dev/null || true
pkill -x "FullCode" 2>/dev/null || true
pkill -x "OnlineCompiler" 2>/dev/null || true
rm -rf "/Applications/OnlineCompiler IDE.app" 2>/dev/null || true
rm -rf "$SCRIPT_DIR/OnlineCompiler IDE.app" 2>/dev/null || true
sleep 0.5

# ── 6. Launch native application ─────────────────────────────────
echo "🚀 Launching ${APP_NAME}..."
open "$DEST_APP"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  FullCode is now running natively on macOS!                  ║"
echo "║                                                              ║"
echo "║  • App window open on desktop                                ║"
echo "║  • Status bar icon active in macOS Top Taskbar (Menu Bar)   ║"
echo "║  • Quick actions: Run Code, New File, Switch Language        ║"
echo "║  • Installed in /Applications/FullCode.app                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"

