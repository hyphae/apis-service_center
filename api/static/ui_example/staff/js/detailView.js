/**
 * JSON データをそのまま表示するツール
 * 
 * クラス関数 {@code DetailView.buildHtml(JSON_OBJECT)} で html を取得する.
 */

class DetailView {
	/**
	 * 詳細表示用の html を生成する
	 * @param {*} data 表示対象データ
	 * @return string
	 */
	static buildHtml(data) {
		const esc_ = function(val) { return $('<span/>').text(val).html(); };
		const formatDate_ = function(val) { return (val) ? val.getFullYear() + '-' + ('0' + (val.getMonth() + 1)).slice(-2) + '-' + ('0' + val.getDate()).slice(-2) + ' ' + ('0' + val.getHours()).slice(-2) + ':' + ('0' + val.getMinutes()).slice(-2) + ':' + ('0' + val.getSeconds()).slice(-2) : null; };
		const doAny_ = function(obj) {
			if ($.isPlainObject(obj)) {
				return doObj_(obj);
			} else if (Array.isArray(obj)) {
				return doArr_(obj);
			} else {
				return doVal_(obj);
			}
		};
		const doVal_ = function(obj) {
			if (typeof obj === 'string') {
				if (obj.search(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{0,3})?Z/) == 0) {
					return formatDate_(new Date(obj));
				}
			}
			return esc_(obj);
		};
		const doArr_ = function(obj) {
			let res = '<ol>';
			for (const aVal of obj) {
				res += '<li>';
				res += doAny_(aVal);
				res += '</li>';
			}
			res += '</ol>';
			return res;
		};
		const doObj_ = function(obj) {
			let res = '<dl>';
			for (const aKey in obj) {
				if (aKey == '_id') continue;
				res += '<dt>' + esc_(aKey) + '</dt><dd>';
				res += doAny_(obj[aKey]);
				res += '</dd>';
			}
			res += '</dl>';
			return res;
		};
		const html = doAny_(data);
		return html;
	}
}
