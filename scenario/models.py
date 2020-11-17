from django.db import models
from django.db.models import Q
import django.utils.timezone

# Create your models here.

class Scenario(models.Model):
	"""シナリオを表すモデル
	"""
	community_id = models.CharField(blank=True, max_length=128, null=True)
	"""str, optional: コミュニティ ID"""
	cluster_id = models.CharField(blank=True, max_length=128, null=True)
	"""str, optional: クラスタ ID"""
	unit_id = models.CharField(blank=True, max_length=128, null=True)
	"""str, optional: ユニット ID"""
	created = models.DateTimeField(default=django.utils.timezone.now)
	"""datetime: 作成日時"""
	name = models.CharField(max_length=128)
	"""str: 名前"""
	description = models.TextField(blank=True, null=True)
	"""str, optional: 説明"""
	data = models.TextField(blank=True, null=True)
	"""str, optional: シナリオ JSON 文字列"""
	class Meta:
		unique_together = ['community_id', 'cluster_id', 'unit_id', 'name']

	def __str__(self):
		return self.name

	@classmethod
	def available_list(cls, community_id, cluster_id, unit_id):
		"""指定したユニットが参照可能なシナリオを取得する

		あるユニットが参照可能なシナリオとは,
		- community_id, cluster_id, unit_id すべて None
		- community_id がユニットの community_id と一致し, cluster_id, unit_id が None
		- community_id と cluster_id がユニットと一致し, unit_id が None
		- community_id, cluster_id, unit_id 全てユニットと一致
		のいずれか.

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			unit_id (str): ユニット ID

		Returns:
			list: シナリオのリスト
		"""
		qs = cls.objects.filter(
			Q(community_id=None,         cluster_id=None,       unit_id=None) |
			Q(community_id=community_id, cluster_id=None,       unit_id=None) |
			Q(community_id=community_id, cluster_id=cluster_id, unit_id=None) |
			Q(community_id=community_id, cluster_id=cluster_id, unit_id=unit_id)
		).order_by('name')
		return list(qs)

	@classmethod
	def get(cls, community_id, cluster_id, unit_id, name):
		return cls.objects.get(community_id=community_id, cluster_id=cluster_id, unit_id=unit_id, name=name)

class Choice(models.Model):
	"""ユニットのシナリオ選択状態を表すモデル
	"""
	community_id = models.CharField(max_length=128)
	"""str: コミュニティ ID"""
	cluster_id = models.CharField(max_length=128)
	"""str: クラスタ ID"""
	unit_id = models.CharField(max_length=128)
	"""str: ユニット ID"""
	created = models.DateTimeField(default=django.utils.timezone.now)
	"""datetime: 作成日時"""
	scenario = models.ForeignKey(Scenario, blank=True, null=True, on_delete=models.SET_NULL)
	"""Scenario, optional: 選択シナリオ"""

	def __str__(self):
		return self.scenario.name if self.scenario else ''

	@classmethod
	def current(cls, community_id, cluster_id, unit_id):
		"""ユニットの最新の選択状態を返す.

		Args:
			community_id (str): コミュニティ ID
			cluster_id (str): クラスタ ID
			unit_id (str): ユニット ID

		Returns:
			Choice: 最新の選択状態
			None: if not exists
		"""
		qs = cls.objects.filter(community_id=community_id).filter(cluster_id=cluster_id).filter(unit_id=unit_id).order_by('created').reverse()
		return qs.first()
