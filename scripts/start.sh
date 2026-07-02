#!/usr/bin/env bash

set -e

cd "$(dirname "$0")/.."

echo "Starting Django server..."

exec uv run python manage.py runserver \
    --settings=config.settings.apis-service_center-demo \
    8000