#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/.."

echo "===================================="
echo "Setting up project"
echo "===================================="

# Ensure uv exists
if ! command -v uv >/dev/null 2>&1; then
    echo "uv is not installed."
    echo "Run scripts/install-uv.sh first."
    exit 1
fi

echo "Installing Python 3.12 if needed..."
uv python install 3.12

echo "Pinning Python..."
uv python pin 3.12

echo "Creating virtual environment..."
uv venv

echo "Installing dependencies..."
uv sync

echo
echo "Setup complete."