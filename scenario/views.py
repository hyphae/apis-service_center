from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.forms.models import model_to_dict
import logging
from core.decorators import resident_with_community_cluster_unit_required, nosession_community_cluster_unit_required
from .models import Scenario, Choice

logger = logging.getLogger(__name__)

# Create your views here.

#### resident

@never_cache
@require_GET
@resident_with_community_cluster_unit_required
def resident_available_list(request, community_id, cluster_id, unit_id):
	"""指定したユニットが選択可能なシナリオ情報を JSON 配列で返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
	"""
	result = Scenario.available_list(community_id, cluster_id, unit_id)
	logger.debug('#### data size : ' + str(len(result)))
	result = [model_to_dict(elm) for elm in result]
	return JsonResponse(result, safe=False)

@never_cache
@require_GET
@resident_with_community_cluster_unit_required
def resident_current(request, community_id, cluster_id, unit_id):
	"""指定したユニットが現在選択中のシナリオ情報を JSON で返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
	"""
	current = Choice.current(community_id, cluster_id, unit_id)
	if current:
		scenario = current.scenario
		if scenario:
			result = model_to_dict(scenario)
			return JsonResponse(result)
	return HttpResponse()

@never_cache
@require_GET
@resident_with_community_cluster_unit_required
def resident_choose(request, community_id, cluster_id, unit_id):
	"""指定したユニットのシナリオを選択する

	scenarioId で指定したシナリオを選択する.
	指定がなければ未選択状態にする.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
	"""
	scenario_id = request.GET.get('scenarioId')
	current = Choice.current(community_id, cluster_id, unit_id)
	if scenario_id:
		if scenario_id.isdigit():
			the_id = int(scenario_id)
			if current and current.scenario and current.scenario.id == the_id:
				return HttpResponse('no change')
			else:
				available_list = Scenario.available_list(community_id, cluster_id, unit_id)
				for s in available_list:
					if s.id == the_id:
						c = Choice(community_id=community_id, cluster_id=cluster_id, unit_id=unit_id, scenario=s)
						c.save()
						return HttpResponse('ok')
		return HttpResponseBadRequest('bad scenarioId : {}'.format(scenario_id))
	else:
		if current and current.scenario:
			c = Choice(community_id=community_id, cluster_id=cluster_id, unit_id=unit_id, scenario=None)
			c.save()
			return HttpResponse('ok')
		else:
			return HttpResponse('no change')

#### misc

@csrf_exempt
@never_cache
@require_POST
@nosession_community_cluster_unit_required
def misc_current_data(request, community_id, cluster_id, unit_id):
	"""指定したユニットが現在選択中のシナリオの本体データ部分を JSON で返す

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
	"""
	current = Choice.current(community_id, cluster_id, unit_id)
	if current and current.scenario and current.scenario.data:
		return HttpResponse(current.scenario.data, content_type='application/json')
	else:
		return HttpResponse()

@csrf_exempt
@never_cache
@require_POST
@nosession_community_cluster_unit_required
def misc_update(request, community_id, cluster_id, unit_id):
	"""指定したユニット専用のシナリオを登録する

	以下のパラメタでシナリオ情報を指定する.
		- name : シナリオ名
		- description : 説明文
		- data : 本体データ ( JSON )

	当該ユニットのみが参照可能なシナリオとして保存する.
	同名シナリオがすでに存在すれば更新, なければ新規作成する.

	Args:
		community_id (str): コミュニティ ID
		cluster_id (str): クラスタ ID
		unit_id (str): ユニット ID
	"""
	name = request.POST.get('name')
	description = request.POST.get('description')
	data = request.POST.get('data')
	if name and data:
		try:
			s = Scenario.get(community_id, cluster_id, unit_id, name)
			s.description = description
			s.data = data
			s.save()
			return HttpResponse('updated')
		except Scenario.DoesNotExist:
			s = Scenario(community_id=community_id, cluster_id=cluster_id, unit_id=unit_id, name=name, description=description, data=data)
			s.save()
			return HttpResponse('created')
	else:
		return HttpResponseBadRequest('no param : name, data')
