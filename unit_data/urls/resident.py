from django.urls import path
from unit_data import views

app_name = 'unit_data'
urlpatterns = [
	path('latestSet', views.resident_latest_set, name = 'latest_set'),
]
