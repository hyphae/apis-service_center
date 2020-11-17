"""apis-main エラー監視処理
"""
import datetime, re
from community.models import outline as community_outline
from apis_log.models import ApisLog
from . import abstract, config

class Invoker(abstract.Invoker):
	def __init__(self):
		super(Invoker, self).__init__()
	def create_monitors(self):
		"""モニタのリストを作成する

		Returns:
			list: モニタのリスト
		"""
		# 現在日時でのコミュニティ階層構造を取得する
		outline = community_outline(datetime.datetime.now(datetime.timezone.utc))
		result = []
		# コミュニティごとに
		for community in outline.get('communities', {}).values():
			# クラスタごとに
			for cluster in community.get('clusters', {}).values():
				community_id = community.get('id')
				cluster_id = cluster.get('id')
				# 有効 ?
				if config.is_active(community_id, cluster_id, self.type()):
					units = cluster.get('units')
					# ユニットが 1 つ以上定義されている ?
					if units:
						# モニタを作成しリストに追加
						m = Monitor(community_id, cluster_id, units.values())
						result.append(m)
		return result

class Monitor(abstract.Monitor):
	__apis_main_message_remove_stack_trace_element_regex = re.compile('(^.*)(?: \[.*\]$)')
	def __init__(self, community_id, cluster_id, units):
		super(Monitor, self).__init__()
		self.community_id = community_id
		self.cluster_id = cluster_id
		self.units = units
	def do_monitor(self):
		"""監視処理を実行する
		"""
		# ユニットごとに
		for unit in self.units:
			self.do_monitor_one(unit.get('id'))
	def do_monitor_one(self, unit_id):
		"""ユニットごとに監視処理を実行する

		Args:
			unit_id (str): ユニット ID
		"""
		date_time_min = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds = self.interval())
		# 実行間隔だけ遡って SEVERE ログを取得する
		logs = ApisLog.list(self.community_id, self.cluster_id, 'apis-main', unit_id, None, {'$gte':date_time_min}, 'SEVERE', None, None)
		count = len(logs)
		# ログがあったら
		if 0 < count:
			# NG
			self.ng(self.community_id, self.cluster_id, 'apis-main', unit_id, self.build_severe_description(logs))
			return
		self.ok(self.community_id, self.cluster_id, 'apis-main', unit_id)
	def process_severe_log(self, log):
		"""ログのメッセージを必要に応じてわかりやすくする

		apis-main のログ出力の仕組みで出たログにはスタックトレースの最後の要素が追加されている.
		開発者以外にとっては意味不明なので取り除く.

		apis-main 専用処理のためオーバライドしており,
		処理の最後に親関数を呼ぶ.

		Args:
			log (dict): ログ

		Returns:
			dict: 修正済みログ
		"""
		message = log.get('message', '')
		match = re.fullmatch(Monitor.__apis_main_message_remove_stack_trace_element_regex, message)
		if match:
			log['message'] = match.groups()[0]
		# 親クラスの process_severe_log() を実行する
		return super().process_severe_log(log)
