#!/bin/bash
PID_FILE=/home/olamulticomcom/public_html/academia-paygas/logs/app.pid
if [ -f "$PID_FILE" ]; then
    kill $(cat "$PID_FILE") 2>/dev/null
    rm "$PID_FILE"
    echo "Server stopped"
else
    echo "No PID file found"
fi
