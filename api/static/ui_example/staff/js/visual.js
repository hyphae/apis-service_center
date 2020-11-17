/**
 * @file 管理者側 UI : VISUAL 画面
 */

$(function () {

	/**
	 * データの更新を定期的に実行するタイマの ID
	 */
	let mainLoopTimerId;

	// main.js から起動される処理本体
	$(document).on('startDisplay', function(e, communityId, clusterId, communityOutline) {

		/**
		 * データを更新する
		 */
		const mainLoop = function() {
			if (communityId && clusterId) {
				// サーバから最新のユニットデータ一式を取得する
				client.unitData.latestSet(
					communityId,
					clusterId,
					// visual-core.js の関数にデータを渡す
					processGetLog,
				);
				// サーバから実行中の融通情報のリストを取得する
				client.deal.liveList(
					communityId,
					clusterId,
					'budo',
					// visual-core.js の関数にデータを渡す
					processDeals,
				);
			}
		};

		// visual-config.js を初期化する
		initVisualConfig(communityId, clusterId);
		// visual-core.js を初期化する
		initVisual($('#mainCanvas')[0]);

		// データを更新する
		mainLoop();
		// 5 秒ごとにデータを更新するタイマを仕込む
		if (mainLoopTimerId) clearInterval(mainLoopTimerId);
		mainLoopTimerId = setInterval(mainLoop, 5000);

	});

});
