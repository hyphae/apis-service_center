/**
 * @file 管理者側 UI : VISUAL 画面 : 各種パラメタ設定
 */

var mainCanvas = {w:0, h:0};
var info = {};
var routes = [];

var MAX_PVC = 0;
var MAX_CONSU = 0;
var MAX_AC_GRID = 0;
var MAX_DC_GRID = 0;

var SCALE_EP = 0;

var LOW_PVC = 0;
var LOW_CONSU = 0;
var LOW_AC_GRID = 0;
var LOW_DCDC = 0;

/**
 * コミュニティ/クラスタの階層構造で各種パラメタを記述しておく
 */
var config = {
	'oss_community' : {
		'oss_cluster' : {
			mainCanvas : {w: 450, h: 500},
			info : {
				E001: {x: 0, y: 0, label: 'house001'},
				E002: {x: 1, y: 0, label: 'house002'},
				E003: {x: 0, y: 1, label: 'house003'},
				E004: {x: 1, y: 1, label: 'house004'},
			},
			routes : [
				[{x:0, y:0}, {x:2, y:0}, {x:2, y:1}, {x:0, y:1}],
			],
			MAX_PVC : 3000,
			MAX_CONSU : 3000,
			MAX_AC_GRID : 3000,
			MAX_DC_GRID : 1000,
			SCALE_EP : 2000,
			LOW_PVC : 200,
			LOW_CONSU : 100,
			LOW_AC_GRID : 400,
			LOW_DCDC : 40,
		},
	},
};

/**
 * 指定されたコミュニティ/クラスタ向けにパラメタを初期化する
 * @param {string} communityId コミュニティ ID
 * @param {string} clusterId クラスタ ID
 */
var initVisualConfig = function(communityId, clusterId) {
	mainCanvas = {w:0, h:0};
	info = {};
	routes = [];
	SCALE_EP = 0;
	LOW_DCDC = 0;
	var conf = config[communityId];
	if (conf) {
		conf = conf[clusterId];
		if (conf) {
			mainCanvas = conf.mainCanvas;
			info = conf.info;
			routes = conf.routes;
			MAX_PVC = conf.MAX_PVC;
			MAX_CONSU = conf.MAX_CONSU;
			MAX_AC_GRID = conf.MAX_AC_GRID;
			MAX_DC_GRID = conf.MAX_DC_GRID;
			SCALE_EP = conf.SCALE_EP;
			LOW_PVC = conf.LOW_PVC;
			LOW_CONSU = conf.LOW_CONSU;
			LOW_AC_GRID = conf.LOW_AC_GRID;
			LOW_DCDC = conf.LOW_DCDC;
		}
	}
};
