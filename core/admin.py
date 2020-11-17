from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.utils.translation import gettext, gettext_lazy as _
from django.forms import ModelMultipleChoiceField
from community.models import Unit
from .models import User

# Register your models here.

class MyUserChangeForm(UserChangeForm):
	"""User モデルの編集画面をカスタマイズするクラス

	community.Unit の users ( 多対多 ) を反対側からも編集可能にするための小細工.
	"""
	units = ModelMultipleChoiceField(Unit.objects.all(), required=False, widget=admin.widgets.FilteredSelectMultiple('units', False))
	class Meta:
		model = User
		fields = '__all__'
	def __init__(self, *args, **kwargs):
		super().__init__(*args, **kwargs)
		if 'instance' in kwargs:
			self.fields['units'].initial = self.instance.unit_set.all()
	def save(self, *args, **kwargs):
		super().save(*args, **kwargs)
		self.instance.unit_set.clear()
		for unit in self.cleaned_data['units']:
			self.instance.unit_set.add(unit)
		return self.instance

@admin.register(User)
class MyUserAdmin(UserAdmin):
	"""管理ページでの User モデルの表示をカスタマイズするクラス
	"""
	fieldsets = (
		(None, {'fields': ('username', 'password', 'units')}),
		(_('Personal info'), {'fields': ('first_name', 'last_name', 'email')}),
		(_('Permissions'), {
			'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
		}),
		(_('Important dates'), {'fields': ('last_login', 'date_joined')}),
	)
	form = MyUserChangeForm
	list_display = UserAdmin.list_display + ('units_',)
	def units_(self, obj):
		"""一覧表示での units 表示内容を返す

		Args:
			obj (User): 表示対象オブジェクト

		Returns:
			str: 表示内容文字列
		"""
		a = []
		for u in obj.unit_set.all():
			# url = reverse('admin:community_unit_change', args=(u.id,))
			url = reverse('admin:community_unit_changelist')
			a.append('<a href="{}">{}</a>'.format(url, u.__str__()))
		html = '<br>'.join(a)
		return mark_safe(html)
