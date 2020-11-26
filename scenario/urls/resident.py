from django.urls import path
from scenario import views

app_name = 'scenario'
urlpatterns = [
	path('availableList', views.resident_available_list, name = 'available_list'),
	path('current', views.resident_current, name = 'current'),
	path('choose', views.resident_choose, name = 'choose'),
]
