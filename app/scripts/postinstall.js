/**
 * postinstall.js — runs after npm install -g @albalink/app
 * Creates ALBA.app in ~/Applications for Launchpad
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const APP_NAME = "ALBA";
const BUNDLE_ID = "io.alba.app";
const HOME = homedir();
const APPS_DIR = join(HOME, "Applications");
const APP_DIR = join(APPS_DIR, `${APP_NAME}.app`);
const NATIVE_DIR = join(import.meta.dirname, "..", "native");
const DASHBOARD_DIST = join(import.meta.dirname, "..", "dashboard", "dist");
const SERVER_DIR = join(import.meta.dirname, "..", "server");

console.log(`\n  Installing ${APP_NAME} to Applications...\n`);

// Verify source files exist
if (!existsSync(DASHBOARD_DIST)) {
  console.error("  ✗ Dashboard not built. Run: npm run build");
  process.exit(1);
}

// Clean previous install
if (existsSync(APP_DIR)) {
  execSync(`rm -rf "${APP_DIR}"`);
}

// Create bundle structure
mkdirSync(join(APP_DIR, "Contents", "MacOS"), { recursive: true });
mkdirSync(join(APP_DIR, "Contents", "Resources", "server"), { recursive: true });
mkdirSync(join(APP_DIR, "Contents", "Resources", "dashboard"), { recursive: true });

// Copy server
const serverFiles = readdirSync(SERVER_DIR).filter(f => f !== "node_modules" && f !== "package.json");
for (const f of serverFiles) {
  copyFileSync(join(SERVER_DIR, f), join(APP_DIR, "Contents", "Resources", "server", f));
}

// Copy dashboard
const dashFiles = readdirSync(DASHBOARD_DIST);
for (const f of dashFiles) {
  const src = join(DASHBOARD_DIST, f);
  const dst = join(APP_DIR, "Contents", "Resources", "dashboard", f);
  if (f.endsWith(".html") || f.endsWith(".js") || f.endsWith(".css") || f.endsWith(".svg") || f.endsWith(".json") || f.endsWith(".woff2")) {
    copyFileSync(src, dst);
  }
}

// Copy icon if exists
if (existsSync(join(NATIVE_DIR, "icon.icns"))) {
  copyFileSync(join(NATIVE_DIR, "icon.icns"), join(APP_DIR, "Contents", "Resources", "icon.icns"));
}

// Info.plist
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key><string>ALBA</string>
    <key>CFBundleDisplayName</key><string>ALBA</string>
    <key>CFBundleIdentifier</key><string>io.alba.app</string>
    <key>CFBundleVersion</key><string>1.0.0</string>
    <key>CFBundleShortVersionString</key><string>1.0.0</string>
    <key>CFBundleExecutable</key><string>launch</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>LSBackgroundOnly</key><false/>
    <key>NSHighResolutionCapable</key><true/>
    <key>LSMinimumSystemVersion</key><string>13.0</string>
</dict>
</plist>`;
writeFileSync(join(APP_DIR, "Contents", "Info.plist"), plist, "utf-8");

// Launch script
const launchScript = `#!/bin/bash
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ALBA_HOME="$HOME/.alba"
PID_FILE="$ALBA_HOME/agent.pid"
mkdir -p "$ALBA_HOME"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        open -a Safari --args --app http://localhost:3001 2>/dev/null &
        exit 0
    fi
fi

# Start server
cd "$APP_DIR/Resources/server"
node server.js &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

# Wait for ready
for i in $(seq 1 30); do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then break; fi
    sleep 1
done

# Open Safari webapp
open -a Safari --args --app http://localhost:3001 2>/dev/null &
wait $SERVER_PID
`;
writeFileSync(join(APP_DIR, "Contents", "MacOS", "launch"), launchScript, "utf-8");
execSync(`chmod +x "${APP_DIR}/Contents/MacOS/launch"`);

console.log(`  ✓ ${APP_NAME}.app installed to ~/Applications/`);
console.log(`  ✓ Launchpad icon will appear after restart`);
console.log(`\n  To start now: open ~/Applications/${APP_NAME}.app\n`);
