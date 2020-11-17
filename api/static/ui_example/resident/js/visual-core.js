/**
 * @file 居住者側 UI : VISUAL 画面 : 描画処理の本体
 */

var isFirstTimeInit = true;

var ctx;
var canvas;
var w;
var h;

var loading = false;
var oesNode = {x: 200, y: 200};

var lastPulse = -1;

var latestGlobalUpdate = -1;

/**
 * 融通情報
 * @type {Object.<string,Deal>}
 */
var dealsViz = {};

/** 全体の拡大縮小率 */
var globalScale = 1;
var unitId;
/**
 * ユニット
 * @type {Object.<string,Server>}
 */
var servers = {};
/**
 * 融通相手を表す擬似ユニット
 * @type {Object.<string,Server>}
 */
var phantomServers = {};
var message = '';
var closest;


/**
 * 色を表すクラス
 * @param {number} r Red 値
 * @param {number} g Green 値
 * @param {number} b Blue 値
 */
var Color = function(r, g, b) {
	this.r = r;
	this.g = g;
	this.b = b;
}
/** 緑色 */
var COLOR_GREEN = new Color(0, 1, 0);
/** 赤色 */
var COLOR_RED = new Color(1, 0, 0);
/** 白色 */
var COLOR_WHITE = new Color(1, 1, 1);

/**
 * 点を表すクラス
 * @param {number} x X 座標
 * @param {number} y Y 座標
 */
var Point = function(x, y) {
	this.x = x;
	this.y = y;
}


var colorLerp = function(sc, ec, f) {
	var r = sc.r * (1 - f) + f * ec.r;
	var g = sc.g * (1 - f) + f * ec.g;
	var b = sc.b * (1 - f) + f * ec.b;
	return colorString(r * 255, g * 255, b * 255);
}

var distance = function(pt0, pt1) {
	return Math.sqrt((pt1.x - pt0.x) * (pt1.x - pt0.x) + (pt1.y - pt0.y) * (pt1.y - pt0.y));
}


/**
 * 電力の流れを表す線を表すクラス
 * @param {Array.<Point>} points 線を構成する点の配列
 * @param {Color} startCol 始点での色
 * @param {Color} endCol 終点での色
 * @param {number} size 点のサイズ
 * @param {number} phase 位相 (?)
 */
var EnergyPath = function(points, startCol, endCol, size, phase) {
	this.points = points;
	this.startCol = startCol;
	this.endCol = endCol;
	this.phase = phase;
	this.lengths = new Array();
	this.size = size;

	//compute length between the pairs of points
	//lengths is the list of lengths from the start
	this.lengths.push(0);
	for (var i = 0, len = points.length - 1; i < len; ++i) {
		var pt0 = points[i];
		var pt1 = points[i + 1];
		var l = distance(pt0, pt1);
		if (0 < this.lengths.length) l += this.lengths[this.lengths.length - 1];
		this.lengths.push(l);
	}

	//the complete length
	this.totallength = this.lengths[this.lengths.length - 1];
}

/**
 * 線を描画する
 * @param {number} dt 位相変位
 */
EnergyPath.prototype.draw = function(dt) {
	if (dt == undefined) return;
	if (dt == null) return;
	//add the time to the phase
	this.phase += dt;
	if (1 < this.phase) this.phase -= 1;
	if (this.phase < 0) this.phase += 1;
	//one rect every 5 pixels
	var n = Math.floor(this.totallength / 10);

	for (var i = 0; i < n; ++i) {
		//the point at i
		var frac = (i + this.phase) / n;
		if (1 <= frac) frac -= 1;
		if (frac < 0) frac += 1;
		//on which part of the path the rect is?
		var k = 0;
		while (k < this.lengths.length && (this.lengths[k] <= frac * this.totallength)) {
			k++;
		}
		//console.log(k);
		//k is the segment
		if (k != 1) {
			//console.log('k is ' + k);
			//console.log(this.lengths);
			//console.log(frac);
			//console.log(frac*this.totalLength);
			k = 1;
		}
		var ff = (frac * this.totallength - this.lengths[k-1]) / (this.lengths[k] - this.lengths[k-1]);
		var x = this.points[k - 1].x * (1 - ff) + ff * this.points[k].x;
		var y = this.points[k - 1].y * (1 - ff) + ff * this.points[k].y;
		var cc = colorLerp(this.startCol, this.endCol, frac);
		ctx.fillStyle = cc;
		ctx.fillRect(x - this.size, y - this.size, this.size * 2, this.size * 2);
	}
}


