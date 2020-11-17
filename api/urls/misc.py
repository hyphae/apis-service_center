from django.urls import include, path

app_name = 'misc'
urlpatterns = [
	path('scenario/', include('scenario.urls.misc')),
]
