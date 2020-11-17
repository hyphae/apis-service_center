"""Django でモデルとデータベース定義との対応付けをするクラスを定義

settings.DATABASE_ROUTERS でクラスを指定する.
"""
from django.conf import settings

class DatabaseRouter:
	"""モデルとデータベース定義との対応付けをするクラス

	config.DATABASE_APPS_MAPPING を参照し config.DATABASES のエントリ名を返す.
	"""

	def db_for_read(self, model, **hints):
		if model._meta.app_label in settings.DATABASE_APPS_MAPPING:
			return settings.DATABASE_APPS_MAPPING[model._meta.app_label]
		return settings.DATABASE_APPS_MAPPING['*']

	def db_for_write(self, model, **hints):
		if model._meta.app_label in settings.DATABASE_APPS_MAPPING:
			return settings.DATABASE_APPS_MAPPING[model._meta.app_label]
		return settings.DATABASE_APPS_MAPPING['*']

	def allow_relation(self, obj1, obj2, **hints):
		db1 = settings.DATABASE_APPS_MAPPING.get(obj1._meta.app_label)
		db2 = settings.DATABASE_APPS_MAPPING.get(obj2._meta.app_label)
		if db1 and db2:
			return db1 == db2
		if not db1 and db2:
			return True
		return None

	def allow_migrate(self, db, app_label, model=None, **hints):
		if app_label in settings.DATABASE_APPS_MAPPING:
			return settings.DATABASE_APPS_MAPPING.get(app_label) == db
		return settings.DATABASE_APPS_MAPPING.get('*') == db