/**
 * 融通を表すクラス
 * @param {Object}} data 融通情報
 */
var Deal = function (data) {
	this.start = Date.now();
	this.exists = true;

	this.id = data.id;
	this.isMasterDeal = data.isMasterDeal;
	this.requester = data.requester;
	this.responder = data.responder;
	this.request = data.request;
	this.startTime = data.startTime;
	this.chargingUnit = data.chargingUnit;
	this.dischargingUnit = data.dischargingUnit;
	this.full = false;
	this.phase = 0;
}

/**
 * 同じ融通か否か
 * @param {Deal} one 他の Deal オブジェクト
 * @return {boolean} 同じか否か
 */
Deal.prototype.equals = function(one) {
	return this.id == one.id;
}


/**
 * ユニットを表すクラス
 * @param {string} id ユニット ID
 * @param {string} name ユニット名
 */
var Server = function(id, name, is_phantom) {
	this.name = name;
	//console.log('Added: ' + id + ' / ' + name);
	this.id = id;
	this.is_phantom = is_phantom;
	/* individual values */
	this.rsoc = undefined;
	this.battery_operation_status = undefined;
	this.battery_voltage = undefined;
	this.pv_power = undefined;
	this.ac_input_power = undefined;
	this.ac_input_voltage = undefined;
	this.out_power = undefined;
	this.out_voltage = undefined;
	this.tmp = undefined;
	this.dc_power = undefined;
	this.dc_voltage = undefined;
	this.is_voltage_reference = false;
	this.is_grid_master = false;
	this.global_operation_mode = undefined;
	this.local_operation_mode = undefined;
	this.effective_operation_mode = undefined;

	/* position */
	this.posx = 0;
	this.posy = 0;

	/* upkeep */
	this.exists = true;

	this.lastUpdate = -1;
	this.lastUpdateChanged = -1;

	/* energy paths */

	var Pt0 = new Point(50, 5);
	var Pt1 = new Point(50, 95);
	var pts0 = [Pt0, Pt1];
	this.epPVC = new EnergyPath(pts0, COLOR_WHITE, COLOR_GREEN, 2, 0);

	var Pt2 = new Point(0, 60);
	var Pt3 = new Point(20, 60);
	var pts1 = [Pt2, Pt3];
	this.epGRID = new EnergyPath(pts1, COLOR_RED, COLOR_GREEN, 2, 0);

	var Pt4 = new Point(80, 60);
	var Pt5 = new Point(100, 60);
	var pts2 = [Pt4, Pt5];
	this.epCONS = new EnergyPath(pts2, COLOR_GREEN, COLOR_WHITE, 2, 0);

	var Pt6 = new Point(50, 120);
	var Pt7 = new Point(50, 100);
	var pts3 = [Pt6, Pt7];
	this.epDCDC = new EnergyPath(pts3, COLOR_WHITE, COLOR_GREEN, 2, 0);
}

const SCALE_PHANTOM = 0.5;
const SCALE_THEUNIT = 1.2;
/**
 * 描画時の拡大縮小率
 * - 実ユニット (自ユニット) : SCALE_THEUNIT
 * - 擬似ユニット (融通相手ユニット) : SCALE_PHANTOM
 * @return {number} 拡大縮小率
 */
Server.prototype.scale = function() {
	return (this.is_phantom) ? SCALE_PHANTOM : SCALE_THEUNIT;
}

/**
 * 自ユニットが指定されたユニット達と互いに離れるように動かす
 * @param {Object.<string,Server>} all ユニット辞書
 */
