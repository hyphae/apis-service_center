#!/bin/sh

if type python3 > /dev/null 2>&1 ; then
	PYTHON=python3
else
	echo 'Your platform is not supported : no python'
	exit 1
fi

$PYTHON -m venv venv
. venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install --no-build-isolation -r requirements.txt
