"""切り替え用 settings ファイル

base.py をベースに上書きする.
"""
from .base import *

DEBUG = False
ALLOWED_HOSTS = ['*']
STATIC_URL = '/apis-service-center/app/static/'
