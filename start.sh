#!/bin/bash
# start.sh — One-command ALBA startup

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ALBA_HOME="$HOME/.alba"
mkdir -p "$ALBA_HOME"

echo ""
echo "  ALBA — Personal AI Assistant"
echo ""

# 0. Kill existing processes on our ports
for port in 3001; do
  pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  Cleaning port $port..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
done

# 1. Start ALBA server
echo "  Starting ALBA server..."
cd "$SCRIPT_DIR/app/server"
node server.js &
SERVER_PID=$!
echo $SERVER_PID > "$ALBA_HOME/server.pid"

# Wait for server to be ready
echo "  Waiting for server..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3001/api/status > /dev/null 2>&1; then
    break
  fi
  sleep 1
done
sleep 1

# 3. Open dashboard
echo "  Opening dashboard..."
open http://localhost:3001

echo ""
echo "  ALBA is running!"
echo "  Dashboard: http://localhost:3001"
echo "  Terminal:  albacli"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

cleanup() {
  echo ""
  echo "  Shutting down..."
  kill $SERVER_PID 2>/dev/null || true
  rm -f "$ALBA_HOME/agent.pid" "$ALBA_HOME/server.pid"
  echo "  Stopped"
  exit 0
}
trap cleanup SIGINT SIGTERM

wait $SERVER_PID
