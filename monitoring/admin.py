from django.contrib import admin
from .models import Failure, CommunitySetting, JobSetting

# Register your models here.

@admin.register(Failure)
class FailureAdmin(admin.ModelAdmin):
	list_display = ('detected', 'community_id', 'cluster_id', 'type', 'program_id', 'unit_id', 'closed')
	# closed による絞り込み機能を追加する
	list_filter = ['closed']

@admin.register(CommunitySetting)
class CommunitySettingAdmin(admin.ModelAdmin):
	list_display = ('community_id', 'notify_to')

@admin.register(JobSetting)
class JobSettingAdmin(admin.ModelAdmin):
	list_display = ('community_id', 'cluster_id', 'type', 'is_active')
