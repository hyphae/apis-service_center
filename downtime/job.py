"""ダウンタイム集計処理

定期的 ( settings.DOWNTIME.interval_sec ) に起動し, ユニットデータからダウンタイムを生成する.
"""
import logging
import time
from threading import Thread
from django.conf import settings
from community.models import outline as community_outline
from unit_data.models import UnitData
from downtime.models import Downtime, DowntimeStatus
from core.utils import pymongo_no_id_projection, pymongo_result_conv

logger = logging.getLogger(__name__)

def init():
	"""初期化

	新しいスレッドを作成し,
	デーモンモードで loop() を実行する.
	"""
	t = Thread(target = loop, args = (), name = 'downtime.job')
	t.daemon = True
	t.start()

def loop():
	"""無限ループ

	まず settings.DOWNTIME.initial_wait_sec 待ち,
	その後 settings.DOWNTIME.interval_sec ごとに do_all() を無限に実行する.
	"""
	time.sleep(settings.DOWNTIME['initial_wait_sec'])
	while True:
		logger.debug('**** downtime.job begin')
		try:
			do_all()
		except Exception as e:
			handle_exception(e)
		logger.debug('**** downtime.job end')
		time.sleep(settings.DOWNTIME['interval_sec'])

def do_all():
	"""一回の集計処理

	全コミュニティ中の全クラスタに対し,
	新しいスレッドを作成し,
	do_units() を実行する.
	"""
	unit_data_fetch_limit = settings.DOWNTIME['unit_data_fetch_limit']
	data_loss_tolerance_sec = settings.DOWNTIME['data_loss_tolerance_sec']
	logger.debug('**** downtime.job unit_data_fetch_limit : {}'.format(unit_data_fetch_limit))
	logger.debug('**** downtime.job data_loss_tolerance_sec : {}'.format(data_loss_tolerance_sec))
	outline = community_outline()
	threads = []
	for community in outline.get('communities', {}).values():
		for cluster in community.get('clusters', {}).values():
			units = cluster.get('units')
			if units:
				t = Thread(target = do_units, args = (units.values(), unit_data_fetch_limit, data_loss_tolerance_sec), name = 'downtime.job.units')
				t.daemon = False
				threads.append(t)
	for t in threads: t.start()
	for t in threads: t.join()

def do_units(units, unit_data_fetch_limit, data_loss_tolerance_sec):
	"""一つのクラスタに対する集計処理

	クラスタ中の全ユニットに対し,
	do_unit() を実行する.

	Args:
		units (list): クラスタ中のユニットのリスト
		unit_data_fetch_limit (int): 一度の処理で取得するユニットデータの件数の上限
		data_loss_tolerance_sec (int): データロス判定の秒数
	"""
	for unit in units:
		community_id = unit.get('communityId')
		cluster_id = unit.get('clusterId')
		unit_id = unit.get('id')
		do_unit(community_id, cluster_id, unit_id, unit_data_fetch_limit, data_loss_tolerance_sec)

def do_unit(community_id, cluster_id, unit_id, unit_data_fetch_limit, data_loss_tolerance_sec):
	"""一つのユニットに対する集計処理

	指定されたコミュニティ/クラスタ/ユニット ID でユニットデータを取得し,
	time および apis.operation_mode.effective 属性から,
	データロスおよびダウンか否か判定し,
	適宜ダウンタイムを作成, 更新していく.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
		unit_data_fetch_limit (int): 一度の処理で取得するユニットデータの件数の上限
		data_loss_tolerance_sec (int): データロス判定秒数
	"""
	last_time = get_last_time(community_id, cluster_id, unit_id)
	active_down_datetime = get_active_down_datetime(community_id, cluster_id, unit_id)
	unit_data_cur = find_unit_data(community_id, cluster_id, unit_id, last_time)
	logger.debug('#### {} > {} > {} : {} : {}'.format(community_id, cluster_id, unit_id, last_time, unit_data_cur.count()))
	for unit_data in unit_data_cur[:unit_data_fetch_limit]:
		unit_data = pymongo_result_conv(unit_data)
		the_time = unit_data.get('time')
		if not the_time:
			logger.error('no “time” field : {}'.format(unit_data))
			continue
		the_operation_mode = unit_data.get('apis', {}).get('operation_mode', {}).get('effective')
		is_dataloss = False
		is_down = False
		# 一つ前のユニットデータからデータロス判定秒数より長く空いている ?
		if last_time and data_loss_tolerance_sec <= (the_time.timestamp() - last_time.timestamp()):
			# データロス判定
			is_dataloss = True
		# 動作モードが autonomous ( 自動融通 ) ではない ?
		if the_operation_mode != 'autonomous':
			# ダウン
			is_down = True
		# データロス ? ダウン ?
		if is_dataloss or is_down:
			# アクティブなダウンタイムが存在しない ?
			if not active_down_datetime:
				if is_dataloss: logger.debug('#### {} : {} > {} > {} : data loss'.format(the_time, community_id, cluster_id, unit_id))
				if is_down: logger.debug('#### {} : {} > {} > {} : down ( {} )'.format(the_time, community_id, cluster_id, unit_id, the_operation_mode))
				# データロスなら一つ前の time, そうではない ( ダウン ) ならこの time をダウンタイムの開始日時とする
				active_down_datetime = last_time if is_dataloss else the_time
				# ダウンタイムを作成する
				save_active_down_datetime(community_id, cluster_id, unit_id, active_down_datetime)
		# ダウンではない ?
		if not is_down:
			# アクティブなダウンタイムが存在する ?
			if active_down_datetime:
				logger.debug('#### {} : {} > {} > {} : up'.format(the_time, community_id, cluster_id, unit_id))
				# ダウンタイムを終了させる
				save_recovery_datetime(community_id, cluster_id, unit_id, active_down_datetime, the_time)
				active_down_datetime = None
		last_time = the_time
		# 処理ステータスを保存する
		save_last_time(community_id, cluster_id, unit_id, last_time)



