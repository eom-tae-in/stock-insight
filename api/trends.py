"""
Google Trends 데이터 수집 API
- 로컬: Flask HTTP 서버 (포트 5000)
- Vercel: Python Serverless Function
"""

import json
import time
import random
import traceback
from datetime import datetime, timedelta
from pytrends.request import TrendReq

# ============================================================================
# 공유 로직 (로컬 + Vercel 모두 사용)
# ============================================================================

def fetch_trends_data(keyword: str, geo: str = '', timeframe: str = '5y', gprop: str = '') -> dict:
    """Google Trends 데이터 수집"""
    try:
        print(f'[fetch_trends_data] 시작: keyword={keyword}, geo={geo}, timeframe={timeframe}, gprop={gprop}', flush=True)

        if not keyword or len(keyword.strip()) == 0:
            print(f'[fetch_trends_data] 에러: 빈 키워드', flush=True)
            return {'success': False, 'error': 'Keyword is required', 'code': 'INVALID_INPUT'}

        # 기간 계산
        end_date = datetime.now()
        if timeframe == '5y':
            start_date = end_date - timedelta(days=365*5)
        elif timeframe == '1y':
            start_date = end_date - timedelta(days=365)
        else:
            start_date = end_date - timedelta(days=365*5)

        print(f'[fetch_trends_data] 기간: {start_date.strftime("%Y-%m-%d")} ~ {end_date.strftime("%Y-%m-%d")}', flush=True)

        # Google 요청 전 지연
        print(f'[fetch_trends_data] {1.5}~{2.5}초 대기 중...', flush=True)
        time.sleep(random.uniform(1.5, 2.5))

        # pytrends 요청 (기본 User-Agent 사용)

        print(f'[fetch_trends_data] TrendReq 객체 생성 중...', flush=True)
        pytrends = TrendReq(hl='ko_KR', tz=0, retries=3, backoff_factor=1.0)

        timeframe_str = f'{start_date.strftime("%Y-%m-%d")} {end_date.strftime("%Y-%m-%d")}'
        print(f'[fetch_trends_data] build_payload 호출 전 파라미터:')
        print(f'  - kw_list: {[keyword]}', flush=True)
        print(f'  - cat: 0', flush=True)
        print(f'  - timeframe: {timeframe_str}', flush=True)
        print(f'  - geo (타입: {type(geo).__name__}): "{geo}"', flush=True)
        print(f'  - gprop (타입: {type(gprop).__name__}): "{gprop}"', flush=True)

        print(f'[fetch_trends_data] build_payload 호출 중...', flush=True)
        pytrends.build_payload(
            kw_list=[keyword],
            cat=0,
            timeframe=timeframe_str,
            geo=geo,
            gprop=gprop,
        )
        print(f'[fetch_trends_data] build_payload 완료', flush=True)

        print(f'[fetch_trends_data] interest_over_time 호출 중...', flush=True)
        interest_over_time = pytrends.interest_over_time()
        print(f'[fetch_trends_data] interest_over_time 호출 완료: 행 개수={len(interest_over_time)}', flush=True)

        if interest_over_time.empty:
            print(f'[fetch_trends_data] 경고: 데이터 없음', flush=True)
            return {'success': True, 'data': []}

        trends_data = []
        for date, row in interest_over_time.iterrows():
            date_str = date.strftime('%Y-%m-%d')
            value = int(row[keyword])
            trends_data.append({'date': date_str, 'value': value})

        print(f'[fetch_trends_data] 성공: {len(trends_data)}개 데이터 반환', flush=True)
        return {'success': True, 'data': trends_data}

    except Exception as e:
        print(f'[fetch_trends_data] 예외 발생: {type(e).__name__}: {str(e)}', flush=True)
        print(f'[fetch_trends_data] Traceback:\n{traceback.format_exc()}', flush=True)
        # 503 (Service Unavailable)으로 반환 - Google/pytrends 문제 표시
        return {'success': False, 'error': str(e), 'code': 'PYTRENDS_ERROR'}


