from django.conf import settings
from django.contrib.auth.views import LoginView, LogoutView
from django.http import HttpResponse, JsonResponse, HttpResponseBadRequest, HttpResponseForbidden, HttpResponseServerError
from django.middleware.csrf import get_token
from django.urls import reverse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
import logging
from core.decorators import login_required

logger = logging.getLogger(__name__)

# Create your views here.

class MyLoginView(LoginView):
	"""標準のログイン処理をカスタマイズするクラス

	リダイレクトせずログイン結果をステータスだけで返す.
	"""
	@method_decorator(require_POST)
	def dispatch(self, request, *args, **kwargs):
		resp = super().dispatch(request, *args, **kwargs)
		if resp.status_code == 302 and resp.url == reverse(settings.LOGIN_REDIRECT_URL):
			# OK
			return JsonResponse(generate_session_info(request))
		elif resp.status_code == 403:
			# maybe csrf error
			return HttpResponseBadRequest()
		else:
			# login failed
			return HttpResponseForbidden('login failed')

class MyLogoutView(LogoutView):
	"""標準のログアウト処理をカスタマイズするクラス

	ログアウト後リダイレクトしない.
	"""
	@method_decorator(require_GET)
	def dispatch(self, request, *args, **kwargs):
		resp = super().dispatch(request, *args, **kwargs)
		if resp.status_code == 302 and resp.url == reverse(settings.LOGOUT_REDIRECT_URL):
			# succeeded
			return HttpResponse()
		else:
			# unknown error
			logger.error('unknown error')
			return HttpResponseServerError('unknown error')

@csrf_exempt
@never_cache
@require_GET
@login_required
def session(request):
	"""セッション情報を JOSN で返す
	"""
	return JsonResponse(generate_session_info(request))

@csrf_exempt
@never_cache
@require_GET
def csrftoken(request):
	"""ログインに必要な CSRF 情報を JSON で返す
	"""
	return JsonResponse({'csrfmiddlewaretoken': get_token(request)})

####

def generate_session_info(request):
	"""レスポンスとして返すためのセッション情報を生成する

	Args:
		request ([type]): リクエスト

	Returns:
		dict: セッション情報
	"""
	return {
		'sessionid': request.session.session_key,
		'expiry_age': request.session.get_expiry_age(),
		'expiry_date': request.session.get_expiry_date(),
		'user': {
			'username': request.user.username,
			'last_name': request.user.last_name,
			'first_name': request.user.first_name,
			'email': request.user.email,
		},
	}
