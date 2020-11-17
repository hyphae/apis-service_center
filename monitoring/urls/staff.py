from django.urls import path
from monitoring import views

app_name = 'monitoring'
urlpatterns = [
	path('failure/openList', views.failure_open_list, name = 'failure_open_list'),
	path('failure/list', views.failure_list, name = 'failure_list'),
	path('job/list', views.job_list, name = 'job_list'),
	path('job/activate', views.job_set_is_active, {'is_active': True}, name = 'job_activate'),
	path('job/deactivate', views.job_set_is_active, {'is_active': False}, name = 'job_deactivate'),
]
