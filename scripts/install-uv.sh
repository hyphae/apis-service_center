#!/usr/bin/env bash

set -e

if command -v uv >/dev/null 2>&1; then
    echo "uv already installed"
    uv --version
    exit 0
fi

OS="$(uname -s)"

case "$OS" in

Linux*)
    echo "Installing uv for Linux..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    ;;

Darwin*)
    echo "Installing uv for macOS..."

    if command -v brew >/dev/null 2>&1; then
        brew install uv
    else
        curl -LsSf https://astral.sh/uv/install.sh | sh
    fi
    ;;

MINGW*|MSYS*|CYGWIN*)
    echo "Installing uv for Windows..."
    powershell -ExecutionPolicy Bypass -c "irm https://astral.sh/uv/install.ps1 | iex"
    ;;

*)
    echo "Unsupported OS"
    exit 1
    ;;
esac

echo
echo "Installed:"
uv --version