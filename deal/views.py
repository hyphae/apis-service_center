from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseServerError
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
import logging
from core.decorators import staff_with_community_cluster_required, resident_with_community_cluster_unit_required
from core.utils import parse_iso8601_extended, parse_iso8601_extended_timezone
from .models import Deal

logger = logging.getLogger(__name__)

# Create your views here.

#### staff

@never_cache
@require_GET
@staff_with_community_cluster_required
def live_list(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタで実行中の融通情報を JSON 配列で返す

	formatType = budo を指定すると budo 形式に変形して返す.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	result = Deal.live_list(community_id, cluster_id, None)
	logger.debug('#### data size : ' + str(len(result)))
	format_type = request.GET.get('formatType')
	if result and format_type and format_type.lower() == 'budo':
		logger.debug('#### format type : ' + format_type)
		result = [to_budo_format(element) for element in result]
	return JsonResponse(result, safe=False)

@never_cache
@require_GET
@staff_with_community_cluster_required
def list(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタでの融通情報を JSON 配列で返す

	datetimeFrom および datetimeTo で期間を絞る.

	formatType = budo を指定すると budo 形式に変形して返す.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	try:
		datetime_from = parse_iso8601_extended(request.GET.get('datetimeFrom'))
		datetime_to = parse_iso8601_extended(request.GET.get('datetimeTo'))
		if datetime_from and datetime_to and datetime_to <= datetime_from:
			return HttpResponseBadRequest('“datetimeTo” should be greater than “datetimeFrom”')
		result = Deal.list(community_id, cluster_id, None, datetime_from, datetime_to)
		logger.debug('#### data size : ' + str(len(result)))
		format_type = request.GET.get('formatType')
		if result and format_type and format_type.lower() == 'budo':
			logger.debug('#### format type : ' + format_type)
			result = [to_budo_format(element) for element in result]
		return JsonResponse(result, safe=False)
	except Exception as e:
		logger.error(e)
		return HttpResponseServerError(e)

@never_cache
@require_GET
@staff_with_community_cluster_required
def datetime_range(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタでの全ての融通の作成日時の期間を JSON で返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	result = Deal.datetime_range(community_id, cluster_id, None)
	return JsonResponse(result, safe=False)

@never_cache
@require_GET
@staff_with_community_cluster_required
def sum_of_cumulate_amount_whs_by_hour(request, community_id, cluster_id):
	"""指定したコミュニティ/クラスタでの全ての融通の時間別融通電力量の集計結果を JSON で返す.

	timezone で「時間」集計のためのタイムゾーンを指定する.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
	"""
	timezone = request.GET.get('timezone')
	if timezone:
		try:
			timezone = parse_iso8601_extended_timezone(timezone)
			result = Deal.sum_of_cumulate_amount_whs_by_hour(community_id, cluster_id, None, timezone.utcoffset(None))
			return JsonResponse(result, safe=False)
		except Exception as e:
			logger.error(e)
			return HttpResponseServerError(e)
	else:
		return HttpResponseBadRequest('no param : timezone')

#### resident

@never_cache
@require_GET
@resident_with_community_cluster_unit_required
def resident_live_list(request, community_id, cluster_id, unit_id):
	"""指定したユニットが参加する実行中の融通情報を JSON 配列で返す

	他のユニットの情報が含まれないよう必要最低限の項目に絞る.
	また他のユニットの ID は伏せ文字に変換する.

	formatType = budo を指定すると budo 形式に変形して返す.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
	"""
	result = Deal.live_list(community_id, cluster_id, unit_id)
	logger.debug('#### data size : ' + str(len(result)))
	if result:
		result = [to_resident_format(element, unit_id) for element in result]
	format_type = request.GET.get('formatType')
	if result and format_type and format_type.lower() == 'budo':
		logger.debug('#### format type : ' + format_type)
		result = [to_budo_format(element) for element in result]
	return JsonResponse(result, safe=False)

@never_cache
@require_GET
@resident_with_community_cluster_unit_required
def resident_list(request, community_id, cluster_id, unit_id):
	"""指定したユニットが参加する融通情報を JSON 配列で返す

	datetimeFrom および datetimeTo で期間を絞る.

	他のユニットの情報が含まれないよう必要最低限の項目に絞る.
	また他のユニットの ID は伏せ文字に変換する.

	formatType = budo を指定すると budo 形式に変形して返す.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
	"""
	try:
		datetime_from = parse_iso8601_extended(request.GET.get('datetimeFrom'))
		datetime_to = parse_iso8601_extended(request.GET.get('datetimeTo'))
		if datetime_from and datetime_to and datetime_to <= datetime_from:
			return HttpResponseBadRequest('“datetimeTo” should be greater than “datetimeFrom”')
		result = Deal.list(community_id, cluster_id, unit_id, datetime_from, datetime_to)
		logger.debug('#### data size : ' + str(len(result)))
		if result:
			result = [to_resident_format(element, unit_id) for element in result]
		format_type = request.GET.get('formatType')
		if result and format_type and format_type.lower() == 'budo':
			logger.debug('#### format type : ' + format_type)
			result = [to_budo_format(element) for element in result]
		return JsonResponse(result, safe=False)
	except Exception as e:
		logger.error(e)
		return HttpResponseServerError(e)

@never_cache
@require_GET
@resident_with_community_cluster_unit_required
def resident_datetime_range(request, community_id, cluster_id, unit_id):
	"""指定したユニットが参加する全ての融通の作成日時の期間を JSON で返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
	"""
	result = Deal.datetime_range(community_id, cluster_id, unit_id)
	return JsonResponse(result, safe=False)

@never_cache
@require_GET
@resident_with_community_cluster_unit_required
def resident_sum_of_cumulate_amount_whs_by_hour(request, community_id, cluster_id, unit_id):
	"""指定したユニットが参加する全ての融通の時間別融通電力量の集計結果を JSON で返す.

	timezone で「時間」集計のためのタイムゾーンを指定する.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
	"""
	timezone = request.GET.get('timezone')
	if timezone:
		try:
			timezone = parse_iso8601_extended_timezone(timezone)
			result = Deal.sum_of_cumulate_amount_whs_by_hour(community_id, cluster_id, unit_id, timezone.utcoffset(None))
			return JsonResponse(result, safe=False)
		except Exception as e:
			logger.error(e)
			return HttpResponseServerError(e)
	else:
		return HttpResponseBadRequest('no param : timezone')

####

def to_budo_format(value):
	"""融通情報を budo 形式に変換する

	Args:
		value (dict): 融通情報

	Returns:
		dict: budo 形式の融通情報
	"""
	result = dict()
	result['id'] = value.get('dealId')
	result['dischargingUnit'] = value.get('dischargeUnitId')
	result['chargingUnit'] = value.get('chargeUnitId')
	result['isMasterDeal'] = value.get('isMaster', False)
	result['request'] = value.get('type')
	result['requester'] = value.get('requestUnitId')
	result['responder'] = value.get('acceptUnitId')
	result['startTime'] = value.get('createDateTime')
	return result

__resident_format_key_list = ['createDateTime', 'dealId', 'dischargeUnitId', 'chargeUnitId', 'type', 'requestUnitId', 'requestAmountWh', 'acceptUnitId', 'dealAmountWh', 'isMaster', 'startDateTime', 'cumulateAmountWh', 'stopDateTime', 'abortDateTime', 'scramDateTime', 'deactivateDateTime']
def to_resident_format(value, unit_id):
	"""融通情報を居住者向けに変換する

	属性を __resident_format_key_list で指定したキーのみに絞る.
	さらにキーが *UnitId である属性は値が自ユニット ID 以外なら伏せ文字 ( ****** ) に変換する.

	Args:
		value (dict): 融通情報
		unit_id (str): 居住者のユニット ID

	Returns:
		dict: 居住者むけ融通情報
	"""
	result = dict()
	for key in __resident_format_key_list:
		val = value.get(key)
		if val:
			if key.lower().endswith('unitid') and val != unit_id:
				val = '******'
			result[key] = val
	return result
