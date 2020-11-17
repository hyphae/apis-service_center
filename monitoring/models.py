from django.db import models
import django.utils.timezone
from django.conf import settings

# Create your models here.

class Failure(models.Model):
	"""障害を表すモデル
	"""
	type = models.CharField(max_length=128)
	"""str: 監視処理の種類"""
	community_id = models.CharField(blank=True, max_length=128, null=True)
	"""str, optional: コミュニティ ID"""
	cluster_id = models.CharField(blank=True, max_length=128, null=True)
	"""str, optional: クラスタ ID"""
	program_id = models.CharField(blank=True, max_length=128, null=True)
	"""str, optional: プログラム ID"""
	unit_id = models.CharField(blank=True, max_length=128, null=True)
	"""str, optional: ユニット ID"""
	detected = models.DateTimeField(default=django.utils.timezone.now)
	"""datetime: 検知日時"""
	closed = models.DateTimeField(blank=True, null=True)
	"""datetime, optional: 終了日時"""
	description = models.TextField(blank=True, null=True)
	"""str, optional: 内容"""
	class Meta:
		indexes = [
			models.Index(fields=['community_id', 'cluster_id', 'type', 'program_id', 'unit_id', 'detected', 'closed']),
		]

	def __str__(self):
		idents = []
		if self.community_id: idents.append(self.community_id)
		if self.cluster_id: idents.append(self.cluster_id)
		if self.program_id: idents.append(self.program_id)
		if self.unit_id: idents.append(self.unit_id)
		ident = ' > '.join(idents)
		detected = django.utils.timezone.localtime(self.detected) if self.detected else ''
		closed = django.utils.timezone.localtime(self.closed) if self.closed else ''
		return '[{}] {} ( {} - {} )'.format(self.type, ident, detected, closed)

	def close(self):
		"""障害を終了させる

		Returns:
			Failure: 自分自身
		"""
		self.closed = django.utils.timezone.now()
		return self

	@classmethod
	def get_open(cls, type, community_id, cluster_id, program_id, unit_id):
		"""指定した条件でアクティブな障害を取得する

		同一の条件でアクティブな障害は 0 または 1 であるはず.

		Args:
			type (str): 監視処理の種類
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			program_id (str): プログラム ID
			unit_id (str): ユニット ID

		Returns:
			Failure: アクティブな障害
			None: if not exists
		"""
		return cls.objects.get(type=type, community_id=community_id, cluster_id=cluster_id, program_id=program_id, unit_id=unit_id, closed=None)

	@classmethod
	def open_list(cls, community_id, cluster_id):
		"""指定したクラスタでアクティブな障害を取得する

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID

		Returns:
			list: アクティブな障害のリスト
		"""
		qs = cls.objects.filter(closed=None).filter(community_id=community_id).filter(cluster_id=cluster_id)
		return list(qs)

	@classmethod
	def list(cls, community_id, cluster_id, datetime_from, datetime_to):
		"""指定したクラスタで発生した障害を取得する

		datetime_from および datetime_to により日時で絞る.
		その際 datetime_form はその値を含み ( closed == null or datetime_from <= closed ),
		datetime_to は含まない ( detected == null or detected < datetime_to ) .

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			datetime_from (datetime, optional): 検索対象日時下限 ( 以上 )
			datetime_to (datetime, optional): 検索対象日時上限 ( 未満 )

		Returns:
			[type]: [description]
		"""
		qs = cls.objects.filter(community_id=community_id).filter(cluster_id=cluster_id)
		if datetime_from: qs = qs.filter(models.Q(closed=None) | models.Q(closed__gte=datetime_from))
		if datetime_to: qs = qs.filter(models.Q(detected=None) | models.Q(detected__lt=datetime_to))
		return list(qs)

class CommunitySetting(models.Model):
	"""コミュニティ単位での設定を表すモデル
	"""
	community_id = models.CharField(max_length=128, unique=True)
	"""str: コミュニティ ID"""
	notify_to = models.EmailField(max_length=254, default=settings.MONITORING['default_notify_to'])
	"""str: 障害開始および終了通知の宛先アドレス"""

	def __str__(self):
		return '{} - {}'.format(self.community_id, self.notify_to)

	@classmethod
	def check_notify_to(cls, community_id):
		"""障害開始および終了通知の宛先アドレスを取得する

		Args:
			community_id (str): コミュニティ ID

		Returns:
			str: 宛先アドレス
			None: if not exists
		"""
		qs = cls.objects.filter(community_id=community_id)
		return qs[0].notify_to if 0 < len(qs) else None

class JobSetting(models.Model):
	"""クラスタ単位で監視処理別の設定を表すモデル
	"""
	community_id = models.CharField(max_length=128)
	"""str: コミュニティ ID"""
	cluster_id = models.CharField(max_length=128)
	"""str: クラスタ ID"""
	type = models.CharField(max_length=128)
	"""str: 監視処理の種類"""
	is_active = models.BooleanField(default=True)
	"""bool: 有効フラグ"""
	class Meta:
		unique_together = ['community_id', 'cluster_id', 'type']

	def __str__(self):
		return '[{}] {} > {} : {}'.format(self.type, self.community_id, self.cluster_id, 'active' if self.is_active else 'inactive')

	@classmethod
	def check_is_active(cls, community_id, cluster_id, type):
		"""監視処理が有効か否か取得する

		設定がなければ False と判定する.

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			type (str): 監視処理の種類

		Returns:
			bool: 有効フラグ
			False: if not exists
		"""
		qs = cls.objects.filter(community_id=community_id).filter(cluster_id=cluster_id).filter(type=type)
		return qs[0].is_active if 0 < len(qs) else False

	@classmethod
	def list(cls, community_id, cluster_id):
		"""指定したクラスタでの監視設定リストを返す

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID

		Returns:
			list: JobSetting のリスト
		"""
		qs = cls.objects.filter(community_id=community_id).filter(cluster_id=cluster_id)
		return list(qs)

	@classmethod
	def get(cls, community_id, cluster_id, type):
		"""指定したクラスタおよび種類の設定を返す

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			type (str): 監視処理の種類

		Returns:
			JobSetting: 設定
		"""
		return cls.objects.get(community_id=community_id, cluster_id=cluster_id, type=type)
