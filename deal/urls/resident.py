from django.urls import path
from deal import views

app_name = 'deal'
urlpatterns = [
	path('liveList', views.resident_live_list, name = 'live_list'),
	path('list', views.resident_list, name = 'list'),
	path('datetimeRange', views.resident_datetime_range, name = 'datetime_range'),
	path('sumOfCumulateAmountWhsByHour', views.resident_sum_of_cumulate_amount_whs_by_hour, name = 'sum_of_cumulate_amount_whs_by_hour'),
]
