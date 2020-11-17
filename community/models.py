from django.db import models

# Create your models here.

class Community(models.Model):
	"""コミュニティを表すモデル
	"""
	code = models.CharField(max_length=128, unique=True)
	"""str: コミュニティ ID ( id としたいところだが Django ではややこしすぎる )"""
	name = models.CharField(max_length=128)
	"""str: コミュニティ名"""
	class Meta:
		verbose_name_plural = 'communities'

	def __str__(self):
		return self.name

	@classmethod
	def get(cls, code):
		"""コミュニティ ID で取得する

		Args:
			code (str): コミュニティ ID

		Returns:
			Community: コミュニティ

		Raises:
			Community.DoesNotExist: 存在しない場合に発生
		"""
		return cls.objects.get(code=code)

class Cluster(models.Model):
	"""クラスタを表すモデル
	"""
	community = models.ForeignKey(Community, on_delete=models.PROTECT)
	"""Community: コミュニティ"""
	code = models.CharField(max_length=128)
	"""str: クラスタ ID ( id としたいところだが Django ではややこしすぎる )"""
	name = models.CharField(max_length=128)
	"""str: クラスタ名"""
	class Meta:
		unique_together = ['community', 'code']

	def __str__(self):
		return '{} > {}'.format(self.community.name, self.name)

	@classmethod
	def get(cls, community_code, code):
		"""コミュニティ ID とクラスタ ID で取得する

		Args:
			community_code (str): コミュニティ ID
			code (str): クラスタ ID

		Returns:
			Cluster: クラスタ

		Raises:
			Cluster.DoesNotExist: 存在しない場合に発生
		"""
		return cls.objects.get(community__code=community_code, code=code)

class Unit(models.Model):
	"""ユニットを表すモデル
	"""
	cluster = models.ForeignKey(Cluster, on_delete=models.PROTECT)
	"""Cluster: クラスタ"""
	code = models.CharField(max_length=128)
	"""str: ユニット ID ( id としたいところだが Django ではややこしすぎる )"""
	name = models.CharField(max_length=128)
	"""str: ユニット名"""
	available_from = models.DateTimeField(blank=True, null=True)
	"""datetime: 有効期間 ( 開始 )"""
	available_to = models.DateTimeField(blank=True, null=True)
	"""datetime: 有効期間 ( 終了 )"""
	users = models.ManyToManyField('core.User', blank=True)
	"""list of core.User: 居住者 ( 多対多 )"""
	class Meta:
		unique_together = ['cluster', 'code']

	def __str__(self):
		return '{} > {} > {}'.format(self.cluster.community.name, self.cluster.name, self.name)

	@classmethod
	def get(cls, community_code, cluster_code, code):
		"""コミュニティ ID とクラスタ ID とユニット ID で取得する

		Args:
			community_code (str): コミュニティ ID
			cluster_code (str): クラスタ ID
			code (str): ユニット ID

		Returns:
			Unit: ユニット

		Raises:
			Unit.DoesNotExist: 存在しない場合に発生
		"""
		return cls.objects.get(cluster__community__code=community_code, cluster__code=cluster_code, code=code)

####

def outline(asof=None):
	"""指定した日時でのコミュニティ/クラスタ/ユニット階層構造を取得する

	Args:
		asof (datetime, optional): 指定すれば有効期間外のユニットを含めない. Defaults to None.

	Returns:
		dict: コミュニティ/クラスタ/ユニットの階層構造
	"""
	communities_dict = dict()
	community_cur = Community.objects.all().order_by('code')
	for community in community_cur:
		clusters_dict = dict()
		cluster_cur = community.cluster_set.order_by('code')
		for cluster in cluster_cur:
			units_dict = dict()
			unit_cur = cluster.unit_set.order_by('code')
			for unit in unit_cur:
				if asof:
					if unit.available_from and asof < unit.available_from: continue
					if unit.available_to and unit.available_to <= asof: continue
				units_dict[unit.code] = {
					'communityId': community.code,
					'clusterId': cluster.code,
					'id': unit.code,
					'name': unit.name,
					'available_from': unit.available_from,
					'available_to': unit.available_to,
				}
			clusters_dict[cluster.code] = {
				'communityId': community.code,
				'id': cluster.code,
				'name': cluster.name,
				'units': units_dict,
			}
		communities_dict[community.code] = {
			'id': community.code,
			'name': community.name,
			'clusters': clusters_dict,
		}
	outline_dict = {
		'communities': communities_dict,
	}
	return outline_dict

def resident_outline(user):
	"""指定したユーザから見えるコミュニティ/クラスタ/ユニットの階層構造を取得する

	Args:
		user (core.User): ユーザ

	Returns:
		dict: コミュニティ/クラスタ/ユニットの階層構造
	"""
	communities_dict = dict()
	for unit in user.unit_set.all():
		cluster = unit.cluster
		community = cluster.community
		community_dict = communities_dict.get(community.code)
		if not community_dict:
			community_dict = {
				'id': community.code,
				'name': community.name,
				'clusters': dict(),
			}
			communities_dict[community.code] = community_dict
		cluster_dict = community_dict['clusters'].get(cluster.code)
		if not cluster_dict:
			cluster_dict = {
				'communityId': community.code,
				'id': cluster.code,
				'name': cluster.name,
				'units': dict(),
			}
			community_dict['clusters'][cluster.code] = cluster_dict
		cluster_dict['units'][unit.code] = {
			'communityId': community.code,
			'clusterId': cluster.code,
			'id': unit.code,
			'name': unit.name,
			'available_from': unit.available_from,
			'available_to': unit.available_to,
		}
	outline_dict = {
		'communities': communities_dict,
	}
	return outline_dict
