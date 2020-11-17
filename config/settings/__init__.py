"""設定ファイルを切り替えて起動できるようにするため settings.py を settings パッケージ化

以下のコマンドで起動時に設定ファイルを指定することができる.
	- $ ./manage.py runserver --settings=config.settings.deploy_example ...
	- $ uwsgi --env DJANGO_SETTINGS_MODULE=config.settings.deploy_example ...

指定しなければ base.py の内容が有効になる.
"""
from .base import *
