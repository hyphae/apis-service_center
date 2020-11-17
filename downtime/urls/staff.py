from django.urls import path
from downtime import views

app_name = 'downtime'
urlpatterns = [
	path('unitIdList', views.unit_id_list, name = 'unit_id_list'),
	path('list', views.list, name = 'list'),
]
