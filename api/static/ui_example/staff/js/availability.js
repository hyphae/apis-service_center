/**
 * @file 管理者側 UI : AVAILABILITY 画面
 */

$(function () {

	/**
	 * 検索日付 ( from ) 文字列
	 * 
	 * クッキーで初期化する.
	 */
	let periodFrom = Cookies.get('availability.periodFrom');
	/**
	 * 検索日付 ( to ) 文字列
	 * 
	 * クッキーで初期化する.
	 */
	let periodTo = Cookies.get('availability.periodTo');

	// 日付を入力済みにする
	$('#input-period-from').val(periodFrom);
	$('#input-period-to').val(periodTo);

	// 全体集計結果の表示テーブル
	const averageDataTable = $('#table-average').DataTable({retrieve: true, searching: false, paging: false, ordering: false, info: false});
	// ユニット別集計結果の表示テーブル
	const unitDataTable = $('#table-unit').DataTable({retrieve: true, searching: false, paging: false, ordering: false, info: false});
	// ユニット別ダウンタイムの一覧表示テーブル
	const downtimeDataTable = $('#table-downtime').DataTable({retrieve: true, searching: false, paging: false, ordering: false, info: false});

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
		 * ミリ秒を日数に変換し文字列を返す
		 * @param {number} val フォーマットする値 (ミリ秒)
		 * @return {string} フォーマット結果文字列
		 */
		function formatDays(val) {
			return Math.floor(val / (1000 * 60 * 60 * 24)).toLocaleString() + ' days';
		}
		/**
		 * ミリ秒を時間数/分数/秒数に変換し文字列を返す
		 * @param {number} val フォーマットする値 (ミリ秒)
		 * @return {string} フォーマット結果文字列
		 */
		function formatHMS(val) {
			const hrs = Math.floor(val / (1000 * 60 * 60));
			const mins = Math.floor((val % (1000 * 60 * 60)) / (1000 * 60));
			const secs = Math.floor(((val % (1000 * 60 * 60)) % (1000 * 60)) / 1000);
			if (!hrs && !mins & !secs) return 0;
			const a = [];
			if (hrs) a.push(hrs.toLocaleString() + ' hrs');
			if (mins) a.push(mins + ' mins');
			if (secs) a.push(secs + ' secs');
			return a.join(' ');
		}
		/**
		 * パーセント表示の文字列を返す
		 * @param {number} val 値
		 * @return {string} フォーマット結果文字列
		 */
		function formatPercents(val) {
			return Math.round(val * 10000) / 100 + ' %';
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
		 * ダウンタイム情報のリストから各種集計処理を実行し表示する
		 * @param {Date} periodFrom 検索日付 (from)
		 * @param {Date} periodTo 検索日付 (to)
		 * @param {Array.<Object>} data 検索結果ダウンタイム情報リスト
		 */
		function doDisplay(periodFrom, periodTo, data) {
			averageDataTable.clear();
			unitDataTable.clear();
			// 集計する
			const periodMillisPerUnit = {};
			const downtimeMillisPerUnit = {};
			let periodMillisSum = 0;
			let downtimeMillisSum = 0;
			const units = {};
			for (const aUnitId in communityOutline.communities[communityId].clusters[clusterId].units) {
				const aUnit = communityOutline.communities[communityId].clusters[clusterId].units[aUnitId];
				const availableFrom = (aUnit.available_from) ? new Date(aUnit.available_from) : null;
				const availableTo = (aUnit.available_to) ? new Date(aUnit.available_to) : null;
				if (availableFrom && periodTo <= availableFrom) continue;
				if (availableTo && availableTo <= periodFrom) continue;
				units[aUnitId] = aUnit;
				const beginForPeriod = (availableFrom && periodFrom < availableFrom) ? availableFrom : periodFrom;
				const endForPeriod = (availableTo && availableTo < periodTo) ? availableTo : periodTo;
				const period = (beginForPeriod < endForPeriod) ? endForPeriod - beginForPeriod : 0;
				periodMillisPerUnit[aUnitId] = period;
				periodMillisSum += period;
				downtimeMillisPerUnit[aUnitId] = 0;
				for (const aDowntime of data) {
					if (aDowntime.unitId == aUnitId) {
						let begin = (aDowntime.downDateTime) ? new Date(aDowntime.downDateTime) : null;
						let end = (aDowntime.recoveryDateTime) ? new Date(aDowntime.recoveryDateTime) : null;
						if (!begin || begin < periodFrom) begin = periodFrom;
						if (!end || periodTo < end) end = periodTo;
						if (availableFrom && begin < availableFrom) begin = availableFrom;
						if (availableTo && availableTo < end) end = availableTo;
						if (begin && end) {
							const downtime = (begin < end) ? end - begin : 0;
							downtimeMillisPerUnit[aUnitId] += downtime;
							downtimeMillisSum += downtime;
						} else {
							downtimeMillisPerUnit[aUnitId] = Infinity;
							downtimeMillisSum = Infinity;
						}
					}
				}
			}
			const numOfUnits = Object.keys(units).length;
			// 全体集計結果テーブルを作成する
			averageDataTable.row.add([
				formatDays(periodMillisSum / numOfUnits),
				formatHMS(periodMillisSum / numOfUnits),
				formatHMS((periodMillisSum - downtimeMillisSum) / numOfUnits),
				formatHMS(downtimeMillisSum / numOfUnits),
				formatPercents((periodMillisSum - downtimeMillisSum) / periodMillisSum),
			]).draw();
			// ユニット別集計結果テーブルを作成する
			for (const aUnitId in units) {
				unitDataTable.row.add([
					units[aUnitId].name,
					formatDays(periodMillisPerUnit[aUnitId]),
					formatHMS(periodMillisPerUnit[aUnitId]),
					formatHMS(periodMillisPerUnit[aUnitId] - downtimeMillisPerUnit[aUnitId]),
					formatHMS(downtimeMillisPerUnit[aUnitId]),
					formatPercents((periodMillisPerUnit[aUnitId] - downtimeMillisPerUnit[aUnitId]) / periodMillisPerUnit[aUnitId]),
					'<button data-id="' + aUnitId + '">detail...</button>',
				]);
			}
			unitDataTable.draw();
			// 各行のボタンに当該ユニットのダウンタイム一覧表示処理を仕込む
			$('#table-unit tbody').off('click').on('click', 'button', function() {
				const unitId = $(this).attr('data-id');
				doRowClicked(periodFrom, periodTo, data, unitId);
			});
		}

		/**
		 * 当該ユニットのダウンタイム一覧表示ダイアログを表示する
		 * @param {Date} periodFrom 検索日付 (from)
		 * @param {Date} periodTo 検索日付 (to)
		 * @param {Array.<Object>} data 検索結果ダウンタイム情報リスト
		 * @param {string} unitId ユニット ID
		 */
		function doRowClicked(periodFrom, periodTo, data, unitId) {
			downtimeDataTable.clear();
			const unit = communityOutline.communities[communityId].clusters[clusterId].units[unitId];
			const availableFrom = (unit.available_from) ? new Date(unit.available_from) : '';
			const availableTo = (unit.available_to) ? new Date(unit.available_to) : '';
			// テーブルを作成する
			for (const aDowntime of data) {
				if (aDowntime.unitId == unitId) {
					const begin = (aDowntime.downDateTime) ? new Date(aDowntime.downDateTime) : null;
					const end = (aDowntime.recoveryDateTime) ? new Date(aDowntime.recoveryDateTime) : null;
					let beginForDuration = (!begin || begin < periodFrom) ? periodFrom : begin;
					let endForDuration = (!end || periodTo < end) ? periodTo : end;
					if (availableFrom && beginForDuration < availableFrom) beginForDuration = availableFrom;
					if (availableTo && availableTo < endForDuration) endForDuration = availableTo;
					const duration = (beginForDuration < endForDuration) ? endForDuration - beginForDuration : 0;
					downtimeDataTable.row.add([
						formatDate(begin),
						formatDate(end),
						formatHMS(duration),
					]);
				}
			}
			let title = communityOutline.communities[communityId].clusters[clusterId].units[unitId].name;
			if (availableFrom || availableTo) title += ' ( ' + formatDate(availableFrom) + ' - ' + formatDate(availableTo) + ' )'
			downtimeDataTable.draw();
			// ダイアログを表示する
			$('#dialog-downtime').dialog({
				modal: true,
				closeOnEscape: true,
				width: 600,
				height: 'auto',
				title: title,
			});
		}

		// 集計ボタンに処理を設定する
		$('#button-aggregate').off('click').click(function() {
			// 日付文字列を取得しクッキーに保存する
			periodFrom = $('#input-period-from').val();
			periodTo = $('#input-period-to').val();
			Cookies.set('availability.periodFrom', periodFrom);
			Cookies.set('availability.periodTo', periodTo);
			if (periodFrom && periodTo) {
				const fromDate = parseDate(periodFrom);
				const toDate = parseDate(periodTo);
				// toDate は less than で検索するため一日進める
				if (toDate) toDate.setDate(toDate.getDate() + 1);
				// サーバからダウンタイム情報を検索する
				client.downtime.list(
					communityId,
					clusterId,
					null,
					fromDate,
					toDate,
					function(json, textStatus) {
						// 検索結果を表示する
						doDisplay(fromDate, toDate, json);
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
		averageDataTable.clear().draw();
		unitDataTable.clear().draw();
		downtimeDataTable.clear().draw();

	});

});
