from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
from core.decorators import staff_required, resident_required
from . import models

# Create your views here.

#### staff

@never_cache
@require_GET
@staff_required
def outline(request):
	"""コミュニティ/クラスタ/ユニットの階層構造を JSON で返す
	"""
	result = models.outline()
	return JsonResponse(result, safe=False)

#### resident

@never_cache
@require_GET
@resident_required
def resident_outline(request):
	"""ユーザから見えるコミュニティ/クラスタ/ユニットの階層構造を JSON で返す
	"""
	result = models.resident_outline(request.user)
	return JsonResponse(result, safe=False)
