"""障害監視処理パッケージ
"""
from . import apis_main_alive, apis_ccc_alive, grid_master_alive, apis_main_severe, apis_ccc_severe, apis_log_severe

# 監視処理のリスト
modules = [
	apis_main_alive,
	apis_ccc_alive,
	grid_master_alive,
	apis_main_severe,
	apis_ccc_severe,
	apis_log_severe,
]

def init():
	"""初期化

	全種類の処理に対し,
	Invoker を作成し実行する.
	Invoker は Thead を継承しており,
	独立したスレッドで動作する.
	"""
	for m in modules:
		m.Invoker().start()
