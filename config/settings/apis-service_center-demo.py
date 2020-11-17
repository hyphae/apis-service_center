"""切り替え用 settings ファイル

base.py をベースに上書きする.
デモ起動用.
"""
from .base import *

# MongoDB 用のデータベース設定
MONGODB_DATABASES = {
    'downtime' : {
        'HOST': 'localhost',
        'NAME': 'apis_demo',
    },
    'unit_data' : {
        'HOST': 'localhost',
        'NAME': 'apis_demo',
    },
    'deal' : {
        'HOST': 'localhost',
        'NAME': 'apis_demo',
    },
    'apis_log' : {
        'HOST': 'localhost',
        'NAME': 'apis_demo',
    },
}
