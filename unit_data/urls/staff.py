from django.urls import path
from unit_data import views

app_name = 'unit_data'
urlpatterns = [
	path('unitIdList', views.unit_id_list, name = 'unit_id_list'),
	path('latestSet', views.latest_set, name = 'latest_set'),
]
