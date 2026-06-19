#!/bin/bash
# Academia PayGas - Stop script (robust)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/logs/app.pid"

echo "=== Academia PayGas - Stopping ==="

STOPPED=false

# Method 1: Kill by PID file
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Sending SIGTERM to PID $PID..."
    kill "$PID" 2>/dev/null || true

    # Wait up to 10 seconds for graceful shutdown
    for i in $(seq 1 10); do
      if ! kill -0 "$PID" 2>/dev/null; then
        STOPPED=true
        break
      fi
      sleep 1
    done

    # Force kill if still alive
    if [ "$STOPPED" = false ] && kill -0 "$PID" 2>/dev/null; then
      echo "Process did not stop gracefully. Sending SIGKILL..."
      kill -9 "$PID" 2>/dev/null || true
      STOPPED=true
    fi
  else
    echo "PID $PID was not running"
    STOPPED=true
  fi
  rm -f "$PID_FILE"
fi

# Method 2: Kill by pattern (catch stragglers)
PATTERNS=("node.*dist/server/index.js" "node.*app.js")
for pattern in "${PATTERNS[@]}"; do
  pkill -9 -f "$pattern" 2>/dev/null && echo "Killed processes matching: $pattern" || true
done

# Method 3: Kill by port
if command -v fuser &> /dev/null; then
  fuser -k 3001/tcp 2>/dev/null && echo "Killed process on port 3001" || true
elif command -v lsof &> /dev/null; then
  lsof -ti :3001 | xargs kill -9 2>/dev/null && echo "Killed process on port 3001" || true
fi

sleep 1
echo "Server stopped"
