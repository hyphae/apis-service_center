"""Django のビューで使われるデコレータクラスを定義

いまのところアクセス制限機能のみ.
"""
from django.http import HttpResponseForbidden, HttpResponseBadRequest
from community.models import Cluster, Unit
from core.models import User

def login_required(a_view):
	"""ログイン中のみ実行を許可する

	不許可なら 403 Forbidden を返す.

	Args:
		a_view (func): ビュー関数
	"""
	def _wrapped_view(request, *args, **kwargs):
		if request.user.is_authenticated:
			return a_view(request, *args, **kwargs)
		else:
			return HttpResponseForbidden('login required')
	return _wrapped_view

####

def staff_required(a_view):
	"""管理者権限を持つユーザのみ実行を許可する

	管理者権限を持つユーザとは is_staff フラグが立っているユーザ.

	不許可なら 403 Forbidden を返す.

	Args:
		a_view (func): ビュー関数
	"""
	def _wrapped_view(request, *args, **kwargs):
		if request.user.is_staff:
			return a_view(request, *args, **kwargs)
		else:
			return HttpResponseForbidden('staff required')
	return login_required(_wrapped_view)

def resident_required(a_view):
	"""居住者権限を持つユーザのみ実行を許可する

	居住者権限を持つユーザとは 1 つ以上の community.Unit と関連づけられたユーザ.

	不許可なら 403 Forbidden を返す.

	Args:
		a_view (func): ビュー関数
	"""
	def _wrapped_view(request, *args, **kwargs):
		if request.user.unit_set.count():
			return a_view(request, *args, **kwargs)
		else:
			return HttpResponseForbidden('resident required')
	return login_required(_wrapped_view)

####

def staff_with_community_cluster_required(a_view):
	"""管理者権限を持つユーザが正しいコミュニティ ID およびクラスタ ID パラメタを送信してきた場合のみ実行を許可する

	URL パラメタとして正しい組み合わせの communityId および clusterId が送信された場合に許可.
	ビュー関数に community_id と cluster_id をキーワード引数で渡す.

	不許可なら 403 Forbidden または 400 Bad Request を返す.

	Args:
		a_view (func): ビュー関数
	"""
	def _wrapped_view(request, *args, **kwargs):
		community_id = request.GET.get('communityId')
		cluster_id = request.GET.get('clusterId')
		if community_id and cluster_id:
			try:
				_cluster = Cluster.get(community_id, cluster_id)
				return a_view(request, *args, **kwargs, community_id = community_id, cluster_id = cluster_id)
			except Cluster.DoesNotExist:
				return HttpResponseBadRequest('bad param values : communityId, clusterId')
		else:
			return HttpResponseBadRequest('no param : communityId, clusterId')
	return staff_required(_wrapped_view)

def resident_with_community_cluster_unit_required(a_view):
	"""居住者権限を持つユーザが正しいコミュニティ ID およびクラスタ ID およびユニット ID パラメタを送信してきた場合のみ実行を許可する

	URL パラメタとして正しい組み合わせの communityId および clusterId および unitId が送信された場合に許可.
	ビュー関数に community_id と cluster_id と unit_id をキーワード引数で渡す.

	不許可なら 403 Forbidden または 400 Bad Request を返す.

	Args:
		a_view (func): ビュー関数
	"""
	def _wrapped_view(request, *args, **kwargs):
		community_id = request.GET.get('communityId')
		cluster_id = request.GET.get('clusterId')
		unit_id = request.GET.get('unitId')
		if community_id and cluster_id and unit_id:
			try:
				_unit = Unit.get(community_id, cluster_id, unit_id)
				if _unit in request.user.unit_set.all():
					return a_view(request, *args, **kwargs, community_id = community_id, cluster_id = cluster_id, unit_id = unit_id)
				else:
					return HttpResponseBadRequest('not a resident')
			except Unit.DoesNotExist:
				return HttpResponseBadRequest('bad param values : communityId, clusterId, unitId')
		else:
			return HttpResponseBadRequest('no param : communityId, clusterId, unitId')
	return resident_required(_wrapped_view)

####

def nosession_community_cluster_unit_required(a_view):
	"""居住者権限を持つユーザの認証情報および正しいコミュニティ ID およびクラスタ ID およびユニット ID パラメタを送信してきた場合のみ実行を許可する

	POST パラメタとして居住者権限を持つユーザの username ( または account ) および password,
	正しい組み合わせの communityId および clusterId および unitId が送信された場合に許可.
	ビュー関数に community_id と cluster_id と unit_id をキーワード引数で渡す.

	不許可なら 403 Forbidden または 400 Bad Request を返す.

	Args:
		a_view (func): ビュー関数
	"""
	def _wrapped_view(request, *args, **kwargs):
		username = request.POST.get('username') or request.POST.get('account')
		password = request.POST.get('password')
		if username and password:
			try:
				user = User.objects.get(username=username)
				if user.is_active and user.check_password(password):
					community_id = request.POST.get('communityId')
					cluster_id = request.POST.get('clusterId')
					unit_id = request.POST.get('unitId')
					if community_id and cluster_id and unit_id:
						try:
							_unit = Unit.get(community_id, cluster_id, unit_id)
							if _unit in user.unit_set.all():
								return a_view(request, *args, **kwargs, community_id = community_id, cluster_id = cluster_id, unit_id = unit_id)
							else:
								return HttpResponseBadRequest('not a resident')
						except Unit.DoesNotExist:
							return HttpResponseBadRequest('bad param values : communityId, clusterId, unitId')
					else:
						return HttpResponseBadRequest('no param : communityId, clusterId, unitId')
				else:
					return HttpResponseForbidden('login failed')
			except User.DoesNotExist:
				return HttpResponseForbidden('login failed')
		else:
			return HttpResponseBadRequest('no param : username/account, password')
	return _wrapped_view
