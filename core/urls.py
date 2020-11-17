from django.urls import path
from . import views

app_name = 'core'
urlpatterns = [
	path('login', views.MyLoginView.as_view(), name = 'login'),
	path('logout', views.MyLogoutView.as_view(), name = 'logout'),
	path('session', views.session, name = 'session'),
	path('csrftoken', views.csrftoken, name = 'csrftoken'),
]