Server.prototype.pushAway = function(all) {
	for (var id in all) {
		var other = all[id];
		if (this.id != id) {
			var d = Math.sqrt((this.posx - other.posx) * (this.posx - other.posx) + (this.posy - other.posy) * (this.posy - other.posy));
			if (d < 140) {
				other.posx += (other.posx - this.posx) * 2 / d;
				other.posy += (other.posy - this.posy) * 2 / d;
				this.posx -= (other.posx - this.posx) * 2 / d;
				this.posy -= (other.posy - this.posy) * 2 / d;
			}
		}
	}
}

/**
 * 自ユニットが指定したユニットに近づくように動かす
 * @param {Server} other ユニット
 */
Server.prototype.pullTowards = function(other) {
	let CONST = 180;
	var d = Math.sqrt((this.posx - other.posx) * (this.posx - other.posx) + (this.posy - other.posy) * (this.posy - other.posy));
	if (CONST < d) {
		var f = (d - CONST) / CONST;
		this.posx += (other.posx - this.posx) * 10 / d * f * f * f;
		this.posy += (other.posy - this.posy) * 10 / d * f * f * f;
	}
}

/**
 * 自ユニットが指定された座標から離れるように動かす
 * @param {Object.<string,number>} other 座標
 */
Server.prototype.pushAwaySingle = function(other) {
	var d = Math.sqrt((this.posx - other.x) * (this.posx - other.x) + (this.posy - other.y) * (this.posy - other.y));
	if (d < 140) {
		this.posx -= (other.x - this.posx) * 1 / d;
		this.posy -= (other.y - this.posy) * 1 / d;
	}
	if (d < 200 && Math.abs(this.dcgrid) < LOW_DCDC) {
		this.posx -= (other.x - this.posx) * 10 / d;
		this.posy -= (other.y - this.posy) * 10 / d;
	}
}

/**
 * ちょっとわかりません...
 * @param {number} x0 ちょっとわかりません...
 * @param {number} y0 ちょっとわかりません...
 * @param {number} x1 ちょっとわかりません...
 * @param {number} y1 ちょっとわかりません...
 * @return {boolean} 全体を縮小表示する必要があるか否か
 */
Server.prototype.pushInside = function(x0, y0, x1, y1) {
	var needed = false; 
	if (this.posx < (60 + x0)) {
		this.posx += 3;
		needed = true;
	}
	if ((x1 - 60) < this.posx) {
		this.posx -= 3;
		needed = true;
	}
	if (this.posy < (60 + y0)) {
		this.posy += 3;
		needed = true;
	}
	if ((y1 - 60) < this.posy) {
		this.posy -= 3;
		needed = true;
	}
	return needed;
}

/**
 * 指定した点からの距離を返す
 * @param {number} x X 座標
 * @param {number} y Y 座標
 * @return {number} 距離
 */
Server.prototype.distanceTo = function(x, y) {
	return Math.sqrt((x - this.posx) * (x - this.posx) + (y - this.posy) * (y - this.posy));
}

/**
 * 描画する
 * - detail 1 以上 : イラスト的なものを描画する
 * - detail 2 以上 : 数値データを表示する
 * @param {number} detail 詳細度
 */
Server.prototype.draw = function(detail) {
	// 描画コンテクストを保存して
	ctx.save();
	// 描画する座標に移動して
	const delta = 50 * this.scale();
	ctx.translate(this.posx - delta, this.posy - delta);
	// 拡大/縮小して
	ctx.scale(this.scale(), this.scale());
	// 描画して
	this.drawSimple(detail);
	// 描画コンテクストを戻す
	ctx.restore();
}

/**
 * 実際に描画する
 * - detail 1 以上 : イラスト的なものを描画する
 * - detail 2 以上 : 数値データを表示する
 * @param {number} detail 詳細度
 */
