/**
 * @file 居住者側 UI : SCENARIO 画面
 */

$(function () {

	/**
	 * シナリオ情報の一覧表示テーブル
	 */
	const availableScenariosDataTable = $('#table-available-scenarios').DataTable({retrieve: true, searching: false, paging: false, ordering: false, info: false});

	// main.js から起動される処理本体
	$(document).on('startDisplay', function(e, communityId, clusterId, unitId, communityOutline) {

		/**
		 * Date オブジェクトをフォーマットし文字列を返す
		 * @param {Date} val フォーマットする Date オブジェクト
		 * @return {string} フォーマット結果文字列
		 */
		function formatDate(val) {
			return (val) ? val.getFullYear() + '-' + ('0' + (val.getMonth() + 1)).slice(-2) + '-' + ('0' + val.getDate()).slice(-2) + ' ' + ('0' + val.getHours()).slice(-2) + ':' + ('0' + val.getMinutes()).slice(-2) + ':' + ('0' + val.getSeconds()).slice(-2) : null;
		}

		/**
		 * シナリオ情報のリストを一覧表示する
		 * 
		 * 現在選択中のシナリオはハイライトする.
		 * 詳細表示ボタンと選択ボタンも表示する.
		 * @param {Array.<Object>} data シナリオ情報リスト
		 */
		function doDisplayAvailableScenarios(data) {
			availableScenariosDataTable.clear();
			// テーブルを作成する
			for (const aScenario of data) {
				availableScenariosDataTable.row.add([
					aScenario.name,
					aScenario.description,
					'<button class="detail" data-id="' + aScenario.id + '">detail...</button>' +
					'<button class="choose" data-id="' + aScenario.id + '">choose</button>',
				]);
			}
			availableScenariosDataTable.draw();
			// 各行のボタンに詳細表示処理と選択処理を設定する
			$('#table-available-scenarios tbody').off('click').on('click', 'button.detail', function() {
				const id = $(this).attr('data-id');
				for (const aScenario of data) {
					if (aScenario.id == id) {
						doRowClicked(aScenario);
						break;
					}
				}
			}).on('click', 'button.choose', function() {
				const id = $(this).attr('data-id');
				client.scenario.choose(
					communityId,
					clusterId,
					unitId,
					id,
					function(data, textStatus) {
						checkAndDisplayAvailableScenarios();
					},
					function(jqXHR, textStatus, errorThrown) {
						alert(jqXHR.responseText);
					},
				);
			});
		}
		/**
		 * シナリオ情報の詳細を表示する
		 * @param {Object} scenario シナリオ情報
		 */
		function doRowClicked(scenario) {
			// 表示用 html を生成しダイアログの中の要素にセットする
			const html = DetailView.buildHtml(scenario);
			$('#scenario-detail').html(html);

			// ダイアログを表示する
			$('#dialog-scenario').dialog({
				modal: true,
				closeOnEscape: true,
				width: 600,
				height: 'auto',
				title: scenario.name,
			});
		}
		/**
		 * 選択中のシナリオ情報をハイライト表示する
		 * @param {Object} data シナリオ情報
		 */
		function doDisplayCurrent(data) {
			if (data && data.id) {
				const button = $('#table-available-scenarios button[data-id=' + data.id + ']');
				if (button.length) {
					button.closest('tr').addClass('current');
				}
			} else {
				$('#table-available-scenarios tr').removeClass('current');
			}
		}

		/**
		 * 選択可能なシナリオ情報を取得し表示する
		 */
		function checkAndDisplayAvailableScenarios() {
			// サーバから選択可能なシナリオ情報のリストを取得する
			client.scenario.availableList(
				communityId,
				clusterId,
				unitId,
				function(data, textStatus) {
					// 取得したシナリオ情報を表示する
					doDisplayAvailableScenarios(data);
					// サーバから現在選択中のシナリオ情報を取得する
					client.scenario.current(
						communityId,
						clusterId,
						unitId,
						function(data, textStatus) {
							// 選択状態を表示する
							doDisplayCurrent(data);
						},
						function(jqXHR, textStatus, errorThrown) {
							alert(jqXHR.responseText);
						},
					);
				},
				function(jqXHR, textStatus, errorThrown) {
					alert(jqXHR.responseText);
				},
			);
		}

		// 一覧表示テーブルを空で表示させておく
		availableScenariosDataTable.clear().draw();

		// 自動で一覧を取得し表示する
		checkAndDisplayAvailableScenarios();

	});

});
