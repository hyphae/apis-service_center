import logging, datetime

logger = logging.getLogger(__name__)

__pymongo_no_id_projection = {'_id':False}

def pymongo_no_id_projection():
	"""PyMongo 経由で MongoDB を使う時に結果から _id 属性を除くためのおまじないを取得する

	Returns:
		dict: おまじない
	"""
	return __pymongo_no_id_projection

def pymongo_result_conv(value):
	"""PyMongo を使うと datetime が naive な UTC 値で返ってくるため aware に変換する

	Args:
		value (any): 変換対象. dict や list なら要素を再起的に処理する.

	Returns:
		any: 変換結果
	"""
	if isinstance(value, datetime.datetime):
		if value.utcoffset() is None:
			return datetime.datetime.fromisoformat(value.isoformat() + '+00:00')
		else:
			logger.warning('######## datetime is aware !!!')
			return value
	elif isinstance(value, dict):
		return {key: pymongo_result_conv(val) for key, val in value.items()}
	elif isinstance(value, list):
		return [pymongo_result_conv(element) for element in value]
	else:
		# print('######## ' + str(value.__class__) + ' : ' + str(value))
		return value

def parse_iso8601_extended(value):
	"""ISO8601 形式の日時文字列をパースする

	Python はタイムゾーン記号 Z を認識してくれないので Z を +00:00 に置換して渡す.

	Args:
		value (str): ISO8601 形式の日時文字列

	Raises:
		ValueError: ISO8601 形式ではない場合

	Returns:
		datetime: パース結果
		None: if value is None
	"""
	if value:
		return datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))
	return None

def parse_iso8601_extended_timezone(value):
	"""ISO8601 形式のタイムゾーン文字列をパースする

	Args:
		value (str): ISO8601 形式のタイムゾーン文字列

	Raises:
		ValueError: ISO8601 形式ではない場合

	Returns:
		timezone: パース結果
		None: if value is None
	"""
	if value:
		if value.endswith('Z'):
			return datetime.timezone.utc
		colon = value.rfind(':')
		if colon != -1:
			negate = False
			hh = '00'
			mm = value[colon + 1:]
			sign = value.rfind('+', 0, colon)
			if sign == -1:
				negate = True
				sign = value.rfind('-', 0, colon)
			if sign != -1:
				hh = value[sign + 1:colon]
				hours = - int(hh) if negate else int(hh)
				minutes = - int(mm) if negate else int(mm)
				return datetime.timezone(datetime.timedelta(hours = hours, minutes = minutes))
		raise ValueError(f'Invalid isoformat timezone string: {value!r}')
	return None
