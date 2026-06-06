"""
Vercel Python Serverless Function: Google Trends data provider

- All environments call this function from src/server/trends-internal-service.ts.
- The actual Trends fetch logic is shared with src/lib/get_trends.py.

POST /api/pytrends
body: { keyword, geo?, timeframe?, gprop? }
resp: { success, data?: [{date, value}], error?, code? }
"""

import json
import os
import sys
import time
import traceback
from http.server import BaseHTTPRequestHandler

_SRC_LIB_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'lib')
if _SRC_LIB_DIR not in sys.path:
    sys.path.insert(0, _SRC_LIB_DIR)

from get_trends import TrendsFetchError, get_trends  # noqa: E402


def _log_pytrends(event: str, **fields) -> None:
    print(
        '[pytrends] ' + json.dumps(
            {'event': event, **fields},
            ensure_ascii=False,
            default=str,
        ),
        file=sys.stderr,
    )


class handler(BaseHTTPRequestHandler):
    """Vercel Python Serverless Function Handler"""

    def do_POST(self):
        started_at = time.monotonic()
        keyword = ''
        geo = ''
        timeframe = ''
        gprop = ''

        try:
            internal_secret = os.environ.get('PYTRENDS_INTERNAL_SECRET')
            request_secret = self.headers.get('x-internal-api-secret')

            if not internal_secret:
                _log_pytrends(
                    'failure',
                    code='CONFIG_ERROR',
                    status=500,
                    duration_ms=int((time.monotonic() - started_at) * 1000),
                )
                self._send_json(500, {
                    'success': False,
                    'error': 'PYTRENDS_INTERNAL_SECRET is not configured',
                    'code': 'CONFIG_ERROR',
                })
                return

            if request_secret != internal_secret:
                _log_pytrends(
                    'failure',
                    code='UNAUTHORIZED',
                    status=401,
                    duration_ms=int((time.monotonic() - started_at) * 1000),
                )
                self._send_json(401, {
                    'success': False,
                    'error': 'Unauthorized',
                    'code': 'UNAUTHORIZED',
                })
                return

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                _log_pytrends(
                    'failure',
                    code='INVALID_INPUT',
                    status=400,
                    reason='empty_body',
                    duration_ms=int((time.monotonic() - started_at) * 1000),
                )
                self._send_json(400, {
                    'success': False,
                    'error': 'Empty request body',
                    'code': 'INVALID_INPUT',
                })
                return

            body = json.loads(self.rfile.read(content_length).decode('utf-8'))

            keyword = (body.get('keyword') or '').strip()
            geo = body.get('geo', '') or ''
            timeframe = body.get('timeframe', 'today 5-y') or 'today 5-y'
            gprop = body.get('gprop', '') or ''

            if not keyword:
                _log_pytrends(
                    'failure',
                    code='INVALID_INPUT',
                    status=400,
                    reason='missing_keyword',
                    duration_ms=int((time.monotonic() - started_at) * 1000),
                )
                self._send_json(400, {
                    'success': False,
                    'error': 'Keyword is required',
                    'code': 'INVALID_INPUT',
                })
                return

            _log_pytrends(
                'request',
                keyword=keyword,
                geo=geo or 'GLOBAL',
                timeframe=timeframe,
                gprop=gprop or 'WEB',
            )

            data = get_trends(keyword, geo, timeframe, gprop)
            if not data:
                _log_pytrends(
                    'failure',
                    keyword=keyword,
                    geo=geo or 'GLOBAL',
                    timeframe=timeframe,
                    gprop=gprop or 'WEB',
                    code='NO_TRENDS_DATA',
                    status=502,
                    duration_ms=int((time.monotonic() - started_at) * 1000),
                )
                self._send_json(502, {
                    'success': False,
                    'error': 'No trends data returned',
                    'code': 'NO_TRENDS_DATA',
                })
                return

            _log_pytrends(
                'success',
                keyword=keyword,
                geo=geo or 'GLOBAL',
                timeframe=timeframe,
                gprop=gprop or 'WEB',
                points=len(data),
                duration_ms=int((time.monotonic() - started_at) * 1000),
            )
            self._send_json(200, {'success': True, 'data': data})

        except json.JSONDecodeError:
            _log_pytrends(
                'failure',
                code='INVALID_INPUT',
                status=400,
                reason='invalid_json',
                duration_ms=int((time.monotonic() - started_at) * 1000),
            )
            self._send_json(400, {
                'success': False,
                'error': 'Invalid JSON body',
                'code': 'INVALID_INPUT',
            })
        except TrendsFetchError as exc:
            _log_pytrends(
                'failure',
                keyword=keyword or None,
                geo=(geo or 'GLOBAL') if keyword else None,
                timeframe=timeframe or None,
                gprop=(gprop or 'WEB') if keyword else None,
                code=exc.code,
                status=exc.status,
                duration_ms=int((time.monotonic() - started_at) * 1000),
            )
            print(traceback.format_exc(), file=sys.stderr)
            self._send_json(exc.status, {
                'success': False,
                'error': str(exc),
                'code': exc.code,
            })
        except Exception as exc:
            _log_pytrends(
                'failure',
                keyword=keyword or None,
                geo=(geo or 'GLOBAL') if keyword else None,
                timeframe=timeframe or None,
                gprop=(gprop or 'WEB') if keyword else None,
                code='SERVER_ERROR',
                status=500,
                duration_ms=int((time.monotonic() - started_at) * 1000),
            )
            print(traceback.format_exc(), file=sys.stderr)
            self._send_json(500, {
                'success': False,
                'error': 'Internal server error',
                'code': 'SERVER_ERROR',
            })

    def _send_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:
        return
