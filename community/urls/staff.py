from django.urls import path
from community import views

app_name = 'community'
urlpatterns = [
	path('outline', views.outline, name = 'outline'),
]
