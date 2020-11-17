"""障害監視処理の抽象クラス定義
"""
import time
import logging
import re
from abc import ABCMeta, abstractmethod
from threading import Thread
import django.utils.timezone
import django.core.mail
from monitoring.models import Failure
from . import config

logger = logging.getLogger(__name__)

class Invoker(Thread, metaclass=ABCMeta):
	"""常駐し処理を定期的に実行するクラスの抽象クラス

	Thread を継承しており独立したスレッドとして実行される.
	"""
	@classmethod
	def type(cls):
		"""処理の種類を返す

		Returns:
			str: 処理の種類
		"""
		return cls.__module__.rsplit('.', maxsplit=1)[-1]
	def __init__(self):
		"""コンストラクタ

		自身をデーモンスレッドにする.
		"""
		super(Invoker, self).__init__()
		self.setDaemon(True)
	def run(self):
		"""スレッドの実処理

		まず初期待機時間待ち,
		その後実行間隔ごとに do_invoke() を無限に実行する.
		"""
		time.sleep(config.initial_wait_sec(self.type()))
		while True:
			logger.debug('**** Invoker({}) begin'.format(self.type()))
			try:
				self.do_invoke()
			except Exception as e:
				config.handle_exception(e)
			logger.debug('**** Invoker({}) end'.format(self.type()))
			time.sleep(config.interval_sec(self.type()))
	def do_invoke(self):
		"""一回の監視処理

		サブクラスにモニタのリストを作成させ,
		モニタを実行する.
		Monitor は Thread を継承しており,
		独立したスレッドで動作する.

		自身は全てのモニタ処理が終わるまで待つ.
		"""
		monitors = self.create_monitors()
		for monitor in monitors: monitor.start()
		for monitor in monitors: monitor.join()
	@abstractmethod
	def create_monitors(self):
		"""モニタのリストを作成する

		Raises:
			NotImplementedError: 実処理はサブクラスで実装
		"""
		raise NotImplementedError()

