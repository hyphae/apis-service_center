from django.contrib import admin
from .models import Scenario, Choice

# Register your models here.

@admin.register(Scenario)
class ScenarioAdmin(admin.ModelAdmin):
	list_display = ('name', 'created', 'community_id', 'cluster_id', 'unit_id')

@admin.register(Choice)
class ChoiceAdmin(admin.ModelAdmin):
	list_display = ('scenario', 'created', 'community_id', 'cluster_id', 'unit_id')