Server.prototype.drawSimple = function(detail) {

	//shape
	ctx.fillStyle = (!this.is_phantom && this.exists) ? 'black' : 'rgb(100, 100, 100)';
	ctx.fillRect(25, 0, 50, 5);
	ctx.fillRect(45, 5, 10, 10);
	ctx.fillRect(25, 15, 50, 85);

	// 擬似ユニットはここまでで終わり
	if (this.is_phantom) return;

	//EPs
	if (LOW_PVC < Math.abs(this.pv_power)) this.epPVC.draw(Math.abs(this.pv_power / SCALE_EP * .1));
	if (LOW_AC_GRID < Math.abs(this.ac_input_power)) this.epGRID.draw(Math.abs(this.ac_input_power / SCALE_EP * .1));
	if (LOW_CONSU < Math.abs(this.out_power)) this.epCONS.draw(Math.abs(this.out_power / SCALE_EP * .1));
	if (LOW_DCDC < Math.abs(this.dc_power)) this.epDCDC.draw((this.dc_power / SCALE_EP * .3));

	//fill with battery
	if (this.rsoc !== undefined) {
		var f = this.rsoc / 100;
		var fillStyle = 'rgb(0, 255, 0)';
		//voltage reference
		// if (this.is_voltage_reference) fillStyle = 'rgb(200, 255, 0)';
		if (!this.exists) fillStyle = 'rgb(0, 100, 0)';
		ctx.fillStyle = fillStyle;
		ctx.fillRect(26, 15 + (1 - f) * 84, 48, f * 84);
	}

	//solar panel
	if (this.pv_power != undefined) {
		var ff = Math.floor(this.pv_power * 255 / MAX_PVC);
		ctx.fillStyle = colorString(ff, ff, ff);
		ctx.fillRect(26, 1, 48, 3);
	}

	// if (this.exists) {
	// 	ctx.textAlign = 'center';
	// 	ctx.fillStyle = 'white';
	// 	ctx.fillText(this.name, 50, -25);
	// } else {
	// 	var now = Date.now();
	// 	var frac = now % 1000 * 1.0 / 1000;
	// 	var f = Math.floor(255 * (.75 + .25 * Math.cos(frac * 2 * Math.PI)));
	// 	ctx.textAlign = 'center';
	// 	ctx.fillStyle = 'rgb(' + f + ',0 ,0)';
	// 	ctx.fillText('No DATA ' + this.name, 50, -25);
	// }

	//rsoc
	if (this.rsoc !== undefined) {
		var y = 30;
		if (70 < this.rsoc) {
			var f = this.rsoc / 100;
			y = 30 + (1 - f) * 84;
			ctx.fillStyle = 'black';
		} else {
			ctx.fillStyle = 'white';
		}
		var rs = this.rsoc.toFixed();
		ctx.textAlign = 'center';
		ctx.textBaseline = 'alphabetic';
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 4;
		ctx.strokeStyle = 'none';
		ctx.lineWidth = 1;
		ctx.fillText(rs + '%', 50, y);
	}

	// 詳細度 1 以上でイラスト的なものを描画する
	if (1 <= detail) {
		if (this.ac_input_power !== undefined) {
			//draw the grid plug
			ctx.strokeStyle = 'white';
			ctx.beginPath();
			ctx.moveTo(25, 56);
			ctx.lineTo(0, 56);
			ctx.arc(-4, 56, 4, 0, - Math.PI / 2, true);
			ctx.lineTo(-5, 68);
			ctx.arc(-4, 64, 4, Math.PI / 2, 0, true);
			ctx.lineTo(25, 64);
			ctx.moveTo(-5, 62);
			ctx.lineTo(-10, 62);
			ctx.moveTo(-5, 58);
			ctx.lineTo(-10, 58);
			ctx.stroke();
		}
		if (this.out_power !== undefined) {
			//the ac out to people
			ctx.strokeStyle = 'white';
			ctx.beginPath();
			ctx.moveTo(75, 56);
			ctx.lineTo(100, 56);
			ctx.moveTo(75, 64);
			ctx.lineTo(100, 64);
			ctx.stroke();

			//draw person
			ctx.strokeStyle = 'white';
			ctx.beginPath();
			ctx.arc( 110, 40, 4, 0, 360, false);
			ctx.moveTo(110, 45);
			ctx.lineTo(110, 60);
			let handY = (2 <= detail) ? 48 : 52;
			ctx.moveTo(103, handY);
			ctx.lineTo(110, 50);
			ctx.lineTo(117, handY);
			ctx.moveTo(105, 68);
			ctx.lineTo(110, 58);
			ctx.lineTo(115, 68);
			ctx.stroke();
		}
	}

	// 詳細度 2 以上で数値データを表示する
	if (2 <= detail) {
		//labels
		ctx.fillStyle = 'white';
		ctx.textAlign = 'center';
		if (this.pv_power !== undefined) ctx.fillText(this.pv_power.toFixed() + 'W', 50, -5);
		ctx.textAlign = 'right';
		if (this.ac_input_power !== undefined) ctx.fillText(this.ac_input_power + 'W', 20, 30);
		if (this.ac_input_voltage !== undefined) ctx.fillText(this.ac_input_voltage + 'V', 20, 45);
		if (this.out_power !== undefined) ctx.fillText(this.out_power + 'W', 120, 81);
		if (this.out_voltage !== undefined) ctx.fillText(this.out_voltage + 'V', 120, 96);
		if (this.dc_voltage !== undefined) ctx.fillText(this.dc_voltage + 'V', 45, 115);
		ctx.textAlign = 'left';
		if (this.dc_power !== undefined) ctx.fillText(this.dc_power + 'W', 55, 115);
	}
}



