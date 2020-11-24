/**
 * @file 管理者側 UI : MONITORING 画面
 */

$(function () {

	/**
	 * 障害情報検索日付 ( from ) 文字列
	 * 
	 * クッキーで初期化する.
	 */
	let periodFrom = Cookies.get('monitoring.periodFrom');
	/**
	 * 障害情報検索日付 ( to ) 文字列
	 * 
	 * クッキーで初期化する.
	 */
	let periodTo = Cookies.get('monitoring.periodTo');

	// 日付を入力済みにする
	$('#input-period-from').val(periodFrom);
	$('#input-period-to').val(periodTo);

	/**
	 * アクティブな障害情報の一覧表示テーブル
	 */
	const openFailuresDataTable = $('#table-open-failures').DataTable({retrieve: true, searching: false, paging: false, ordering: false, info: false});
	/**
	 * 検索結果障害情報の一覧表示テーブル
	 */
	const failuresDataTable = $('#table-failures').DataTable({retrieve: true, searching: false});

	/**
	 * アクティブな障害情報の表示を定期的に更新するタイマの ID
	 */
	let openFailuresTimer = null;

	// main.js から起動される処理本体
	$(document).on('startDisplay', function(e, communityId, clusterId, communityOutline) {

		/**
		 * 日付文字列をパースし Date を返す
		 * @param {string} val パースする日付文字列
		 * @return {Date} パース結果 Date オブジェクト
		 */
		function parseDate(val) {
			if (!val) return null;
			const a = val.split('-');
			if (a.length == 3) {
				const result = new Date(a[0], a[1] - 1, a[2]);
				if (!isNaN(result.getTime())) return result;
				alert(result + ' : ' + val);
				throw new Error(result + ' : ' + val);
			}
			alert('illegal date format : ' + val);
			throw new Error('illegal date format : ' + val);
		}
		/**
		 * Date オブジェクトをフォーマットし文字列を返す
		 * @param {Date} val フォーマットする Date オブジェクト
		 * @return {string} フォーマット結果文字列
		 */
		function formatDate(val) {
			return (val) ? val.getFullYear() + '-' + ('0' + (val.getMonth() + 1)).slice(-2) + '-' + ('0' + val.getDate()).slice(-2) + ' ' + ('0' + val.getHours()).slice(-2) + ':' + ('0' + val.getMinutes()).slice(-2) + ':' + ('0' + val.getSeconds()).slice(-2) : null;
		}

		/**
		 * 障害監視処理のリストを一覧表示する
		 * @param {Array.<Object>} jobs 障害監視処理リスト
		 */
		function doDisplayJobs(jobs) {
			// ベタに html を生成する
			let html = '';
			for (const aJob of jobs) {
				const isActive = (aJob.isActive) ? 'active' : 'inactive';
				const checked = (aJob.isActive) ? ' checked' : '';
				html += '<tr class="' + isActive + '">';
				html += '<td class="type">' + aJob.type + '</td>';
				html += '<td class="action"><input data-type="' + aJob.type + '" type="checkbox"' + checked + '></td>';
				html += '</tr>';
			}
			$('#display-jobs').empty().append(html);
			// チェックボックスに監視処理の ON/OFF 処理を仕込む
			$('#display-jobs .action input:checkbox').off('change').on('change', function() {
				const type = $(this).data('type');
				const isActive = $(this).prop('checked');
				// isActive に応じて呼び出すサーバ処理を選び...
				const func = (isActive) ? client.monitoring.job.activate : client.monitoring.job.deactivate;
				// 処理を呼び出す
				func(
					communityId,
					clusterId,
					type,
					function(data, textStatus) {
						// 状態の取得と表示をしなおす
						checkAndDisplayJobs();
					},
					function(jqXHR, textStatus, errorThrown) {
						alert(jqXHR.responseText);
					},
				);
			});
		}
		/**
		 * 障害監視処理の状態を取得し表示する
		 */
		function checkAndDisplayJobs() {
			// サーバから障害監視処理の状態を取得する
			client.monitoring.job.list(
				communityId,
				clusterId,
				function(data, textStatus) {
					// 取得したデータを表示する
					doDisplayJobs(data);
				},
				function(jqXHR, textStatus, errorThrown) {
					alert(jqXHR.responseText);
				},
			);
		}

		/**
		 * アクティブな障害情報リストを一覧表示する
		 * @param {Array.<Object>} failures 障害情報リスト
		 */
		function doDisplayOpenFailures(failures) {
			openFailuresDataTable.clear();
			// テーブルを作成する
			for (const aFailure of failures) {
				const detected = (aFailure.detected) ? new Date(aFailure.detected) : null;
				openFailuresDataTable.row.add([
					formatDate(detected),
					aFailure.type,
					aFailure.program_id,
					aFailure.unit_id,
					aFailure.description,
					'<button data-id="' + aFailure.id + '">detail...</button>',
				]);
			}
			openFailuresDataTable.draw();
			// 各行のボタンに当該情報の詳細表示処理を仕込む
			$('#table-open-failures tbody').off('click').on('click', 'button', function() {
				const id = $(this).attr('data-id');
				for (const aFailure of failures) {
					if (aFailure.id == id) {
						doRowClicked(aFailure);
						break;
					}
				}
			});
		}
		/**
		 * アクティブな障害情報を取得し表示する
		 */
		function checkAndDisplayOpenFailures() {
			// サーバからアクティブな障害情報を取得する
			client.monitoring.failure.openList(
				communityId,
				clusterId,
				function(data, textStatus) {
					// 取得したデータを表示する
					doDisplayOpenFailures(data);
				},
				function(jqXHR, textStatus, errorThrown) {
					alert(jqXHR.responseText);
				},
			);
		}

		/**
		 * 障害情報の詳細を表示する
		 * @param {Object} failure 障害情報
		 */
		function doRowClicked(failure) {
			// 表示用 html を生成しダイアログの中の要素にセットする
			const html = DetailView.buildHtml(failure);
			$('#failure-detail').html(html);

			// ダイアログを表示する
			$('#dialog-failure').dialog({
				modal: true,
				closeOnEscape: true,
				width: 600,
				height: 'auto',
				title: failure.type,
			});
		}

		/**
		 * 検索した障害情報リストを一覧表示する
		 * @param {Array.<Object>} failures 障害情報リスト
		 */
		function doDisplayFailures(failures) {
			failuresDataTable.clear();
			// テーブルを作成する
			for (const aFailure of failures) {
				const detected = (aFailure.detected) ? new Date(aFailure.detected) : null;
				const closed = (aFailure.closed) ? new Date(aFailure.closed) : null;
				failuresDataTable.row.add([
					formatDate(detected),
					formatDate(closed),
					aFailure.type,
					aFailure.program_id,
					aFailure.unit_id,
					aFailure.description,
					'<button data-id="' + aFailure.id + '">detail...</button>',
				]);
			}
			failuresDataTable.draw();
			// 各行のボタンに当該情報の詳細表示処理を仕込む
			$('#table-failures tbody').off('click').on('click', 'button', function() {
				const id = $(this).attr('data-id');
				for (const aFailure of failures) {
					if (aFailure.id == id) {
						doRowClicked(aFailure);
						break;
					}
				}
			});
		}

		// 検索ボタンに処理を設定する
		$('#button-aggregate').off('click').click(function() {
			// 日付文字列を取得しクッキーに保存する
			periodFrom = $('#input-period-from').val();
			periodTo = $('#input-period-to').val();
			Cookies.set('monitoring.periodFrom', periodFrom);
			Cookies.set('monitoring.periodTo', periodTo);
			if (periodFrom && periodTo) {
				const fromDate = parseDate(periodFrom);
				const toDate = parseDate(periodTo);
				// toDate は less than で検索するため一日進める
				if (toDate) toDate.setDate(toDate.getDate() + 1);
				// サーバから障害情報を検索する
				client.monitoring.failure.list(
					communityId,
					clusterId,
					fromDate,
					toDate,
					function(json, textStatus) {
						// 検索結果を表示する
						doDisplayFailures(json);
					},
					function(jqXHR, textStatus, errorThrown) {
						alert(jqXHR.responseText);
					},
				);
			} else {
				alert('no dates');
			}
		});

		// 一覧表示テーブルを空で表示させておく
		failuresDataTable.clear().draw();

		// 障害監視処理の状態を取得し表示する
		checkAndDisplayJobs();
		// アクティブな障害情報を取得し表示する
		checkAndDisplayOpenFailures();
		// 30 秒ごとにアクティブな障害情報を更新表示するタイマを仕込む
		if (openFailuresTimer) clearInterval(openFailuresTimer);
		openFailuresTimer = setInterval(checkAndDisplayOpenFailures, 30000);

	});

});
