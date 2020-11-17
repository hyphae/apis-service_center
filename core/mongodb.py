from django.conf import settings
from pymongo import MongoClient

class MongoDBManager:
	"""MongoDB 用の Django モデル Manager 代用クラス

	settings.MONGODB_DATABASES から情報を取得して接続する.
	各種 DB アクセスは全て Collection オブジェクトに丸投げする.
	極めて初歩的な実装.
	"""
	def __init__(self, app_label, db_table):
		"""コンストラクタ

		Args:
			app_label (str): Django アプリケーション名
			db_table (str): MongoDB コレクション名
		"""
		info = settings.MONGODB_DATABASES.get(app_label, {})
		host = info.get('HOST')
		port = info.get('PORT')
		name = info.get('NAME')
		host = host if host else None
		port = int(port) if port else None
		name = name if name else None
		client = MongoClient(host, port)
		self.db = client[name]
		self.collection = self.db[db_table]

	def count(self, *args, **kwargs):
		"""count
		"""
		return self.collection.count(*args, **kwargs)

	def find(self, *args, **kwargs):
		"""find
		"""
		return self.collection.find(*args, **kwargs)
	
	def find_one(self, *args, **kwargs):
		"""find_one
		"""
		return self.collection.find_one(*args, **kwargs)
	
	def distinct(self, *args, **kwargs):
		"""distinct
		"""
		return self.collection.distinct(*args, **kwargs)
	
	def aggregate(self, *args, **kwargs):
		"""aggregate
		"""
		return self.collection.aggregate(*args, **kwargs)
	
	def update_one(self, *args, **kwargs):
		"""update_one
		"""
		return self.collection.update_one(*args, **kwargs)
	
	def create_index(self, *args, **kwargs):
		"""create_index
		"""
		return self.collection.create_index(*args, **kwargs)
	