class Monitor(Thread, metaclass=ABCMeta):
	"""具体的な監視処理を実行するクラスの抽象クラス

	Thread を継承しており独立したスレッドとして実行される.
	"""
	__message_has_been_blocked_ms_regex = re.compile(' has been blocked for (\d+) ms')
	@classmethod
	def type(cls):
		"""処理の種類を返す

		Returns:
			str: 処理の種類
		"""
		return cls.__module__.rsplit('.', maxsplit=1)[-1]
	def __init__(self):
		"""コンストラクタ
		"""
		super(Monitor, self).__init__()
		self.__interval = config.interval_sec(self.type())
		self.setDaemon(False)
	def interval(self):
		"""実行間隔を返す.

		Returns:
			int: 実行間隔
		"""
		return self.__interval
	def run(self):
		"""スレッドの実処理

		do_monitor() を実行する.
		"""
		logger.debug('**** Monitor({}) begin'.format(self.type()))
		try:
			self.do_monitor()
		except Exception as e:
			config.handle_exception(e)
		logger.debug('**** Monitor({}) end'.format(self.type()))
	def ok(self, community_id, cluster_id, program_id, unit_id):
		"""監視結果が OK だった場合の処理を実行

		Args:
			community_id (str, optional): コミュニティ ID
			cluster_id (str, optional): クラスタ ID
			program_id (str, optional): プログラム ID
			unit_id (str, optional): ユニット ID
		"""
		logger.debug('**** Monitor({}) {} > {} > {} > {} : OK'.format(self.type(), community_id, cluster_id, program_id, unit_id))
		try:
			# アクティブな障害があれば ?
			f = Failure.get_open(self.type(), community_id, cluster_id, program_id, unit_id)
			# 終了させ
			f.close().save()
			# 通知する
			Notifier(f).start()
		except Failure.DoesNotExist:
			# アクティブな障害がなければ ?
			# 何もしない
			pass
	def ng(self, community_id, cluster_id, program_id, unit_id, error):
		"""監視処理が NG だった場合の処理

		Args:
			community_id (str, optional): コミュニティ ID
			cluster_id (str, optional): クラスタ ID
			program_id (str, optional): プログラム ID
			unit_id (str, optional): ユニット ID
			error (str, optional): 内容
		"""
		logger.debug('**** Monitor({}) {} > {} > {} > {} : NG : {}'.format(self.type(), community_id, cluster_id, program_id, unit_id, error))
		try:
			# アクティブな障害があれば ?
			f = Failure.get_open(self.type(), community_id, cluster_id, program_id, unit_id)
			# 何もしない
		except Failure.DoesNotExist:
			# アクティブな障害がなければ ?
			# 障害を作り
			f = Failure(type=self.type(), community_id=community_id, cluster_id=cluster_id, program_id=program_id, unit_id=unit_id, description=error)
			f.save()
			# 通知する
			Notifier(f).start()
	def is_too_long_blocking_time(self, logs):
		"""Vert.x のスレッドブロックを障害と判定するか

		Args:
			logs (list): ログのリスト

		Returns:
			bool: 障害フラグ
			False: if not exists
		"""
		limit = config.thread_blocking_limit_msec(self.type())
		for log in logs:
			message = log.get('message', '')
			# スレッドブロックのログを探し
			match = re.search(Monitor.__message_has_been_blocked_ms_regex, message)
			if match:
				# ブロック時間を抜き出し
				ms = int(match.groups()[0])
				logger.debug('#### thread has been blocked for : {} ms'.format(ms))
				# 上限値を超えていれば
				if limit < ms:
					# 障害判定
					return True
		return False
	def process_severe_log(self, log):
		"""ログのメッセージを必要に応じてわかりやすくする

		APIS の正規のログ出力の仕組みではないところからもログが出力される.
		出どころがわかるものについて, ヒントを message に挿入する.

		Args:
			log (dict): ログ

		Returns:
			dict: 修正済みログ
		"""
		date_time = django.utils.timezone.localtime(log['datetime']) if log.get('datetime') else ''
		message = log.get('message')
		loggername = log.get('loggername', '')
		if loggername:
			# logger 名が com.hazelcast. で始まっている ?
			if loggername.startswith('com.hazelcast.'):
				# クラスタリングまわりの障害であることがわかるような文字列を message に挿入する
				message = 'Clustering Manager failure ; ' + message
			# logger 名が io.vertx. で始まっている ?
			elif loggername.startswith('io.vertx.'):
				# Vert.x まわりの障害であることがわかるような文字列を message に挿入する
				message = 'Vert.x failure ; ' + message
		return '[{}] {}'.format(date_time, message)
	def build_severe_description(self, logs):
		"""障害情報の内容を生成する

		Args:
			logs (list): ログのリスト

		Returns:
			str: 内容文字列
		"""
		lines = ['There seems to be a problem.', '']
		logs.sort(key = lambda l: l['datetime'].timestamp() if l.get('datetime') else 0)
		for log in logs:
			line = self.process_severe_log(log)
			if line:
				lines.append(line)
		return '\n'.join(lines)
	@abstractmethod
	def do_monitor(self):
		"""具体的な監視処理を実行する

		Raises:
			NotImplementedError: 実処理はサブクラスで実装
		"""
		raise NotImplementedError()

class Notifier(Thread):
	"""障害の検知/終了を通知するクラス

	Thread を継承しており独立したスレッドとして実行される.
	"""
	def __init__(self, failure):
		"""コンストラクタ

		Args:
			failure (Failure): 通知対象の障害
		"""
		super(Notifier, self).__init__()
		self.failure = failure
		self.setDaemon(False)
	def run(self):
		"""スレッドの実処理

		From, To, Subject, 本文を生成し, メールを送信する.
		"""
		f = self.failure
		status = 'closed' if f.closed else 'detected'
		idents = []
		if f.community_id: idents.append(f.community_id)
		if f.cluster_id: idents.append(f.cluster_id)
		if f.program_id: idents.append(f.program_id)
		if f.unit_id: idents.append(f.unit_id)
		ident = ' > '.join(idents)
		subject = '[{}] failure {} : {}'.format(f.type, status, ident)
		messages = ['failure {}'.format(status)]
		messages.append('')
		messages.append('type: {}'.format(f.type))
		if f.community_id: messages.append('communityId : {}'.format(f.community_id))
		if f.cluster_id: messages.append('clusterId: {}'.format(f.cluster_id))
		if f.program_id: messages.append('programId: {}'.format(f.program_id))
		if f.unit_id: messages.append('unitId: {}'.format(f.unit_id))
		if f.detected: messages.append('detected: {}'.format(django.utils.timezone.localtime(f.detected)))
		if f.closed: messages.append('closed: {}'.format(django.utils.timezone.localtime(f.closed)))
		messages.append('')
		messages.append(f.description)
		message = '\n'.join(messages)
		notify_from = config.notify_from(f.community_id, f.cluster_id, f.type)
		notify_to_list = [config.notify_to(f.community_id, f.cluster_id, f.type)]
		django.core.mail.send_mail(subject, message, notify_from, notify_to_list, fail_silently=False)
