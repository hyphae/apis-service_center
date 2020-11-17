from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest, HttpResponseServerError
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
from django.forms.models import model_to_dict
import logging
from core.decorators import staff_with_community_cluster_required
from core.utils import parse_iso8601_extended
from community.models import Cluster
from .models import Failure, JobSetting
from . import job

logger = logging.getLogger(__name__)

# Create your views here.

@never_cache
@require_GET
@staff_with_community_cluster_required
def failure_open_list(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタでアクティブな障害情報を JSON 配列で返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	result = Failure.open_list(community_id, cluster_id)
	logger.debug('#### data size : ' + str(len(result)))
	result = [model_to_dict(elm) for elm in result]
	return JsonResponse(result, safe=False)

@never_cache
@require_GET
@staff_with_community_cluster_required
def failure_list(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタの障害情報を JSON 配列で返す

	datetimeFrom および datetimeTo で期間を絞る.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	try:
		datetime_from = parse_iso8601_extended(request.GET.get('datetimeFrom'))
		datetime_to = parse_iso8601_extended(request.GET.get('datetimeTo'))
		if datetime_from and datetime_to and datetime_to <= datetime_from:
			return HttpResponseBadRequest('“datetimeTo” should be greater than “datetimeFrom”')
		result = Failure.list(community_id, cluster_id, datetime_from, datetime_to)
		logger.debug('#### data size : ' + str(len(result)))
		result = [model_to_dict(elm) for elm in result]
		return JsonResponse(result, safe=False)
	except Exception as e:
		logger.error(e)
		return HttpResponseServerError(e)

@never_cache
@require_GET
@staff_with_community_cluster_required
def job_list(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタでの監視設定情報を JSON で返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	settings = JobSetting.list(community_id, cluster_id)
	result = []
	for m in job.modules:
		type = m.Invoker.type()
		is_active = False
		for s in settings:
			if s.type == type:
				is_active = s.is_active
				break
		result.append({'type': type, 'isActive': is_active})
	return JsonResponse(result, safe=False)

@never_cache
@require_GET
@staff_with_community_cluster_required
def job_set_is_active(request, community_id, cluster_id, is_active):
	"""指定したコミュニティ/クラスタで指定した種類の監視の有効/無効を設定する

	type で指定した種類の処理を設定する.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		is_active (bool): 有効フラグ
	"""
	type = request.GET.get('type')
	if type:
		for m in job.modules:
			if m.Invoker.type() == type:
				try:
					s = JobSetting.get(community_id, cluster_id, type)
					s.is_active = is_active
					s.save()
				except JobSetting.DoesNotExist:
					if is_active:
						s = JobSetting(community_id=community_id, cluster_id=cluster_id, type=type, is_active=is_active)
						s.save()
				return HttpResponse('ok')
		return HttpResponseBadRequest('unknown type : {}'.format(type))
	else:
		return HttpResponseBadRequest('no param : type')
