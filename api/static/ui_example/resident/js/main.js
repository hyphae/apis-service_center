/**
 * @file 居住者側 UI : 全画面で共通のスクリプト
 * 
 * セッション/ログイン/ログアウト, 設定変更などを処理しする.
 * 各機能ごとの画面処理を起動する.
 */

$(function () {

	/**
	 *  画面の選択肢
	 * 
	 * 設定ダイアログでの表示 : HTML ファイル名
	 */
	const displayDef = {
		VISUAL: 'visual.html',
		DEAL: 'deal.html',
		SCENARIO: 'scenario.html',
	};

	/**
	 * コミュニティ ID
	 * 
	 * クッキーで初期化する.
	 * @type {string}
	 */
	let communityId = Cookies.get('communityId');
	/**
	 * クラスタ ID
	 * 
	 * クッキーで初期化する.
	 * @type {string}
	 */
	let clusterId = Cookies.get('clusterId');
	/**
	 * ユニット ID
	 * 
	 * クッキーで初期化する.
	 * @type {string}
	 */
	let unitId = Cookies.get('unitId');

	/**
	 * コミュニティ階層構造
	 * @type {Object}
	 */
	let communityOutline = {};

	/**
	 * セッションの存在を保証する
	 * 
	 * セッションがなければログイン処理を実行する.
	 * @param {function(data,textStatus,jqXHR)} onSuccess セッション確認後に実行する処理
	 */
	const ensureSession = function(onSuccess) {
		// サーバに対しセッションの有無を確認する
		client.session(
			// セッションがあれば onSuccess を実行する
			onSuccess,
			// セッションがなければログイン処理を実行する
			function(jqXHR, textStatus, errorThrown) {
				// ログインダイアログを表示する
				$('#dialog-login').dialog({
					modal: true,
					closeOnEscape: false,
					width: 250,
					height: 'auto',
					title: 'login',
					buttons: [
						{
							text: 'login',
							class: 'login',
							// login ボタンクリック処理
							click: function() {
								const username = $('#login-username').val();
								const password = $('#login-password').val();
								// username と password が入力されている ?
								if (username && password) {
									const dlg = $(this);
									// サーバに対しユーザ認証を実行する
									client.login(username, password, function(json, textStatus, jqXHR) {
										// ログインが成功したらダイアログを閉じ onSuccess を実行する
										dlg.dialog('close');
										onSuccess(json, textStatus, jqXHR);
									}, function(jqXHR, textStatus, errorThrown) {
										alert(jqXHR.responseText);
									});
								}
							},
						},
					],
					// ダイアログを開いた時の処理
					open: function(event, ui) {
						// ダイアログを閉じる [×] ボタンを disable するおまじない
						$(this).closest('.ui-dialog').find('.ui-dialog-titlebar-close').addClass('ui-state-disabled');
					},
				});
			},
		);
	};

	/**
	 * 設定ダイアログを表示し設定する
	 * 
	 * コミュニティ/クラスタ/ユニット選択, 画面選択, およびログアウト機能を提供する.
	 * @param {function()} onSuccess ok ボタンのクリックで実行する処理
	 */
	const doSettingDialog = function(onSuccess) {
		// 設定ダイアログを表示する
		$('#dialog-setting').dialog({
			modal: true,
			closeOnEscape: true,
			width: 250,
			height: 'auto',
			title: 'setting',
			buttons: [
				{
					text: 'ok',
					class: 'ok',
					// ok ボタンクリック処理
					click: function() {
						const selectedCommunityId = $('#select-community').val();
						const selectedClusterId = $('#select-cluster').val();
						const selectedUnitId = $('#select-unit').val();
						// コミュニティ/クラスタ/ユニットが選択されている ?
						if (selectedCommunityId && selectedClusterId && selectedUnitId) {
							// グローバル変数を更新する
							communityId = selectedCommunityId;
							clusterId = selectedClusterId;
							unitId = selectedUnitId
							// クッキーに保存する
							Cookies.set('communityId', selectedCommunityId);
							Cookies.set('clusterId', selectedClusterId);
							Cookies.set('unitId', selectedUnitId);
							const selectedDisplay = $('#select-display').val();
							// 画面選択が現在の画面と同じ ?
							if (!selectedDisplay || selectedDisplay == location.href.split('/').pop()) {
								// ダイアログを閉じ onSuccess を実行する
								$(this).dialog('close');
								onSuccess();
							} else {
								// 画面遷移する
								location = selectedDisplay;
							}
						}
					},
				},
				{
					text: 'logout',
					class: 'logout',
					// logout ボタンクリック処理
					click: function() {
						// サーバに対しログアウトを実行する
						client.logout(function(json, textStatus) {
							// ブラウザをリロードする
							location.reload(false);
						});
					},
				},
			],
			// ダイアログを開いた時の処理
			open: function(event, ui) {
				// コミュニティ選択プルダウンの選択状態を初期化する
				$('#select-community').val(communityId);
				// クラスタ選択プルダウンの選択肢を更新する
				updateClusterList();
				// クラスタ選択プルダウンの選択状態を初期化する
				$('#select-cluster').val(clusterId);
				// ユニット選択プルダウンの選択肢を更新する
				updateUnitList()
				// ユニット選択プルダウンの選択状態を初期化する
				$('#select-unit').val(unitId);
				// 画面選択プルダウンの選択状態を初期化する
				$('#select-display').val(location.href.split('/').pop());
			},
		});
	};

	/**
	 * コミュニティ階層構造を取得する
	 * @param {function()} onSuccess 取得したあと実行する処理
	 */
	const loadCommunityOutline = function(onSuccess) {
		communityOutline = {};
		// サーバからコミュニティ階層構造を取得する
		client.community.outline(
			function(json, textStatus) {
				// 取得したデータをグローバル変数に格納する
				communityOutline = json;
				// 現在選択中のコミュニティ/クラスタ/ユニットが正しい値・組み合わせである ?
				if (communityOutline.communities[communityId] && communityOutline.communities[communityId].clusters[clusterId] && communityOutline.communities[communityId].clusters[clusterId].units[unitId]) {
					// ok
				} else {
					// 現在のコミュニティ/クラスタ/ユニットの選択状態を解除する
					communityId = null;
					clusterId = null;
					unitId = null;
				}
				onSuccess();
			},
			function(jqXHR, textStatus, errorThrown) {
				alert(jqXHR.responseText);
			},
			// コミュニティ選択プルダウンの選択肢を更新する
			updateCommunityList,
		);
	}

	/**
	 * 設定が揃った/変更されたので画面の表示処理を起動する
	 */
	const settingUpdated = function() {
		// HTML 上のコミュニティ/クラスタ/ユニット表示部分を更新する
		$('.community-name').text(communityOutline.communities[communityId].name);
		$('.cluster-name').text(communityOutline.communities[communityId].clusters[clusterId].name);
		$('.unit-name').text(communityOutline.communities[communityId].clusters[clusterId].units[unitId].name);
		// 表示処理を起動する
		$(document).trigger('startDisplay', [communityId, clusterId, unitId, communityOutline]);
	}

	/**
	 * コミュニティ選択プルダウンの選択肢を更新する
	 * 
	 * communityOutline グローバル変数からプルダウンを作り直す.
	 */
	const updateCommunityList = function() {
		const selectCommunity = $('#select-community');
		selectCommunity.empty().append('<option value="">--</option>');
		for (const id in communityOutline.communities) {
			aCommunity = communityOutline.communities[id];
			selectCommunity.append('<option value="' + aCommunity.id + '">' + aCommunity.name + '</option>');
		}
		updateClusterList();
	};

	/**
	 * クラスタ選択プルダウンの選択肢を更新する
	 * 
	 * コミュニティ選択プルダウンの選択状態に応じてプルダウンを作り直す.
	 */
	const updateClusterList = function() {
		const selectCluster = $('#select-cluster');
		selectCluster.empty().append('<option value="">--</option>');
		const theCommunityId = $('#select-community').val();
		if (theCommunityId) {
			for (const id in communityOutline.communities[theCommunityId].clusters) {
				aCluster = communityOutline.communities[theCommunityId].clusters[id];
				selectCluster.append('<option value="' + aCluster.id + '">' + aCluster.name + '</option>');
			}
		}
		updateUnitList();
	};

	/**
	 * ユニット選択プルダウンの選択肢を更新する
	 * 
	 * クラスタ選択プルダウンの選択状態に応じてプルダウンを作り直す.
	 */
	const updateUnitList = function() {
		const selectUnit = $('#select-unit');
		selectUnit.empty().append('<option value="">--</option>');
		const theCommunityId = $('#select-community').val();
		if (theCommunityId) {
			const theClusterId = $('#select-cluster').val();
			if (theClusterId) {
				for (const id in communityOutline.communities[theCommunityId].clusters[theClusterId].units) {
					aUnit = communityOutline.communities[theCommunityId].clusters[theClusterId].units[id];
					selectUnit.append('<option value="' + aUnit.id + '">' + aUnit.name + '</option>');
				}
			}
		}
	}

	// main.js 処理開始

	// 1. セッション保証
	// 2. コミュニティ階層構造取得
	// 3. ( 設定ダイアログによる設定 )
	// 4. 表示処理
	ensureSession(function() {
		loadCommunityOutline(function() {
			if (communityId && clusterId && unitId) {
				settingUpdated();
			} else {
				doSettingDialog(settingUpdated);
			}
		});
	});

	// 設定ダイアログ表示ハンドラを仕込む
	$('.setting-opener').click(function() {
		doSettingDialog(settingUpdated);
	});

	// コミュニティ選択プルダウンの変更でクラスタ選択プルダウンを更新する
	$('#select-community').change(updateClusterList);
	// クラスタ選択プルダウンの変更でユニット選択プルダウンを更新する
	$('#select-cluster').change(updateUnitList);

	// 画面選択プルダウンを作り直す
	for (const name in displayDef) {
		$('#select-display').append('<option value="' + displayDef[name] + '">' + name + '</option>');
	}

});
