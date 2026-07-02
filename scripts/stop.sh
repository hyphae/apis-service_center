#!/usr/bin/env bash

set -e

echo "Stopping emulator..."

PIDS=$(pgrep -f "manage.py.*runserver" || true)

if [ -z "$PIDS" ]; then
    echo "No emulator running."
    exit 0
fi

echo "$PIDS" | xargs kill

echo "Stopped."