/**
 * マウスのキャンバス内での相対座標を取得する
 * @param {Element} canvas 描画対象 DOM 要素
 * @param {Event} evt イベント
 * @return {Object.<string,number>} 座標
 */
function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect();
	return {
		x: oesNode.x + (evt.clientX - rect.left - oesNode.x) / globalScale,
		y: oesNode.y + (evt.clientY - rect.top - oesNode.y) / globalScale
	};
}

/**
 * 10 進 RGB 表記を返す
 * @param {number} r Red 値
 * @param {number} g Green 値
 * @param {number} b Blue 値
 * @return {string} 10 進 RGB 表記文字列
 */
function colorString(r, g, b) {
	return 'rgb(' + Math.round(r) + ', ' + Math.round(g) + ', ' + Math.round(b) + ')';
}


/**
 * マウスの移動を受け取るコールバック
 * @param {Event} e イベント
 */
function mouseMove(e) {
	const mousePos = getMousePos(canvas, e);
	message = '';
	// 「オンマウス」と判定する距離は 50 以下
	var d = 50;
	// マウスに一番近いユニットを探す
	closest = undefined;
	for (const id in servers) {
		const s = servers[id];
		const dn = s.distanceTo(mousePos.x, mousePos.y);
		if (dn < d) {
			d = dn;
			closest = s;
		}
	}
	for (const id in phantomServers) {
		const s = phantomServers[id];
		const dn = s.distanceTo(mousePos.x, mousePos.y);
		if (dn < d) {
			d = dn;
			closest = s;
		}
	}
	if (closest != undefined) {
		if (closest.id == unitId) {
			// オンマウスなユニットが自ユニットである場合
			const startTimes = new Array();
			for (const id in dealsViz) {
				const d = dealsViz[id];
				if (closest.id == d.chargingUnit || closest.id == d.dischargingUnit) {
					startTimes.push(localDateString(d.startTime));
				}
			}
			if (startTimes.length) {
				message = 'exchanging since ' + startTimes.join(', ');
			}
		} else {
			// オンマウスなユニットが擬似ユニットである場合
			const d = dealsViz[closest.id];
			if (d) {
				message = 'exchanging since ' + localDateString(d.startTime);
			}
		}
	}
}


