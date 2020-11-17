from django.views.generic.base import TemplateView
from django.urls import include, path

app_name = 'staff'
urlpatterns = [
	path('client.js', TemplateView.as_view(template_name = 'api/staff/client.js'), name = 'client_js'),
	path('community/', include('community.urls.staff')),
	path('unitData/', include('unit_data.urls.staff')),
	path('deal/', include('deal.urls.staff')),
	path('downtime/', include('downtime.urls.staff')),
	path('monitoring/', include('monitoring.urls.staff')),
]
