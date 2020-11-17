from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
import logging
from core.decorators import staff_with_community_cluster_required, resident_with_community_cluster_unit_required
from .models import UnitData

logger = logging.getLogger(__name__)

# Create your views here.

#### staff

@never_cache
@require_GET
@staff_with_community_cluster_required
def unit_id_list(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタのユニットデータの ID リストを JSON 配列で返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	result = UnitData.unit_id_list(community_id, cluster_id)
	logger.debug('#### data size : ' + str(len(result)))
	return JsonResponse(result, safe=False)

@never_cache
@require_GET
@staff_with_community_cluster_required
def latest_set(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタのユニットデータの最新の一式を JSON で返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	latest_list = UnitData.latest_list(community_id, cluster_id, None)
	logger.debug('#### data size : ' + str(len(latest_list)))
	result = {item['oesunit']['id']:item for item in latest_list}
	return JsonResponse(result, safe=False)

#### resident

@never_cache
@require_GET
@resident_with_community_cluster_unit_required
def resident_latest_set(request, community_id, cluster_id, unit_id):
	"""指定したユニットのユニットデータの最新の一式を JSON で返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
	"""
	latest_list = UnitData.latest_list(community_id, cluster_id, unit_id)
	logger.debug('#### data size : ' + str(len(latest_list)))
	if latest_list:
		latest_list = [to_resident_format(element, unit_id) for element in latest_list]
	result = {item['oesunit']['id']:item for item in latest_list}
	return JsonResponse(result, safe=False)

####

def to_resident_format(value, unit_id):
	"""ユニットデータを居住者向けに変換する

	現状は何もする必要がない.

	Args:
		value (dict): ユニットデータ
		unit_id (str): 居住者のユニット ID

	Returns:
		dict: 居住者むけユニットデータ
	"""
	return value
