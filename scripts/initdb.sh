#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/.."

echo "Running migrations..."

uv run python manage.py migrate

echo
echo "Loading example data..."

uv run python manage.py loaddata example

echo
echo "Database initialized."