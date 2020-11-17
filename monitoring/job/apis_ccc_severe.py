"""apis-ccc エラー監視処理
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
						m = Monitor(community_id, cluster_id)
						result.append(m)
		return result

class Monitor(abstract.Monitor):
	__apis_log_message_not_regex = re.compile('(NO_HANDLERS|TIMEOUT).* apis.GridMaster.data.all')
	def __init__(self, community_id, cluster_id):
		super(Monitor, self).__init__()
		self.community_id = community_id
		self.cluster_id = cluster_id
	def do_monitor(self):
		"""監視処理を実行する
		"""
		date_time_min = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(seconds = self.interval())
		# 実行間隔だけ遡って SEVERE かつ '(NO_HANDLERS|TIMEOUT).* apis.GridMaster.data.all' なログを取得する
		logs = ApisLog.list(self.community_id, self.cluster_id, 'apis-ccc', None, None, {'$gte':date_time_min}, 'SEVERE', None, {'$not':Monitor.__apis_log_message_not_regex})
		count = len(logs)
		# ログがあったら
		if 0 < count:
			# NG
			self.ng(self.community_id, self.cluster_id, 'apis-ccc', None, self.build_severe_description(logs))
			return
		self.ok(self.community_id, self.cluster_id, 'apis-ccc', None)
