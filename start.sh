#!/bin/bash
# Academia PayGas - Start script (robust)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Academia PayGas - Starting ==="

# Pre-flight checks
if [ ! -f .env ]; then
  echo "[ERROR] .env file not found"
  exit 1
fi

if [ ! -f dist/server/index.js ]; then
  echo "[ERROR] dist/server/index.js not found. Run 'deploy.sh' first."
  exit 1
fi

# Load env
set -a
source .env
set +a

export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-3001}"

# Kill existing processes
PID_FILE="$SCRIPT_DIR/logs/app.pid"
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null || true
  sleep 1
  kill -9 "$OLD_PID" 2>/dev/null || true
  rm -f "$PID_FILE"
fi

pkill -9 -f "node.*dist/server/index.js" 2>/dev/null || true
sleep 1

# Start
mkdir -p logs
nohup node dist/server/index.js > logs/app.log 2>&1 &
echo $! > logs/app.pid
sleep 2

# Verify process started
if kill -0 "$(cat logs/app.pid)" 2>/dev/null; then
  echo "Server started on port $PORT (PID: $(cat logs/app.pid))"
else
  echo "[ERROR] Server failed to start. Check logs/app.log"
  cat logs/app.log
  exit 1
fi
