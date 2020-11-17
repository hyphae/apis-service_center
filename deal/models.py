from core.mongodb import MongoDBManager
from core.utils import pymongo_no_id_projection, pymongo_result_conv
import logging
import time

logger = logging.getLogger(__name__)

# Create your models here.

class Deal:
	"""APIS の融通情報を表すモデル

	Django のモデル機能を使わない.
	自前の MongoDBManager 経由 PyMongo 経由で MongoDB を直接アクセスする.
	"""
	objects = MongoDBManager('deal', 'deal')

	@classmethod
	def live_list(cls, community_id, cluster_id, unit_id, report_time_tolerance = 300):
		"""community_id および cluster_id で指定したクラスタで実行中の融通情報を返す.
		unit_id を指定するとそのユニットが送電側または受電側で参加しているもののみに絞る.

		「実行中」の条件は deactivateDateTime が null であること.
		ただし何らかのトラブルでその条件を満たすモノがいつまでも残る可能性があるため report_time_tolerance で制限する.

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			unit_id (str, optional): ユニット ID
			report_time_tolerance (int, optional): 融通情報の有効期限 [秒]. Defaults to 300.

		Returns:
			list: 実行中の融通情報のリスト
		"""
		logger.debug('#### report_time_tolerance : ' + str(report_time_tolerance))
		report_time_min = int(time.time()) - report_time_tolerance
		query = {'$and':[{'communityId':community_id}, {'clusterId':cluster_id}, {'deactivateDateTime':None}, {'reportTime':{'$gt':report_time_min}}]}
		if unit_id:
			logger.debug('#### unit_id : ' + unit_id)
			query['$and'].append({'$or':[{'dischargeUnitId':unit_id}, {'chargeUnitId':unit_id}]})
		cur = cls.objects.find(query, projection = pymongo_no_id_projection())
		result = map(pymongo_result_conv, cur)
		return list(result)

	@classmethod
	def list(cls, community_id, cluster_id, unit_id, datetime_from, datetime_to):
		"""community_id および cluster_id で指定したクラスタで実行された融通情報を返す.
		unit_id を指定するとそのユニットが送電側または受電側で参加したもののみに絞る.

		datetime_from および datetime_to により融通作成日時で絞る.
		その際 datetime_form はその値を含み ( datetime_from <= createDateTime ),
		datetime_to は含まない ( createDateTime < datetime_to ) .

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			unit_id (str, optional): ユニット ID
			datetime_from (datetime, optional): 融通作成日時下限 ( 以上 )
			datetime_to (datetime, optional): 融通作成日時上限 ( 未満 )

		Returns:
			list: 融通情報のリスト
		"""
		query = {'$and':[{'communityId':community_id}, {'clusterId':cluster_id}]}
		if unit_id:
			logger.debug('#### unit_id : ' + unit_id)
			query['$and'].append({'$or':[{'dischargeUnitId':unit_id}, {'chargeUnitId':unit_id}]})
		if datetime_from:
			query['$and'].append({'createDateTime':{'$gte':datetime_from}})
		if datetime_to:
			query['$and'].append({'createDateTime':{'$lt':datetime_to}})
		cur = cls.objects.find(query, projection = pymongo_no_id_projection())
		result = map(pymongo_result_conv, cur)
		return list(result)

	@classmethod
	def datetime_range(cls, community_id, cluster_id, unit_id):
		"""community_id および cluster_id で指定したクラスタで実行された融通の作成日時の期間を返す.
		unit_id を指定するとそのユニットが送電側または受電側で参加したもののみに絞る.

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			unit_id (str, optional): ユニット ID

		Returns:
			dict: 融通作成日時の最小値および最大値.
				"min" : 最小値 (datetime)
				"max" : 最大値 (datetime)
		"""
		query = {'communityId':community_id, 'clusterId':cluster_id}
		if unit_id:
			logger.debug('#### unit_id : ' + unit_id)
			query['$or'] = [{'dischargeUnitId':unit_id}, {'chargeUnitId':unit_id}]
		cur = cls.objects.aggregate([{'$match':query}, {'$group':{'_id':None, 'min':{'$min':'$createDateTime'}, 'max':{'$max':'$createDateTime'}}}])
		result = map(pymongo_result_conv, cur)
		result = list(result)
		if result:
			return {'min': result[0]['min'], 'max': result[0]['max']}
		return {}

	@classmethod
	def sum_of_cumulate_amount_whs_by_hour(cls, community_id, cluster_id, unit_id, utcoffset):
		"""community_id および cluster_id で指定したクラスタで実行された融通の時間別融通電力量の集計結果を返す.
		unit_id を指定するとそのユニットが送電側または受電側で参加したもののみに絞る.

		utcoffset で「時間」集計のためのタイムゾーンを指定する.

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			unit_id (str, optional): ユニット ID
			utcoffset (timedelta): UTC からの timedelta

		Returns:
			dict: 融通電力量の時間別集計結果.
				時間 ( "0" 〜 "23" ) : 融通電力量 (float)
		"""
		# sample value for JST : offset_millis = 32400000;
		offset_millis = utcoffset.total_seconds() * 1000
		logger.debug('#### offset_millis : ' + str(offset_millis))
		query = {'communityId':community_id, 'clusterId':cluster_id}
		if unit_id:
			logger.debug('#### unit_id : ' + unit_id)
			query['$or'] = [{'dischargeUnitId':unit_id}, {'chargeUnitId':unit_id}]
		cur = cls.objects.aggregate([{'$match':query}, {'$group': {'_id': {'$hour': {'$add':['$createDateTime', offset_millis]}}, 'sum': {'$sum': '$cumulateAmountWh'}}}])
		result = list(cur)
		return {item['_id']: item['sum'] for item in result}

####

def ensure_indices():
	"""MongoDB のコレクションにインデクスを作成する
	"""
	from pymongo import ASCENDING
	Deal.objects.create_index(
		[('communityId', ASCENDING), ('clusterId', ASCENDING), ('createDateTime', ASCENDING), ('reportTime', ASCENDING)],
		background = True
	)
