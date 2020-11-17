from core.mongodb import MongoDBManager
from core.utils import pymongo_no_id_projection, pymongo_result_conv
import logging

logger = logging.getLogger(__name__)

# Create your models here.

class ApisLog:
	"""APIS の実行ログを表すモデル

	Django のモデル機能を使わない.
	自前の MongoDBManager 経由 PyMongo 経由で MongoDB を直接アクセスする.
	"""
	objects = MongoDBManager('apis_log', 'apisLog')

	@classmethod
	def count(cls, community_id, cluster_id, program_id, unit_id, thread_name, date_time, level, logger_name, message):
		"""指定した条件に合致するログの件数を返す

		Args:
			community_id (str or dict): MongoDB のクエリの条件
			cluster_id (str or dict): MongoDB のクエリの条件
			program_id (str or dict): MongoDB のクエリの条件
			unit_id (str or dict): MongoDB のクエリの条件
			thread_name (str or dict): MongoDB のクエリの条件
			date_time (datetime or dict): MongoDB のクエリの条件
			level (str or dict): MongoDB のクエリの条件
			logger_name (str or dict): MongoDB のクエリの条件
			message (str or dict): MongoDB のクエリの条件

		Returns:
			[int]: 件数
		"""
		query = cls.build_query(community_id, cluster_id, program_id, unit_id, thread_name, date_time, level, logger_name, message)
		return cls.objects.count(query)

	@classmethod
	def list(cls, community_id, cluster_id, program_id, unit_id, thread_name, date_time, level, logger_name, message):
		"""指定した条件に合致するログのリストを返す

		Args:
			community_id (str or dict): MongoDB のクエリの条件
			cluster_id (str or dict): MongoDB のクエリの条件
			program_id (str or dict): MongoDB のクエリの条件
			unit_id (str or dict): MongoDB のクエリの条件
			thread_name (str or dict): MongoDB のクエリの条件
			date_time (datetime or dict): MongoDB のクエリの条件
			level (str or dict): MongoDB のクエリの条件
			logger_name (str or dict): MongoDB のクエリの条件
			message (str or dict): MongoDB のクエリの条件

		Returns:
			[list]: ログ
		"""
		query = cls.build_query(community_id, cluster_id, program_id, unit_id, thread_name, date_time, level, logger_name, message)
		qs = cls.objects.find(query, projection = pymongo_no_id_projection())
		result = map(pymongo_result_conv, qs)
		return list(result)

	def build_query(community_id, cluster_id, program_id, unit_id, thread_name, date_time, level, logger_name, message):
		"""MongoDB のクエリを生成する

		Args:
			community_id (str or dict): MongoDB のクエリの条件
			cluster_id (str or dict): MongoDB のクエリの条件
			program_id (str or dict): MongoDB のクエリの条件
			unit_id (str or dict): MongoDB のクエリの条件
			thread_name (str or dict): MongoDB のクエリの条件
			date_time (datetime or dict): MongoDB のクエリの条件
			level (str or dict): MongoDB のクエリの条件
			logger_name (str or dict): MongoDB のクエリの条件
			message (str or dict): MongoDB のクエリの条件

		Returns:
			[dict]: クエリ
		"""
		query = {}
		if community_id: query['communityId'] = community_id
		if cluster_id: query['clusterId'] = cluster_id
		if program_id: query['programId'] = program_id
		if unit_id: query['unitId'] = unit_id
		if thread_name: query['thread'] = thread_name
		if date_time: query['datetime'] = date_time
		if level: query['loglevel'] = level
		if logger_name: query['loggername'] = logger_name
		if message: query['message'] = message
		return query

####

def ensure_indices():
	"""MongoDB のコレクションにインデクスを作成する

	通常のインデクスと TTL インデクスのふたつ作成する.
	"""
	from pymongo import ASCENDING
	ApisLog.objects.create_index(
		[('communityId', ASCENDING), ('clusterId', ASCENDING), ('programId', ASCENDING), ('unitId', ASCENDING), ('datetime', ASCENDING)],
		background = True
	)
	# TTL インデクス
	ApisLog.objects.create_index(
		'datetime',
		background = True,
		expireAfterSeconds = 31536000
	)
