import os
from django.apps import AppConfig


class MonitoringConfig(AppConfig):
    name = 'monitoring'

    def ready(self):
        """起動処理

        - モデルのデータベースインデクスの作成
        - 障害監視処理の初期化
        """
        # 開発時のオートリロード機能による二重起動を防ぐためのおまじない
        if not os.environ.get('RUN_MAIN'): return
        from . import job
        job.init()