# ============================================================================
# Flask 모드 (로컬 개발)
# ============================================================================

try:
    from flask import Flask, request, jsonify

    app = Flask(__name__)

    @app.route('/api/trends', methods=['GET', 'POST'])
    def trends_endpoint():
        print(f'\n[Flask] ========== 새로운 요청 시작 ==========', flush=True)
        print(f'[Flask] 요청 메서드: {request.method}', flush=True)
        print(f'[Flask] 경로: {request.path}', flush=True)
        print(f'[Flask] 헤더:', flush=True)
        for key, value in request.headers:
            print(f'  {key}: {value}', flush=True)

        try:
            if request.method == 'GET':
                print(f'[Flask] GET 요청 - 쿼리 파라미터 파싱', flush=True)
                keyword = request.args.get('keyword', '')
                geo = request.args.get('geo', '')
                timeframe = request.args.get('timeframe', '5y')
                gprop = request.args.get('gprop', '')
                print(f'[Flask] 파라미터: keyword={keyword}, geo={geo}, timeframe={timeframe}, gprop={gprop}', flush=True)
            else:
                print(f'[Flask] POST 요청 - JSON 바디 파싱', flush=True)
                body = request.get_json()
                print(f'[Flask] 바디: {body}', flush=True)
                if not body:
                    print(f'[Flask] 에러: 빈 바디', flush=True)
                    return jsonify({'success': False, 'error': 'Empty request body', 'code': 'INVALID_INPUT'}), 400

                keyword = body.get('keyword', '')
                geo = body.get('geo', '')
                timeframe = body.get('timeframe', '5y')
                gprop = body.get('gprop', '')
                print(f'[Flask] 파라미터: keyword={keyword}, geo={geo}, timeframe={timeframe}, gprop={gprop}', flush=True)

            print(f'[Flask] fetch_trends_data 호출 시작', flush=True)
            result = fetch_trends_data(keyword, geo, timeframe, gprop)
            print(f'[Flask] fetch_trends_data 호출 완료: success={result.get("success")}', flush=True)

            if result['success']:
                print(f'[Flask] 200 응답 반환', flush=True)
                return jsonify(result), 200
            else:
                error = result.get('error', '알 수 없는 에러')
                print(f'[Flask] 500 응답 반환 (pytrends 에러): {error}', flush=True)
                return jsonify(result), 500

        except Exception as e:
            print(f'[Flask] 예외 발생: {type(e).__name__}: {str(e)}', flush=True)
            print(f'[Flask] Traceback:\n{traceback.format_exc()}', flush=True)
            print(f'[Flask] 500 응답 반환 (서버 에러)', flush=True)
            return jsonify({'success': False, 'error': str(e), 'code': 'SERVER_ERROR'}), 500
        finally:
            print(f'[Flask] ========== 요청 종료 ==========\n', flush=True)

except ImportError:
    app = None

# Flask 직접 실행 시 (python api/trends.py)
if __name__ == '__main__':
    if app:
        print('[Flask] 서버 시작: http://localhost:5001', flush=True)
        app.run(host='127.0.0.1', port=5001, debug=False)


# ============================================================================
# Vercel 모드 (Serverless Function)
# ============================================================================

from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    """Vercel Python Serverless Function Handler"""

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_response(400)
                self.end_headers()
                return

            body = json.loads(self.rfile.read(content_length).decode('utf-8'))

            keyword = body.get('keyword', '')
            geo = body.get('geo', '')
            timeframe = body.get('timeframe', '5y')
            gprop = body.get('gprop', '')

            result = fetch_trends_data(keyword, geo, timeframe, gprop)

            response_body = json.dumps(result).encode('utf-8')
            status_code = 200 if result['success'] else 500

            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(response_body)))
            self.end_headers()
            self.wfile.write(response_body)

        except Exception as e:
            error_response = json.dumps({'success': False, 'error': str(e), 'code': 'SERVER_ERROR'}).encode('utf-8')
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(error_response)))
            self.end_headers()
            self.wfile.write(error_response)
