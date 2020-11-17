/**
 * 管理者側 API クライアントライブラリ
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
				"{% url 'staff:community:outline' %}",
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
		 * 指定したクラスタのユニットデータのユニット ID のリストを取得する
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		unitIdList: function(communityId, clusterId, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'staff:unit_data:unit_id_list' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
		/**
		 * 指定したクラスタのユニットデータの最新の一式を取得する
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		latestSet: function(communityId, clusterId, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'staff:unit_data:latest_set' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
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
		 * 指定したクラスタの実行中の融通情報のリストを取得する
		 * 
		 * formatType :
		 * - 'budo' : BUDO 形式 ( main_controller や VISUAL 表示が読み込む形式 )
		 * - それ以外 : APIS 本来の形式
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {string} formatType フォーマット
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		liveList: function(communityId, clusterId, formatType, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'staff:deal:live_list' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
					formatType: formatType,
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
		/**
		 * 指定したクラスタの融通情報を作成日時で検索する
		 * 
		 * datetimeFrom は「以上」 datetimeTo は「未満」で検索する.
		 * 
		 * formatType :
		 * - 'budo' : BUDO 形式 ( main_controller や VISUAL 表示が読み込む形式 )
		 * - それ以外 : APIS 本来の形式
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {Date} datetimeFrom 作成日時下限
		 * @param {Date} datetimeTo 作成日時上限
		 * @param {string} formatType フォーマット
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		list: function(communityId, clusterId, datetimeFrom, datetimeTo, formatType, onSuccess, onError, onComplete) {
			const data = {
				communityId: communityId,
				clusterId: clusterId,
			};
			if (datetimeFrom) data.datetimeFrom = datetimeFrom.toISOString();
			if (datetimeTo) data.datetimeTo = datetimeTo.toISOString();
			if (formatType) data.formatType = formatType;
			server_(
				'GET',
				"{% url 'staff:deal:list' %}",
				data,
				onSuccess,
				onError,
				onComplete,
			);
		},
		/**
		 * 指定したクラスタの全融通の作成日時の範囲を取得する
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		datetimeRange: function(communityId, clusterId, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'staff:deal:datetime_range' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
		/**
		 * 指定したクラスタの全融通の時間別融通電力量の集計結果を取得する
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		sumOfCumulateAmountWhsByHour: function(communityId, clusterId, onSuccess, onError, onComplete) {
			const timezone_ = function() {
				const offsetMin = new Date().getTimezoneOffset();
				return ((0 < offsetMin) ? '-' : '+') + ('0' + Math.floor(Math.abs(offsetMin) / 60)).slice(-2) + ':' + ('0' + (offsetMin % 60)).slice(-2);
			}
			server_(
				'GET',
				"{% url 'staff:deal:sum_of_cumulate_amount_whs_by_hour' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
					timezone: timezone_(),
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
	},
	/**
	 * ダウンタイム API
	 */
	downtime: {
		/**
		 * 指定したクラスタのダウンタイム抽出処理状態があるユニット ID のリストを取得する
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		unitIdList: function(communityId, clusterId, onSuccess, onError, onComplete) {
			server_(
				'GET',
				"{% url 'staff:downtime:unit_id_list' %}",
				{
					communityId: communityId,
					clusterId: clusterId,
				},
				onSuccess,
				onError,
				onComplete,
			);
		},
		/**
		 * 指定したクラスタのダウンタイムを日時で検索する
		 * 
		 * unitId を指定すれば指定したユニットのダウンタイムのみに絞る.
		 * 
		 * datetimeFrom は「以上」 datetimeTo は「未満」で検索する.
		 * 
		 * @param {string} communityId コミュニティ ID
		 * @param {string} clusterId クラスタ ID
		 * @param {string} unitId ユニット ID
		 * @param {Date} datetimeFrom 検索日時下限
		 * @param {Date} datetimeTo 検索日時上限
		 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
		 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
		 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
		 */
		list: function(communityId, clusterId, unitId, datetimeFrom, datetimeTo, onSuccess, onError, onComplete) {
			const data = {
				communityId: communityId,
				clusterId: clusterId,
			};
			if (unitId) data.unitId = unitId;
			if (datetimeFrom) data.datetimeFrom = datetimeFrom.toISOString();
			if (datetimeTo) data.datetimeTo = datetimeTo.toISOString();
			server_(
				'GET',
				"{% url 'staff:downtime:list' %}",
				data,
				onSuccess,
				onError,
				onComplete,
			);
		},
	},
	/**
	 * 障害監視 API
	 */
	monitoring: {
		/**
		 * 障害監視 / 障害 API
		 */
		failure: {
			/**
			 * 指定したクラスタのアクティブな障害情報を取得する
			 * 
			 * @param {string} communityId コミュニティ ID
			 * @param {string} clusterId クラスタ ID
			 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
			 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
			 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
			 */
			openList: function(communityId, clusterId, onSuccess, onError, onComplete) {
				server_(
					'GET',
					"{% url 'staff:monitoring:failure_open_list' %}",
					{
						communityId: communityId,
						clusterId: clusterId,
					},
					onSuccess,
					onError,
					onComplete,
				);
			},
			/**
			 * 指定したクラスタの障害情報を日時で検索する
			 * 
			 * datetimeFrom は「以上」 datetimeTo は「未満」で検索する.
			 * 
			 * @param {string} communityId コミュニティ ID
			 * @param {string} clusterId クラスタ ID
			 * @param {Date} datetimeFrom 検索日時下限
			 * @param {Date} datetimeTo 検索日時上限
			 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
			 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
			 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
			 */
			list: function(communityId, clusterId, datetimeFrom, datetimeTo, onSuccess, onError, onComplete) {
				const data = {
					communityId: communityId,
					clusterId: clusterId,
				};
				if (datetimeFrom) data.datetimeFrom = datetimeFrom.toISOString();
				if (datetimeTo) data.datetimeTo = datetimeTo.toISOString();
				server_(
					'GET',
					"{% url 'staff:monitoring:failure_list' %}",
					data,
					onSuccess,
					onError,
					onComplete,
				);
			},
		},
		/**
		 * 障害監視 / 処理 API
		 */
		job: {
			/**
			 * 指定したクラスタの障害監視処理の状態を取得する
			 * 
			 * @param {string} communityId コミュニティ ID
			 * @param {string} clusterId クラスタ ID
			 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
			 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
			 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
			 */
			list: function(communityId, clusterId, onSuccess, onError, onComplete) {
				server_(
					'GET',
					"{% url 'staff:monitoring:job_list' %}",
					{
						communityId: communityId,
						clusterId: clusterId,
					},
					onSuccess,
					onError,
					onComplete,
				);
			},
			/**
			 * 指定したクラスタの指定した障害監視処理を有効にする
			 * 
			 * @param {string} communityId コミュニティ ID
			 * @param {string} clusterId クラスタ ID
			 * @param {string} type 処理の種類
			 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
			 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
			 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
			 */
			activate: function(communityId, clusterId, type, onSuccess, onError, onComplete) {
				server_(
					'GET',
					"{% url 'staff:monitoring:job_activate' %}",
					{
						communityId: communityId,
						clusterId: clusterId,
						type: type,
					},
					onSuccess,
					onError,
					onComplete,
				);
			},
			/**
			 * 指定したクラスタの指定した障害監視処理を無効にする
			 * 
			 * @param {string} communityId コミュニティ ID
			 * @param {string} clusterId クラスタ ID
			 * @param {string} type 処理の種類
			 * @param {function(data,textStatus,jqXHR)} onSuccess 成功時に実行するコールバック関数
			 * @param {function(jqXHR,textStatus,errorThrown)} onError 失敗時に実行するコールバック関数
			 * @param {function(data|jqXHR,textStatus,jqXHR|errorThrown)} onComplete 成功失敗に関わらず実行するコールバック関数
			 */
			deactivate: function(communityId, clusterId, type, onSuccess, onError, onComplete) {
				server_(
					'GET',
					"{% url 'staff:monitoring:job_deactivate' %}",
					{
						communityId: communityId,
						clusterId: clusterId,
						type: type,
					},
					onSuccess,
					onError,
					onComplete,
				);
			},
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
//	const myUrl = "{% url 'staff:client_js' %}";
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
