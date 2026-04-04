"""
Google Trends 데이터 수집 API
- 로컬: Flask HTTP 서버 (포트 5000)
- Vercel: Python Serverless Function

공유 로직: fetch_trends_data()
- 로컬/배포 모두에서 동일하게 사용
"""

import json
from datetime import datetime, timedelta
from pytrends.request import TrendReq

# ============================================================================
# 공유 로직 (로컬 + Vercel 모두 사용)
# ============================================================================

def calculate_start_date(timeframe: str) -> datetime:
    """기간 문자열 → 시작 날짜 계산"""
    end_date = datetime.now()

    if timeframe.endswith('w') and timeframe[:-1].isdigit():
        weeks = int(timeframe[:-1])
        days = weeks * 7
    elif timeframe == 'w':
        days = 7
    elif timeframe == '1y':
        days = 365
    elif timeframe == '2y':
        days = 365 * 2
    elif timeframe == '3y':
        days = 365 * 3
    elif timeframe == '4y':
        days = 365 * 4
    else:  # '5y' or default
        days = 365 * 5

    return end_date - timedelta(days=days)


def fetch_trends_data(keyword: str, geo: str = '', timeframe: str = '5y', gprop: str = '') -> dict:
    """
    Google Trends 데이터 수집

    Args:
        keyword: 검색 키워드
        geo: 지역 코드 (기본: 전 세계)
        timeframe: 기간 ('5y', '1y', '4w' 등)
        gprop: Google 속성 ('', 'news', 'youtube' 등)

    Returns:
        { "success": bool, "data": [...], "error"?: str, "code"?: str }
    """
    try:
        # 키워드 검증
        if not keyword or len(keyword.strip()) == 0:
            return {
                'success': False,
                'error': 'Keyword is required',
                'code': 'INVALID_INPUT'
            }

        # 기간 계산
        end_date = datetime.now()
        start_date = calculate_start_date(timeframe)

        # pytrends 요청
        pytrends = TrendReq(hl='ko_KR', tz=0)
        pytrends.build_payload(
            kw_list=[keyword],
            cat=0,
            timeframe=f'{start_date.strftime("%Y-%m-%d")} {end_date.strftime("%Y-%m-%d")}',
            geo=geo,
            gprop=gprop,
        )

        # 주간 데이터 수집
        interest_over_time = pytrends.interest_over_time()

        if interest_over_time.empty:
            return {
                'success': True,
                'data': []
            }

        # 데이터 정규화
        trends_data = []
        for date, row in interest_over_time.iterrows():
            date_str = date.strftime('%Y-%m-%d')
            value = int(row[keyword])

            trends_data.append({
                'date': date_str,
                'value': value
            })

        return {
            'success': True,
            'data': trends_data
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'code': 'TRENDS_FETCH_FAILED'
        }


# ============================================================================
# Flask 모드 (로컬 개발)
# ============================================================================

try:
    from flask import Flask, request, jsonify

    app = Flask(__name__)

    @app.route('/api/trends', methods=['POST'])
    def trends_endpoint():
        """HTTP POST /api/trends"""
        try:
            body = request.get_json()

            if not body:
                return jsonify({
                    'success': False,
                    'error': 'Empty request body',
                    'code': 'INVALID_INPUT'
                }), 400

            keyword = body.get('keyword', '')
            geo = body.get('geo', '')
            timeframe = body.get('timeframe', '5y')
            gprop = body.get('gprop', '')

            result = fetch_trends_data(keyword, geo, timeframe, gprop)

            if result['success']:
                return jsonify(result), 200
            else:
                return jsonify(result), 400

        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'code': 'SERVER_ERROR'
            }), 500

    if __name__ == '__main__':
        app.run(host='localhost', port=5000, debug=False)

except ImportError:
    # Flask 미설치 (Vercel 환경)
    pass


# ============================================================================
# Vercel 모드 (Serverless Function)
# ============================================================================

from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    """Vercel Python Serverless Function Handler"""

    def do_POST(self):
        """POST /api/trends"""
        try:
            # 요청 본문 파싱
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_json_error(400, 'Empty request body', 'INVALID_INPUT')
                return

            body = json.loads(self.rfile.read(content_length).decode('utf-8'))

            keyword = body.get('keyword', '')
            geo = body.get('geo', '')
            timeframe = body.get('timeframe', '5y')
            gprop = body.get('gprop', '')

            # 공유 로직 호출
            result = fetch_trends_data(keyword, geo, timeframe, gprop)

            if result['success']:
                self.send_json_response(result, 200)
            else:
                self.send_json_response(result, 400)

        except json.JSONDecodeError:
            self.send_json_error(400, 'Invalid JSON in request body', 'JSON_ERROR')
        except Exception as e:
            print(f'Error in trends API: {str(e)}', flush=True)
            self.send_json_error(500, str(e), 'SERVER_ERROR')

    def send_json_response(self, data: dict, status_code: int = 200):
        """JSON 응답 전송"""
        response_body = json.dumps(data).encode('utf-8')

        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)

    def send_json_error(self, status_code: int, message: str, code: str = 'ERROR'):
        """에러 JSON 응답 전송"""
        error_response = {
            'success': False,
            'error': message,
            'code': code
        }
        self.send_json_response(error_response, status_code)
