#!/usr/bin/env bash

set -e

PORT=8000

echo "Stopping Django server..."

PIDS=$(lsof -ti tcp:${PORT} || true)

if [ -z "$PIDS" ]; then
    echo "No server running."
    exit 0
fi

echo "$PIDS" | xargs kill

echo "Stopped."