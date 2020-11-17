from django.contrib import admin
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Community, Cluster, Unit

# Register your models here.

admin.site.register(Community)
admin.site.register(Cluster)

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
	"""管理ページでの Unit モデルの表示をカスタマイズするクラス
	"""
	# 編集画面での多対多編集ウィジェットを便利なやつにする
	filter_horizontal = admin.ModelAdmin.filter_horizontal + ('users',)
	list_display = admin.ModelAdmin.list_display + ('available_from', 'available_to', 'users_',)
	def users_(self, obj):
		"""一覧表示での users 表示内容を返す

		Args:
			obj (Unit): 表示対象オブジェクト

		Returns:
			str: 表示内容文字列
		"""
		a = []
		for u in obj.users.all():
			# url = reverse('admin:core_user_change', args=(u.id,))
			url = reverse('admin:core_user_changelist')
			a.append('<a href="{}">{}</a>'.format(url, u.username))
		html = '<br>'.join(a)
		return mark_safe(html)
