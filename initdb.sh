#!/bin/sh

cd $(dirname "${0}")
. venv/bin/activate
./manage.py migrate
./manage.py loaddata example
