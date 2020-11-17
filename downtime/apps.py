import os
from django.apps import AppConfig


class DowntimeConfig(AppConfig):
    name = 'downtime'

    def ready(self):
        """起動処理

        - モデルのデータベースインデクスの作成
        - ダウンタイム集計処理の初期化
        """
        # 開発時のオートリロード機能による二重起動を防ぐためのおまじない
        if not os.environ.get('RUN_MAIN'): return
        from . import models
        models.ensure_indices()
        from . import job
        job.init()
