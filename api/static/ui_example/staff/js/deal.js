/**
 * @file 管理者側 UI : DEAL 画面
 */

$(function () {

	/**
	 * 日付文字列
	 * 
	 * クッキーで初期化する.
	 */
	let date = Cookies.get('deal.date');

	// 日付を入力済みにする
	$('#input-date').val(date);

	/**
	 * 融通情報の一覧表示テーブル
	 */
	const dealsDataTable = $('#table-deals').DataTable({retrieve: true, searching: false, 'order': [[8, 'asc']]});

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
		 * 融通情報のリストから各種表示を生成する
		 * - 融通電力量の集計および表示
		 * - うち異常終了および緊急停止した融通の融通電力量の集計および表示
		 * - 全融通情報のテーブル表示
		 * - ユニット別送受電力量の集計およびグラフ表示
		 * @param {Date} periodFrom 融通情報の検索対象日付 (開始)
		 * @param {Date} periodTo 融通情報の検索対象日付 (終了)
		 * @param {Array.<Object>} deals 融通情報リスト
		 */
		function doDisplayDeals(periodFrom, periodTo, deals) {
			// 集計する
			let sum = 0;
			let aborted = 0;
			let scrammed = 0;
			const dischargeSumByUnit = {};
			const chargeSumByUnit = {};
			for (const aDeal of deals) {
				if (aDeal.cumulateAmountWh) {
					sum += aDeal.cumulateAmountWh;
					if (aDeal.dischargeUnitId) {
						if (dischargeSumByUnit[aDeal.dischargeUnitId] === undefined) dischargeSumByUnit[aDeal.dischargeUnitId] = 0;
						dischargeSumByUnit[aDeal.dischargeUnitId] += aDeal.cumulateAmountWh;
					}
					if (aDeal.chargeUnitId) {
						if (chargeSumByUnit[aDeal.chargeUnitId] === undefined) chargeSumByUnit[aDeal.chargeUnitId] = 0;
						chargeSumByUnit[aDeal.chargeUnitId] += aDeal.cumulateAmountWh;
					}
				}
				if (aDeal.abortDateTime) {
					++aborted;
				}
				if (aDeal.scramDateTime) {
					++scrammed;
				}
			}

			// 融通電力量を表示する
			$('#sum-of-amount-kwh').text((Math.round(sum / 10) / 100).toLocaleString());
			// 異常終了した融通の融通電力量を表示する
			$('#number-of-aborted-deals').text(aborted.toLocaleString());
			// 緊急停止した融通の融通電力量を表示する
			$('#number-of-scrammed-deals').text(scrammed.toLocaleString());

			// ボタンに全融通情報表示処理を設定する
			$('#button-show-deals-dialog').off('click').click(function() { showDealsDialog(periodFrom, periodTo, deals); });

			// ユニット別送受電力量のグラフを表示する
			const chartData = [['unit', 'discharge', 'charge']];
			const units = communityOutline.communities[communityId].clusters[clusterId].units;
			for (const aUnitId in units) {
				const aUnit = units[aUnitId];
				if (aUnit.available_to && new Date(aUnit.available_to) <= periodFrom) continue;
				if (aUnit.available_from && periodTo <= new Date(aUnit.available_from)) continue;
				const un = aUnit.name;
				const dchg = dischargeSumByUnit[aUnitId] || 0;
				const chg = chargeSumByUnit[aUnitId] || 0;
				chartData.push([un, dchg, chg]);
			}
			if (chartData.length == 1) chartData.push(['', 0, 0]);
			google.charts.load('current', {'packages': ['corechart']});
			google.charts.setOnLoadCallback(function() {
				const options = {
					height: 110 + (30 * (chartData.length - 1)),
					legend: {
						position: 'top',
					},
					isStacked: true,
					chartArea: {
						top: 50,
						left: 100,
						right: 50,
						bottom: 60,
					},
					hAxis: {
						title: 'amount [Wh]',
						minValue: 0,
					},
					vAxis: {
						title: 'unit',
					},
					animation: {
						startup: true,
						duration: 1000,
						easing: 'out',
					},
					series: {
						0: {color: '#3498DB'},
						1: {color: '#E74C3C'},
					},
				};
				const chart = new google.visualization.BarChart(document.getElementById('chart-amount-by-unit'));
				chart.draw(google.visualization.arrayToDataTable(chartData), options);
			});
		}
		/**
		 * 融通情報のリストおよび全融通の存在期間および全融通の時間別融通電力量から時間別グラフを表示する
		 * @param {Array.<Object>} deals 融通情報リスト
		 * @param {Date} rangeMin 全融通の存在期間 (最小)
		 * @param {Date} rangeMax 全融通の存在期間 (最大)
		 * @param {Object.<string, number>} sumOfCumulateAmountWhsByHour 全融通の時間別融通電力量
		 */
		function doDisplayByHour(deals, rangeMin, rangeMax, sumOfCumulateAmountWhsByHour) {
			// 融通情報リストから時間別融通電力量を集計する
			const sumByHour = {};
			for (const aDeal of deals) {
				if (aDeal.cumulateAmountWh) {
					const created = (aDeal.createDateTime) ? new Date(aDeal.createDateTime) : null;
					if (created) {
						const h = created.getHours();
						if (sumByHour[h] === undefined) sumByHour[h] = 0;
						sumByHour[h] += aDeal.cumulateAmountWh;
					}
				}
			}
			const days = (rangeMin && rangeMax) ? Math.ceil((rangeMax.getTime() - rangeMin.getTime()) / (24 * 60 * 60 * 1000)) : Infinity;

			// 時間別融通電力量のグラフを表示する
			const chartData = [['hour', 'day', 'average']];
			for (let i = 0; i < 24; i++) {
				const sum = sumByHour[i] || 0;
				const avg = (sumOfCumulateAmountWhsByHour[i] || 0) / days;
				chartData.push([('0' + i).slice(-2), sum, avg]);
			}
			google.charts.load('current', {'packages': ['corechart']});
			google.charts.setOnLoadCallback(function() {
				const options = {
					height: 400,
					legend: {
						position: 'top',
					},
					intervals: {'style': 'line'},
					chartArea: {
						top: 50,
						left: 100,
						right: 50,
						bottom: 60,
					},
					hAxis: {
						title: 'hour',
						minValue: 0,
						slantedTextAngle: 90,
						textStyle: {
							fontSize: 11,
						},
					},
					vAxis: {
						title: 'amount [Wh]',
						minValue: 0,
					},
					animation: {
						startup: true,
						duration: 1000,
						easing: 'out',
					},
					seriesType: 'bars',
					series: {
						0: {color: '#34495E'},
						1: {type: 'line', color: '#2ECC71'},
					},
				};
				const chart = new google.visualization.ComboChart(document.getElementById('chart-amount-by-hour'));
				chart.draw(google.visualization.arrayToDataTable(chartData), options);
			});
		}

		/**
		 * 全融通情報を表示するテーブルを作成しダイアログを表示する
		 * @param {Date} periodFrom 融通情報の検索対象日付 (開始)
		 * @param {Date} periodTo 融通情報の検索対象日付 (終了)
		 * @param {Array.<Object>} deals 融通情報リスト
		 */
		function showDealsDialog(periodFrom, periodTo, deals) {
			dealsDataTable.clear();
			// テーブルを作成する
			for (const aDeal of deals) {
				const startDateTime = (aDeal.startDateTime) ? new Date(aDeal.startDateTime) : null;
				const stopDateTime = (aDeal.stopDateTime) ? new Date(aDeal.stopDateTime) : null;
				const status = (aDeal.scramDateTime) ? 'scram' : (aDeal.abortDateTime) ? 'abort' : (aDeal.deactivateDateTime) ? 'ok' : 'live';
				dealsDataTable.row.add([
					aDeal.dealId,
					aDeal.dischargeUnitId,
					aDeal.chargeUnitId,
					aDeal.type,
					aDeal.requestAmountWh.toLocaleString(),
					aDeal.dealAmountWh.toLocaleString(),
					(aDeal.cumulateAmountWh) ? (Math.round(aDeal.cumulateAmountWh * 100) / 100).toLocaleString() : 0,
					status,
					formatDate(startDateTime),
					formatDate(stopDateTime),
					'<button data-id="' + aDeal.dealId + '">detail...</button>',
				]);
			}
			dealsDataTable.draw();
			// 各行のボタンに当該融通情報の詳細表示処理を設定する
			$('#table-deals tbody').off('click').on('click', 'button', function() {
				const dealId = $(this).attr('data-id');
				for (const aDeal of deals) {
					if (aDeal.dealId == dealId) {
						doRowClicked(aDeal);
						break;
					}
				}
			});
			// ダイアログを表示する
			$('#dialog-deals').dialog({
				modal: true,
				closeOnEscape: true,
				width: '90%',
				height: 'auto',
				title: 'deals',
			});
		}

		/**
		 * 融通情報の詳細を表示する
		 * @param {Object} deal 融通情報
		 */
		function doRowClicked(deal) {
			// 表示用 html を生成しダイアログの中の要素にセットする
			const html = DetailView.buildHtml(deal);
			$('#deal-detail').html(html);

			// ダイアログを表示する
			$('#dialog-deal').dialog({
				modal: true,
				closeOnEscape: true,
				width: 600,
				height: 'auto',
				title: deal.dealId,
			});
		}

		// 集計ボタンに処理を設定する
		$('#button-aggregate').off('click').click(function() {
			// 日付文字列を取得しクッキーに保存する
			date = $('#input-date').val();
			Cookies.set('deal.date', date);
			if (date) {
				const fromDate = parseDate(date);
				const toDate = new Date(fromDate.getTime());
				// toDate は less than で検索するため fromDate プラス一日
				toDate.setDate(toDate.getDate() + 1);
				// サーバから融通情報を検索する
				client.deal.list(
					communityId,
					clusterId,
					fromDate,
					toDate,
					'raw',
					function(deals, textStatus) {
						// 各種表示
						doDisplayDeals(fromDate, toDate, deals);
						// サーバから融通の存在期間を取得する
						client.deal.datetimeRange(
							communityId,
							clusterId,
							function(range, textStatus) {
								// サーバから時間別の融通電力量集計を取得する
								client.deal.sumOfCumulateAmountWhsByHour(
									communityId,
									clusterId,
									function(sumOfCumulateAmountWhsByHour, textStatus) {
										const rangeMin = (range.min) ? new Date(range.min) : null;
										const rangeMax = (range.max) ? new Date(range.max) : null;
										// 時間別表示
										doDisplayByHour(deals, rangeMin, rangeMax, sumOfCumulateAmountWhsByHour);
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
					},
					function(jqXHR, textStatus, errorThrown) {
						alert(jqXHR.responseText);
					},
				);
			} else {
				alert('no date');
			}
		});

		$('#sum-of-amount-kwh').empty();
		$('#number-of-aborted-deals').empty();
		$('#number-of-scrammed-deals').empty();

		$('#button-show-deals-dialog').off('click');

		$('#chart-amount-by-unit').empty();
		$('#chart-amount-by-hour').empty();

		// 一覧表示テーブルを空で表示させておく
		dealsDataTable.clear().draw();

	});

});
