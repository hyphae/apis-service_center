echo 'call start.sh'

cd $(dirname "${0}")
. venv/bin/activate
./manage.py runserver --settings=config.settings.apis-service_center-demo 8000

echo '... done'
