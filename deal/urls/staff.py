from django.urls import path
from deal import views

app_name = 'deal'
urlpatterns = [
	path('liveList', views.live_list, name = 'live_list'),
	path('list', views.list, name = 'list'),
	path('datetimeRange', views.datetime_range, name = 'datetime_range'),
	path('sumOfCumulateAmountWhsByHour', views.sum_of_cumulate_amount_whs_by_hour, name = 'sum_of_cumulate_amount_whs_by_hour'),
]
