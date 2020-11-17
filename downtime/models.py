from core.mongodb import MongoDBManager
from core.utils import pymongo_no_id_projection, pymongo_result_conv
import logging

logger = logging.getLogger(__name__)

# Create your models here.

class Downtime:
	"""ダウンタイムを表すモデル

	Django のモデル機能を使わない.
	自前の MongoDBManager 経由 PyMongo 経由で MongoDB を直接アクセスする.
	"""
	objects = MongoDBManager('downtime', 'downtime')

	@classmethod
	def list(cls, community_id, cluster_id, unit_id, datetime_from, datetime_to):
		"""指定した条件に合致するダウンタイムを返す

		datetime_from および datetime_to により日時で絞る.
		その際 datetime_form はその値を含み ( recoveryDateTime == null or datetime_from <= recoveryDateTime ),
		datetime_to は含まない ( downDateTime == null or downDateTime < datetime_to ) .

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			unit_id (str, optional): ユニット ID
			datetime_from (datetime, optional): 検索対象日時下限 ( 以上 )
			datetime_to (datetime, optional): 検索対象日時上限 ( 未満 )

		Returns:
			list: ダウンタイムのリスト
		"""
		query = {'$and':[{'communityId':community_id}, {'clusterId':cluster_id}]}
		if unit_id:
			query['$and'].append({'unitId':unit_id})
		if datetime_from:
			query['$and'].append({'$or':[{'recoveryDateTime':None}, {'recoveryDateTime':{'$gte':datetime_from}}]})
		if datetime_to:
			query['$and'].append({'$or':[{'downDateTime':None}, {'downDateTime':{'$lt':datetime_to}}]})
		cur = cls.objects.find(query, projection = pymongo_no_id_projection())
		list_map = map(pymongo_result_conv, cur)
		return list(list_map)

class DowntimeStatus:
	"""ダウンタイム集計処理の処理状態を表すモデル

	Django のモデル機能を使わない.
	自前の MongoDBManager 経由 PyMongo 経由で MongoDB を直接アクセスする.
	"""
	objects = MongoDBManager('downtime', 'downtimeStatus')

	@classmethod
	def unit_id_list(cls, community_id, cluster_id):
		"""処理状態を持つユニットの ID リストを返す

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID

		Returns:
			list: ユニット ID のリスト
		"""
		cur = cls.objects.distinct('unitId', {'communityId':community_id, 'clusterId':cluster_id})
		return list(cur)

####

def ensure_indices():
	"""MongoDB のコレクションにインデクスを作成する
	"""
	from pymongo import ASCENDING
	Downtime.objects.create_index(
		[('communityId', ASCENDING), ('clusterId', ASCENDING), ('unitId', ASCENDING), ('downDateTime', ASCENDING), ('recoveryDateTime', ASCENDING)],
		background = True
	)
