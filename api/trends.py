"""
Vercel Python Serverless Function: Google Trends 데이터 수집

- Vercel 배포 환경에서만 호출됨 (로컬은 src/lib/get_trends.py 를 직접 spawn).
- Trends fetch 로직은 src/lib/get_trends.py 의 get_trends() 를 단일 진실로 재사용.
- POST /api/trends
  body: { keyword, geo?, timeframe?, gprop? }
  resp: { success, data?: [{date, value}], error?, code? }
"""

import json
import os
import sys
import traceback
from http.server import BaseHTTPRequestHandler

# src/lib 을 import path 에 추가하여 단일 진실(get_trends.py) 재사용
_SRC_LIB_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib')
if _SRC_LIB_DIR not in sys.path:
    sys.path.insert(0, _SRC_LIB_DIR)

from get_trends import get_trends  # noqa: E402


class handler(BaseHTTPRequestHandler):
    """Vercel Python Serverless Function Handler"""

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self._send_json(400, {
                    'success': False,
                    'error': 'Empty request body',
                    'code': 'INVALID_INPUT',
                })
                return

            body = json.loads(self.rfile.read(content_length).decode('utf-8'))

            keyword = (body.get('keyword') or '').strip()
            geo = body.get('geo', '') or ''
            timeframe = body.get('timeframe', '5y') or '5y'
            gprop = body.get('gprop', '') or ''

            if not keyword:
                self._send_json(400, {
                    'success': False,
                    'error': 'Keyword is required',
                    'code': 'INVALID_INPUT',
                })
                return

            data = get_trends(keyword, geo, timeframe, gprop)
            self._send_json(200, {'success': True, 'data': data})

        except json.JSONDecodeError:
            self._send_json(400, {
                'success': False,
                'error': 'Invalid JSON body',
                'code': 'INVALID_INPUT',
            })
        except Exception as exc:
            self._send_json(500, {
                'success': False,
                'error': str(exc),
                'code': 'SERVER_ERROR',
                'trace': traceback.format_exc(),
            })

    def _send_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
