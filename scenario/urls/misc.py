from django.urls import path
from scenario import views

app_name = 'scenario'
urlpatterns = [
	path('currentData', views.misc_current_data, name = 'current_data'),
	path('update', views.misc_update, name = 'update'),
]