function smoothStep(x) {
	return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * 全体を描画する
 */
function drawAll() {
	/* draw pulse */
	var now = Date.now();
	if (lastPulse + 3000 < now) {
		lastPulse = now;
	}
	var fracPulse = (now - lastPulse) / 3000;
	ctx.strokeStyle = 'rgb(48, 90, 48)';
	ctx.beginPath();
	ctx.arc(oesNode.x, oesNode.y, fracPulse * 1000, 0, 2 * Math.PI);
	ctx.stroke();

	// 全体を拡大縮小表示する
	ctx.translate(oesNode.x, oesNode.y);
	ctx.scale(globalScale, globalScale);
	ctx.translate(- oesNode.x, - oesNode.y);

	//deals
	for (var dis in dealsViz) {
		var d = dealsViz[dis];
		var fromS = (d.dischargingUnit == unitId) ? servers[d.dischargingUnit] : phantomServers[d.id];
		var toS = (d.chargingUnit == unitId) ? servers[d.chargingUnit] : phantomServers[d.id];
		if (fromS != undefined && toS != undefined) {
			if (d.start + 2000 < now) {
				// 出現から 2 秒以上経過した融通 : 曲線融通表示
				var length = Math.sqrt((fromS.posx - toS.posx) * (fromS.posx - toS.posx) + (fromS.posy - toS.posy) * (fromS.posy - toS.posy));
				var n = length / 15;
				phantomServers[d.id].pullTowards(oesNode);
				//add the phase from this.dc_power
				var phaseDelta = servers[unitId].dc_power / 10000;
				if ((d.dischargingUnit == unitId)) phaseDelta *= -1;
				phaseDelta /= Object.keys(dealsViz).length;
				d.phase += phaseDelta;
				//if dc_power is neg -> output from here (that's why it's -)
				if (1 <= d.phase) {
					d.phase -= 1;
					d.full = true;
				}
				if (d.phase < 0) {
					d.phase += 1;
					d.full = true;
				}
				let center_x = oesNode.x;
				const center_y = oesNode.y + 100 * SCALE_THEUNIT;
				const from_x = fromS.posx;
				let from_y = fromS.posy;
				const to_x = toS.posx;
				let to_y = toS.posy;
				if (d.dischargingUnit == unitId) {
					from_y += 70 * SCALE_THEUNIT;
					center_x += (to_x - center_x) / 3;
				} else {
					to_y += 70 * SCALE_THEUNIT;
					center_x += (from_x - center_x) / 3;
				}
				for (var i = 0; i < n; ++i) {
					var f = (i + d.phase) / n;
					if (1 < f) f -= 1;
					if (d.full || f < d.phase) {
						if (f < 0) f += 1;
						var x = (1 - f) * (1 - f) * (1 - f) * from_x + 3 * f * (1 - f) * (1 - f) * center_x + 3 * f * f * (1 - f) * center_x + f * f * f * to_x;
						var y = (1 - f) * (1 - f) * (1 - f) * from_y + 3 * f * (1 - f) * (1 - f) * center_y + 3 * f * f * (1 - f) * center_y + f * f * f * to_y;
						ctx.fillStyle = colorLerp(COLOR_GREEN, COLOR_WHITE, f);
						ctx.fillRect(x - 2, y - 2, 4, 4);
					}
				}
			} else {
				// 出現から 2 秒以内の融通 : 直線ビーム
				var req = (d.requester == unitId) ? servers[d.requester] : phantomServers[d.id];
				var res = (d.responder == unitId) ? servers[d.responder] : phantomServers[d.id];
				if (req != undefined && res != undefined) {
					var frac = (now - d.start) / 2000.0;
					frac = smoothStep(frac);
					ctx.strokeStyle = 'white';
					ctx.beginPath();
					ctx.moveTo(req.posx, req.posy);
					ctx.lineTo((1 - frac) * req.posx + frac * res.posx, (1 - frac) * req.posy + frac * res.posy);
					ctx.stroke();
				}
			}
		}
	}

	var needToScale = false;

	/* draw phantom servers */
	for (let key in phantomServers) {
		let s = phantomServers[key];
		s.draw(0);
		let temp = s.pushInside(oesNode.x - oesNode.x / globalScale, oesNode.y * (1 - 1.0 / globalScale), oesNode.x + (w - oesNode.x) / globalScale, oesNode.y + (h - oesNode.y) / globalScale);
		if (temp) needToScale = true;
		s.pushAwaySingle(oesNode);
	}
	for (let key in phantomServers) {
		let s = phantomServers[key];
		s.pushAway(phantomServers);
	}

	/* draw servers */
	for (var key in servers) {
		var slocal = servers[key];
		if (closest === undefined) {
			slocal.draw(1);
		} else {
			if (closest == slocal) {
				slocal.draw(2);
			} else {
				slocal.draw(1);
			}
		}
	}

	if (needToScale) {
		// 縮小する必要があるので全体の拡大縮小率を小さくする
		globalScale *= .99;
	} else if (globalScale < 1 && Object.keys(dealsViz).length == 0) {
		// 縮小する必要がなく融通がないので全体の拡大縮小率を大きくしてみる
		globalScale *= 1.01;
	}

	/* draw OES node */
	// ctx.fillStyle = 'rgba(0, 0, 0, .7)';
	// ctx.strokeStyle = 'none';
	// ctx.beginPath();
	// ctx.arc(oesNode.x, oesNode.y, 30, 0, 2 * Math.PI);
	// ctx.fill();
	// ctx.fillStyle = 'white';
	// ctx.textAlign = 'center';
	// ctx.textBaseline = 'middle';
	// ctx.fillText('OES', oesNode.x, oesNode.y);

	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	if (!loading) {
		ctx.save();
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.strokeStyle = 'black';
		ctx.fillStyle = 'white';
		ctx.beginPath();
		ctx.fillText(message, 10, h - 20);
		//show time
		if (latestGlobalUpdate != -1) {
			var d = new Date(latestGlobalUpdate * 1000);
			var timeString = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes();
			if (d.getMinutes() < 10) timeString = (d.getMonth() + 1) + '/' + d.getDate() + ' ' + d.getHours() + ':0' + d.getMinutes();
			ctx.textAlign = 'right';
			ctx.beginPath();
			ctx.fillText(timeString, w - 10, h - 20);
			ctx.textAlign = 'left';
		}
		ctx.restore();
	}
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'none';
}

/**
 * 一回の描画処理
 */
function draw() {
	/* clears the back with the style background color */
	ctx.clearRect(0, 0, w, h);
	ctx.save();
	ctx.fillStyle = 'rgb(48, 48, 48)';
	ctx.fillRect(0, 0, w, h);

	// 描画処理
	drawAll();

	ctx.restore();
}

/**
 * window に呼んでもらう描画用コールバック
 * @param {number} timeStamp DOMHighResTimeStamp
 */
function update(timeStamp) {
	// 一回の描画処理を実行する
	draw();
	// 次の描画を仕込む
	window.requestAnimationFrame(update);
}


/**
 * 描画処理を初期化する
 * @param {Element} theCanvas 描画対象 DOM 要素
 * @param {string} theUnitId ユニット ID
 */
function initVisual(theCanvas, theUnitId) {
	canvas = theCanvas;
	canvas.width = mainCanvas.w;
	canvas.height = mainCanvas.h;
	ctx = canvas.getContext('2d');
	w = canvas.width;
	h = canvas.height;
	oesNode.y = h / 2;
	oesNode.x = w / 2;
	oesNode.posx = w / 2;
	oesNode.posy = h / 2;
	ctx.font = '12px Droid Sans Mono';
	//ctx.font = '12px Verdana';

	unitId = theUnitId;

	lastPulse = -1;
	latestGlobalUpdate = -1;
	dealsViz = {};
	globalScale = 1;
	servers = {};
	phantomServers = {};
	closest = null;

	if (isFirstTimeInit) {
		/* register listeners */
		canvas.addEventListener('mousemove', mouseMove, false);
		/* start drawing */
		window.requestAnimationFrame(update);

		isFirstTimeInit = false;
	}
}


function timestampFromDateString(dateString) {
//	var y = dateString.substring(0, 4);
//	var m = dateString.substring(5, 7);
//	var d = dateString.substring(8, 10);
//	var hh = dateString.substring(11, 13);
//	var mm = dateString.substring(14, 16);
//	var ss = dateString.substring(17, 19);
//	return new Date(y, m - 1, d, hh, mm, ss).getTime() / 1000;
	return Date.parse(dateString) / 1000;
}
function localDateString(dateString) {
	var d = new Date(dateString);
	return d.getFullYear() + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + ('0' + d.getDate()).slice(-2) + '-' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
}

/**
 * ユニットデータを受け取り内部データを更新する
 * @param {Object} data ユニットデータ一式
 */
function processGetLog(data) {
	// 一旦 exists = false にする
	// それ以外のユニットがあったら削除する
	for (var id in servers) {
		if (id == unitId) {
			servers[id].exists = false;
		} else {
			delete servers[id];
		}
	}
	var now = Date.now();
	// 受け取ったデータに自ユニット ID があれば
	if (unitId in data) {
		var d = data[unitId];
		let s = servers[unitId];
		if (!s) {
			// Server オブジェクトがなければ作る
			var name = d.oesunit.display;
			s = new Server(unitId, name, false);
			s.posx = oesNode.x;
			s.posy = oesNode.y;
			servers[unitId] = s;
		}
		// exists = true にする
		s.exists = true;
		var lastUpdate = timestampFromDateString(d.time);
		if (s.lastUpdate != lastUpdate) {
			s.lastUpdateChanged = now;
			s.lastUpdate = lastUpdate;
		// ユニットデータ中の time が 30 秒以上変化しない場合
		} else if (s.lastUpdateChanged + 30000 < now) {
			// また exists = false にする
			s.exists = false;
		}
		//console.log(s.lastUpdate);
		if (latestGlobalUpdate < s.lastUpdate) latestGlobalUpdate = s.lastUpdate;

		// 各種数値データを読み取り Server オブジェクトを更新する
		const dcdc = d.dcdc;
		if (dcdc) {
			const status_ = dcdc.status;
			if (status_) {
				s.is_voltage_reference = ('0x0014' == status_.status);
			}
			const meter = dcdc.meter;
			if (meter) {
				s.dc_power = meter.wg;
				s.tmp = meter.tmp;
				s.dc_voltage = meter.vg;
				s.battery_voltage = meter.vb;
			}
			const powermeter = dcdc.powermeter;
			if (powermeter) {
				s.ac_input_power = powermeter.p2;
			}
		}
		const battery = d.battery;
		if (battery) {
			s.rsoc = battery.rsoc;
		} else {
			const emu = d.emu;
			if (emu) {
				s.rsoc = emu.rsoc;
			}
		}
		if (battery) {
			s.battery_operation_status = battery.battery_operation_status;
		}
		const emu = d.emu;
		if (emu) {
			s.pv_power = emu.pvc_charge_power;
			s.out_power = emu.ups_output_power;
			s.ac_input_voltage = emu.ups_input_voltage;
			s.out_voltage = emu.ups_output_voltage;
		}
		const apis = d.apis;
		if (apis) {
			s.is_grid_master = apis.is_grid_master;
			const operation_mode = apis.operation_mode;
			if (operation_mode) {
				s.global_operation_mode = operation_mode.global;
				s.local_operation_mode = operation_mode.local;
				s.effective_operation_mode = operation_mode.effective;
			}
		}
	}
}

/**
 * 融通情報リストを受け取り内部データを更新する
 * @param {Array.<Object>} data 融通情報リスト
 */
function processDeals(data) {
	// 一旦全部 exists = false にする
	for (const p in dealsViz) dealsViz[p].exists = false;
	for (const newOne of data) {
		if (newOne.hasOwnProperty('startTime')) {
			let d = dealsViz[newOne.id];
			// すでに Deal オブジェクトがあれば
			if (d) {
				// exists = true にする
				d.exists = true;
				d.isMasterDeal = newOne.isMasterDeal;
			// なければ
			} else {
				// つくる
				d = new Deal(newOne);
				dealsViz[newOne.id] = d;
			}
		}
	}
	// exists = false である要素を削除する
	for (const key in dealsViz) {
		if (!dealsViz[key].exists) {
			delete dealsViz[key];
		}
	}

	//// 擬似ユニット処理
	// 一旦全部 exists = false にする
	for (let key in phantomServers) phantomServers[key].exists = false;
	// 保持している全融通に対し融通 ID を id に持つ Server を保持する
	for (let key in dealsViz) {
		const d = dealsViz[key];
		const id = d.id;
		let s = phantomServers[id];
		// あれば
		if (s) {
			// exists = true にする
			s.exists = true;
		// なければ
		} else {
			// つくる
			s = new Server(id, id, true);
			s.posx = oesNode.x + Math.random() * 10 - 5;
			s.posy = oesNode.y + Math.random() * 10 - 5;
			phantomServers[id] = s;
		}
	}
	// exists = false である要素を削除する
	for (let key in phantomServers) {
		if (!phantomServers[key].exists) {
			delete phantomServers[key];
		}
	}
}
