"""障害監視処理の各種設定を取得する関数群
"""
import logging
from django.conf import settings
from monitoring.models import CommunitySetting, JobSetting

logger = logging.getLogger(__name__)

def initial_wait_sec(type):
	"""指定した種類の処理における初期待機時間を取得する

	現状は種類によらず settings.MONITORING.initial_wait_sec を返す.

	Args:
		type (str): 処理の種類

	Returns:
		int: 初期待機時間
	"""
	return settings.MONITORING['initial_wait_sec']

def interval_sec(type):
	"""指定した種類の処理における実行間隔を取得する

	settings.MONITORING.interval_sec.type を返す.

	Args:
		type (str): 処理の種類

	Returns:
		int: 実行間隔
	"""
	return settings.MONITORING['interval_sec'][type]

def thread_blocking_limit_msec(type):
	"""Vert.x のスレッドブロック時間の上限値を取得する

	alive 系の監視処理でスレッドブロックのログを監視し,
	一定時間以上ブロックされていたら障害と判定する.
	その判定で使用するブロック時間の上限値.

	現状は種類によらず settings.MONITORING.thread_blocking_limit_msec を返す.

	Args:
		type (str): 処理の種類

	Returns:
		int: スレッドブロック時間の上限値
	"""
	return settings.MONITORING['thread_blocking_limit_msec']

def is_active(community_id, cluster_id, type):
	"""指定した処理が有効か否かを取得する

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		type (str): 処理の種類

	Returns:
		bool: 有効フラグ
		False: if not exists
	"""
	return JobSetting.check_is_active(community_id, cluster_id, type)

def notify_from(community_id, cluster_id, type):
	"""障害の検知および終了通知の送信元アドレスを取得する

	現状は種類によらず settings.MONITORING.notify_from を返す.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		type (str): 処理の種類

	Returns:
		str: 送信元アドレス
	"""
	return settings.MONITORING['notify_from']

def notify_to(community_id, cluster_id, type):
	"""障害の検知および終了通知の宛先アドレスを取得する

	現状は種類によらずコミュニティごとに設定可能である.
	設定がなければ settings.MONITORING.default_notify_to を返す.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		type (str): 処理の種類

	Returns:
		str: 宛先アドレス
	"""
	result = CommunitySetting.check_notify_to(community_id)
	return result if result else settings.MONITORING['default_notify_to']

####

def handle_exception(exception):
	"""例外処理

	とりあえずログにエラーを出力するだけ.

	Args:
		exception (exception): 処理対象の例外
	"""
	import traceback
	logger.error(traceback.format_exc())
