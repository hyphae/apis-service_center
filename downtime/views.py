from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseServerError
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
import logging
from core.decorators import staff_with_community_cluster_required
from core.utils import parse_iso8601_extended
from .models import Downtime, DowntimeStatus

logger = logging.getLogger(__name__)

# Create your views here.

@never_cache
@require_GET
@staff_with_community_cluster_required
def unit_id_list(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタで処理状態を持つユニットの ID リストを返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	result = DowntimeStatus.unit_id_list(community_id, cluster_id)
	logger.debug('#### data size : ' + str(len(result)))
	return JsonResponse(result, safe=False)

@never_cache
@require_GET
@staff_with_community_cluster_required
def list(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタのダウンタイム情報を JSON 配列で返す.

	unitId が指定されていればユニットで絞る.

	datetimeFrom および datetimeTo で期間を絞る.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	try:
		unit_id = request.GET.get('unitId')
		datetime_from = parse_iso8601_extended(request.GET.get('datetimeFrom'))
		datetime_to = parse_iso8601_extended(request.GET.get('datetimeTo'))
		if datetime_from and datetime_to and datetime_to <= datetime_from:
			return HttpResponseBadRequest('“datetimeTo” should be greater than “datetimeFrom”')
		result = Downtime.list(community_id, cluster_id, unit_id, datetime_from, datetime_to)
		logger.debug('#### data size : ' + str(len(result)))
		return JsonResponse(result, safe=False)
	except Exception as e:
		logger.error(e)
		return HttpResponseServerError(e)
