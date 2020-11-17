from django.views.generic.base import TemplateView
from django.urls import include, path

app_name = 'resident'
urlpatterns = [
	path('client.js', TemplateView.as_view(template_name = 'api/resident/client.js'), name = 'client_js'),
	path('community/', include('community.urls.resident')),
	path('unitData/', include('unit_data.urls.resident')),
	path('deal/', include('deal.urls.resident')),
	path('scenario/', include('scenario.urls.resident')),
]
