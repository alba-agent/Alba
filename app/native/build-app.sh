#!/bin/bash
# build-app.sh — Creates ALBA.app bundle for macOS Launchpad
# Run from: app/native/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="ALBA"
BUNDLE_ID="io.alba.app"
SRC_DIR="$SCRIPT_DIR/../dashboard/dist"
SERVER_DIR="$SCRIPT_DIR/../server"

# Output location
OUTPUT="$HOME/Applications/${APP_NAME}.app"

echo "Building ${APP_NAME}.app..."

# Clean previous
rm -rf "$OUTPUT"

# Create bundle structure
mkdir -p "$OUTPUT/Contents/MacOS"
mkdir -p "$OUTPUT/Contents/Resources/server"
mkdir -p "$OUTPUT/Contents/Resources/dashboard"

# Copy server files
cp -r "$SERVER_DIR"/* "$OUTPUT/Contents/Resources/server/"

# Copy built dashboard
cp -r "$SRC_DIR"/* "$OUTPUT/Contents/Resources/dashboard/"

# Create Info.plist
cat > "$OUTPUT/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>${APP_NAME}</string>
    <key>CFBundleDisplayName</key>
    <string>ALBA</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_ID}</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleExecutable</key>
    <string>launch</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIconFile</key>
    <string>icon.icns</string>
    <key>LSBackgroundOnly</key>
    <false/>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSMinimumSystemVersion</key>
    <string>13.0</string>
    <key>NSRequiresAquaSystemAppearance</key>
    <false/>
</dict>
</plist>
EOF

# Create launch script
cat > "$OUTPUT/Contents/MacOS/launch" << 'LAUNCH_EOF'
#!/bin/bash
# ALBA Launch — starts agent server + opens Safari webapp
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ALBA_HOME="$HOME/.alba"
PID_FILE="$ALBA_HOME/agent.pid"

mkdir -p "$ALBA_HOME"

# Check if already running
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        # Already running — just open Safari webapp
        open -a Safari --args --app http://localhost:3001 2>/dev/null &
        exit 0
    fi
fi

# Start server in background
cd "$APP_DIR/Resources/server"
node server.js &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

# Wait for server to be ready
for i in $(seq 1 30); do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Open Safari webapp
open -a Safari --args --app http://localhost:3001 2>/dev/null &

# Keep this process alive so the app doesn't quit
wait $SERVER_PID
LAUNCH_EOF

chmod +x "$OUTPUT/Contents/MacOS/launch"

echo "✓ ${APP_NAME}.app created at ${OUTPUT}"
echo ""
echo "To install in Launchpad:"
echo "  1. Open ${OUTPUT}"
echo "  2. Drag to Applications folder (or it's already there)"
echo "  3. Log out and back in, or run: killall Finder && killall Dock"
echo ""
echo "To test now:"
echo "  open ${OUTPUT}"
