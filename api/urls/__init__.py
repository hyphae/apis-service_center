"""api の URL をグループ別ファイルにするため urls.py を urls パッケージ化
"""
from django.urls import include, path

urlpatterns = [
	path('core/', include('core.urls')),
	path('staff/', include('api.urls.staff')),
	path('resident/', include('api.urls.resident')),
	path('misc/', include('api.urls.misc')),
]
