from django.urls import path
from community import views

app_name = 'community'
urlpatterns = [
	path('outline', views.resident_outline, name = 'outline'),
]
