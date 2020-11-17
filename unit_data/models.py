from core.mongodb import MongoDBManager
from core.utils import pymongo_no_id_projection, pymongo_result_conv
import logging

logger = logging.getLogger(__name__)

# Create your models here.

class UnitData:
	"""APIS のユニットデータを表すモデル

	Django のモデル機能を使わない.
	自前の MongoDBManager 経由 PyMongo 経由で MongoDB を直接アクセスする.
	"""
	objects = MongoDBManager('unit_data', 'unitData')

	@classmethod
	def unit_id_list(cls, community_id, cluster_id):
		"""ユニットデータが保存されているユニット の ID リストを返す

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID

		Returns:
			list: ユニット ID のリスト
		"""
		cur = cls.objects.distinct('oesunit.id', {'oesunit.communityId':community_id, 'oesunit.clusterId':cluster_id})
		return list(cur)

	@classmethod
	def latest_dataset_id(cls, community_id, cluster_id, unit_id):
		"""ユニットデータの dataset_id の最大値を返す

		unit_id を指定すると当該ユニットのみに絞る.

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			unit_id (str, optional): ユニット ID

		Returns:
			int: dataset_id 最大値
			None: if not exists
		"""
		query = {'oesunit.communityId':community_id, 'oesunit.clusterId':cluster_id};
		if unit_id:
			logger.debug('#### unit_id : ' + unit_id)
			query['oesunit.id'] = unit_id
		cur = cls.objects.aggregate([{'$match':query},{'$sort':{'datasetId':-1}},{'$limit':1},{'$project':{'_id':0, 'datasetId':1}}])
		result = list(cur)
		if result:
			return result[0]['datasetId']
		return None

	@classmethod
	def latest_list(cls, community_id, cluster_id, unit_id):
		"""最新のユニットデータ一式を返す

		最新とは dataset_id が最大である一式のこと.

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			unit_id (str, optional): ユニット ID

		Returns:
			list: ユニットデータのリスト
		"""
		dataset_id = cls.latest_dataset_id(community_id, cluster_id, unit_id)
		if dataset_id:
			logger.debug('#### dataset_id : ' + str(dataset_id))
			query = {'oesunit.communityId':community_id, 'oesunit.clusterId':cluster_id, 'datasetId':dataset_id}
			if unit_id:
				logger.debug('#### unit_id : ' + unit_id)
				query['oesunit.id'] = unit_id
			cur = cls.objects.find(query, projection = pymongo_no_id_projection())
			latest_list_map = map(pymongo_result_conv, cur)
			return list(latest_list_map)
		else:
			logger.debug('#### no dataset_id')
			return []

####

def ensure_indices():
	"""MongoDB のコレクションにインデクスを作成する
	"""
	from pymongo import ASCENDING
	UnitData.objects.create_index(
		[('oesunit.communityId', ASCENDING), ('oesunit.clusterId', ASCENDING), ('oesunit.id', ASCENDING), ('time', ASCENDING)],
		background = True
	)
	UnitData.objects.create_index(
		[('oesunit.communityId', ASCENDING), ('oesunit.clusterId', ASCENDING), ('datasetId', ASCENDING)],
		background = True
	)
