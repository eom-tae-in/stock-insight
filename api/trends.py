"""
Vercel Python Serverless Function: Google Trends 데이터 수집
Route: /api/trends (POST)

Body:
  {
    "keyword": string,
    "geo": string (optional, default: ""),
    "timeframe": string (optional, default: "5y"),
    "gprop": string (optional, default: "")
  }

Response:
  [
    { "date": "YYYY-MM-DD", "value": 0-100 },
    ...
  ]
"""

from http.server import BaseHTTPRequestHandler
import json
from datetime import datetime, timedelta
from pytrends.request import TrendReq


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """POST /api/trends - Google Trends 데이터 조회"""
        try:
            # 요청 본문 파싱
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error(400, 'Empty request body')
                return

            body = json.loads(self.rfile.read(content_length).decode('utf-8'))

            keyword = body.get('keyword', '')
            geo = body.get('geo', '')
            timeframe = body.get('timeframe', '5y')
            gprop = body.get('gprop', '')

            # 키워드 검증
            if not keyword or len(keyword.strip()) == 0:
                self.send_error(400, 'Keyword is required')
                return

            # 기간 계산
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

            start_date = end_date - timedelta(days=days)

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
                self.send_json_response([])
                return

            # 데이터 정규화
            trends_data = []
            for date, row in interest_over_time.iterrows():
                date_str = date.strftime('%Y-%m-%d')
                value = int(row[keyword])

                trends_data.append({'date': date_str, 'value': value})

            self.send_json_response(trends_data)

        except json.JSONDecodeError:
            self.send_error(400, 'Invalid JSON in request body')
        except KeyError as e:
            self.send_error(400, f'Missing required field: {e}')
        except Exception as e:
            print(f'Error in trends API: {str(e)}')
            self.send_error(500, f'Internal server error: {str(e)}')

    def send_json_response(self, data):
        """JSON 응답 전송"""
        response_body = json.dumps(data).encode('utf-8')

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)

    def send_error(self, code, message):
        """에러 응답 전송"""
        response_body = json.dumps({'error': message}).encode('utf-8')

        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response_body)))
        self.end_headers()
        self.wfile.write(response_body)
