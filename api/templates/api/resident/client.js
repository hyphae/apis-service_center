/**
 * 居住者側 API クライアントライブラリ
 */

(function() {

'use strict';

const root = (typeof self === 'object' && self.self === self && self) || (typeof global === 'object' && global.global === global && global) || this || {};
/**
 * クライアントライブラリ本体
 */
root.client = root.client || {
	/**
	 * セッション情報を取得する
	 * 
	 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
	 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
	 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
	 */
	session: function(onSuccess, onError, onComplete) {
		server_(
			'GET',
			"{% url 'core:session' %}",
			null,
			onSuccess,
			onError,
			onComplete,
		);
	},
	/**
	 * ログインする
	 * 
	 * 成功したらセッション情報を返す.
	 * 
	 * @param {string} username ユーザ名
	 * @param {string} password パスワード
	 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
	 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
	 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
	 */
	login: function(username, password, onSuccess, onError, onComplete) {
		csrftoken_(
			function(json) {
				server_(
					'POST',
					"{% url 'core:login' %}",
					{
						username: username,
						password: password,
						csrfmiddlewaretoken: json.csrfmiddlewaretoken,
					},
					onSuccess,
					onError,
					onComplete,
				);
			},
			function(jqXHR, textStatus, errorThrown) {
				onError(jqXHR, textStatus, errorThrown);
			},
			function(jqXHR, textStatus) {
			},
		);
	},
	/**
	 * ログアウトする
	 * 
	 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
	 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
	 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
	 */
	logout: function(onSuccess, onError, onComplete) {
		server_(
			'GET',
			"{% url 'core:logout' %}",
			null,
			onSuccess,
			onError,
			onComplete,
		);
	},
	/**
	 * コミュニティ API
	 */
	community: {
		/**
		 * コミュニティ/クラスタ/ユニットの階層構造を取得する
		 * 
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		outline: function(onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'resident:community:outline' %}",
				null,
				onSuccess,
				onError,
				onComplete,
			);
		},
	},
	/**
	 * ユニットデータ API
	 */
	unitData: {
		/**
		 * 指定したユニットのユニットデータの最新の一式を取得する
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {string} unitId ユニット ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		latestSet: function(communityId, clusterId, unitId, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'resident:unit_data:latest_set' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
					unitId: unitId,
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
	},
	/**
	 * 融通情報 API
	 */
	deal: {
		/**
		 * 指定したユニットが参加中の融通情報のリストを取得する
		 * 
		 * formatType :
		 * - 'budo' : BUDO 形式 ( main_controller や VISUAL 表示が読み込む形式 )
		 * - それ以外 : APIS 本来の形式から必要最低限の属性に絞ったもの
		 * 
		 * 指定したユニット以外の情報は削除するか伏せ文字に変換して返す.
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {string} unitId ユニット ID
		 * @param {string} formatType フォーマット
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		liveList: function(communityId, clusterId, unitId, formatType, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'resident:deal:live_list' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
					unitId: unitId,
					formatType: formatType,
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
		/**
		 * 指定したユニットが参加した融通情報を作成日時で検索する
		 * 
		 * datetimeFrom は「以上」 datetimeTo は「未満」で検索する.
		 * 
		 * formatType :
		 * - 'budo' : BUDO 形式 ( main_controller や VISUAL 表示が読み込む形式 )
		 * - それ以外 : APIS 本来の形式から必要最低限の属性に絞ったもの
		 * 
		 * 指定したユニット以外の情報は削除するか伏せ文字に変換して返す.
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {string} unitId ユニット ID
		 * @param {Date} datetimeFrom 作成日時下限
		 * @param {Date} datetimeTo 作成日時上限
		 * @param {string} formatType フォーマット
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		list: function(communityId, clusterId, unitId, datetimeFrom, datetimeTo, formatType, onSuccess, onError, onComplete) {
			const data = {
				communityId: communityId,
				clusterId: clusterId,
				unitId: unitId,
			};
			if (datetimeFrom) data.datetimeFrom = datetimeFrom.toISOString();
			if (datetimeTo) data.datetimeTo = datetimeTo.toISOString();
			if (formatType) data.formatType = formatType;
			server_(
				'GET',
				"{% url 'resident:deal:list' %}",
				data,
				onSuccess,
				onError,
				onComplete,
			);
		},
		/**
		 * 指定したユニットが参加した全融通の作成日時の範囲を取得する
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {string} unitId ユニット ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		datetimeRange: function(communityId, clusterId, unitId, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'resident:deal:datetime_range' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
					unitId: unitId,
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
		/**
		 * 指定したユニットが参加した全融通の時間別融通電力量の集計結果を取得する
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {string} unitId ユニット ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		sumOfCumulateAmountWhsByHour: function(communityId, clusterId, unitId, onSuccess, onError, onComplete) {
			const timezone_ = function() {
				const offsetMin = new Date().getTimezoneOffset();
				return ((0 < offsetMin) ? '-' : '+') + ('0' + Math.floor(Math.abs(offsetMin) / 60)).slice(-2) + ':' + ('0' + (offsetMin % 60)).slice(-2);
			}
			server_(
				'GET',
				"{% url 'resident:deal:sum_of_cumulate_amount_whs_by_hour' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
					unitId: unitId,
					timezone: timezone_(),
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
	},
	/**
	 * シナリオ API
	 */
	scenario: {
		/**
		 * 指定したユニットが参照可能なシナリオ情報のリストを取得する
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {string} unitId ユニット ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		availableList: function(communityId, clusterId, unitId, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'resident:scenario:available_list' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
					unitId: unitId,
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
		/**
		 * 指定したユニットが現在選択中のシナリオ情報を取得する
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {string} unitId ユニット ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		current: function(communityId, clusterId, unitId, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'resident:scenario:current' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
					unitId: unitId,
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
		/**
		 * 指定したユニットのシナリオを選択する
		 * 
		 * scenarioId に null を指定すると選択を解除する.
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {string} unitId ユニット ID
		 * @param {number} scenarioId シナリオ ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		choose: function(communityId, clusterId, unitId, scenarioId, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'resident:scenario:choose' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
					unitId: unitId,
					scenarioId: scenarioId,
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
	},
};

function csrftoken_(onSuccess, onError, onComplete) {
	server_(
		'GET',
		"{% url 'core:csrftoken' %}",
		null,
		onSuccess,
		onError,
		onComplete,
	);
}
function server_(type, url, data, onSuccess, onError, onComplete) {
	$.ajax({
		type: type || 'GET',
		//url: fixedUrl_(url), // apache の reverse proxy との連携ができていないので力尽く...
		url: url,
		data: data,
	}).done(function(json, textStatus, jqXHR) {
		if (onSuccess) onSuccess(json, textStatus, jqXHR);
	}).fail(function(jqXHR, textStatus, errorThrown) {
		if (onError) onError(jqXHR, textStatus, errorThrown);
	}).always(function(jqXHR, textStatus) {
		if (onComplete) onComplete(jqXHR, textStatus);
	});
}

//function fixedUrl_(url) {
//	return baseUrl__ + url;
//}
//const baseUrl__ = (function() {
//	const myUrl = "{% url 'resident:client_js' %}";
//	if (document.currentScript && document.currentScript.src.endsWith(myUrl)) {
//		return document.currentScript.src.replace(myUrl, '');
//	}
//	for (let script of document.getElementsByTagName('script')) {
//		if (script.src.endsWith(myUrl)) {
//			return script.src.replace(myUrl, '');
//		}
//	}
//	return '';
//})();

}());