def find_unit_data(community_id, cluster_id, unit_id, last_time):
	"""ユニットデータを取得する

	last_time が指定されていれば, time 属性が last_time より大きいものに絞る.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
		last_time (datetime, optional): 最後に処理したユニットデータの time 値

	Returns:
		Cursor: 検索結果カーソル
	"""
	query = {'oesunit.communityId':community_id, 'oesunit.clusterId':cluster_id, 'oesunit.id':unit_id}
	if last_time: query['time'] = {'$gt':last_time}
	return UnitData.objects.find(query, projection = ['time', 'apis.operation_mode.effective']).sort('time')


def get_last_time(community_id, cluster_id, unit_id):
	"""最後に処理したユニットデータの time 値を取得する

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID

	Returns:
		datetime: 最後に処理したユニットデータの time 値
		None: if not exists
	"""
	query = {'communityId':community_id, 'clusterId':cluster_id, 'unitId':unit_id}
	result = DowntimeStatus.objects.find_one(query, projection = ['lastTime'])
	return pymongo_result_conv(result.get('lastTime')) if result else None

def save_last_time(community_id, cluster_id, unit_id, value):
	"""最後に処理したユニットデータの time 値を保存する

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
		value (datetime): 最後に処理したユニットデータの time 値
	"""
	query = {'communityId':community_id, 'clusterId':cluster_id, 'unitId':unit_id}
	# 最後の引数 upsert フラグが True : query を満たすドキュメントが無ければ作る
	DowntimeStatus.objects.update_one(query, {'$set':{'lastTime':value}}, True)


def get_active_down_datetime(community_id, cluster_id, unit_id):
	"""アクティブなダウンタイムを取得する

	アクティブとは recoveryDateTime を持たないこと.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID

	Returns:
		datetime: アクティブなダウンタイム ( ユニットデータの time 値 )
		None: if not exists
	"""
	query = {'communityId':community_id, 'clusterId':cluster_id, 'unitId':unit_id, 'recoveryDateTime':None}
	result = Downtime.objects.find_one(query, projection = ['downDateTime'])
	return pymongo_result_conv(result.get('downDateTime')) if result else None

def save_active_down_datetime(community_id, cluster_id, unit_id, value):
	"""アクティブなダウンタイムを保存する

	アクティブとは recoveryDateTime を持たないこと.
	アクティブなダウンタイム情報がなければ作り, あれば更新する.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
		value (datetime): アクティブなダウンタイム ( ユニットデータの time 値 )
	"""
	query = {'communityId':community_id, 'clusterId':cluster_id, 'unitId':unit_id, 'recoveryDateTime':None}
	# 最後の引数 upsert フラグが True : query を満たすドキュメントが無ければ作る
	Downtime.objects.update_one(query, {'$set':{'downDateTime':value}}, True)

def save_recovery_datetime(community_id, cluster_id, unit_id, down_datetime, value):
	"""アクティブなダウンタイムを終了させる

	アクティブとは recoveryDateTime を持たないこと.
	recoveryDateTime を保存することで終了させる.
	アクティブなダウンタイム情報がなければ何も起きない.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
		down_datetime (datetime): ダウンタイムの開始日時
		value (datetime): ダウンタイムの終了日時
	"""
	query = {'communityId':community_id, 'clusterId':cluster_id, 'unitId':unit_id, 'downDateTime':down_datetime, 'recoveryDateTime':None}
	# 最後の引数 upsert フラグが False : query を満たすドキュメントが無ければ何もしない
	Downtime.objects.update_one(query, {'$set':{'recoveryDateTime':value}}, False)



def handle_exception(exception):
	"""例外処理

	とりあえずログにエラーを出力するだけ.

	Args:
		exception (exception): 処理対象の例外
	"""
	import traceback
	logger.error(traceback.format_exc())
