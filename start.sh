#!/bin/bash
cd /home/olamulticomcom/public_html/academia-paygas
export NODE_ENV=production
export PORT=3001
set -a
source .env
set +a
mkdir -p logs
nohup node dist/server/index.js > logs/app.log 2>&1 &
echo $! > logs/app.pid
echo "Server started on port 3001 (PID: $(cat logs/app.pid))"
