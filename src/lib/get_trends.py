#!/usr/bin/env python3
"""
Google Trends 데이터 수집 (pytrends 사용)
"""

import json
import sys
from datetime import datetime, timedelta
from pytrends.request import TrendReq

def get_last_completed_week_start(now: datetime) -> datetime:
    """
    Return the Monday of the most recent fully completed ISO week.
    """
    current_week_start = now - timedelta(days=now.weekday())
    return current_week_start - timedelta(days=7)

def normalize_to_week_start(date: datetime) -> datetime:
    """
    Normalize Google Trends weekly labels to the Monday week key used by charts.

    Google Trends commonly labels weekly data with Sunday. For those rows,
    use the following Monday so the label matches the Monday-Sunday chart week.
    For other dates, fall back to ISO week start.
    """
    if date.weekday() == 6:
        return date + timedelta(days=1)

    return date - timedelta(days=date.weekday())

def get_trends(keyword: str, geo: str = '', timeframe: str = '5y', gprop: str = '') -> list:
    """
    Google Trends에서 데이터 수집

    Args:
        keyword: 검색 키워드
        geo: 국가 코드 (예: 'US', 'KR', 'JP', 기본값: 전체)
        timeframe: 기간 ('w', '1y', '2y', '3y', '4y', '5y', 기본값: '5y')
        gprop: 검색 범위 ('', 'youtube', 기본값: 웹 검색)

    Returns:
        list: [{"date": "YYYY-MM-DD", "value": 0-100}, ...]
    """
    try:
        # 기간 계산 (Critical: 2y, 4y, w 분기 추가 + 커스텀 주 지원)
        end_date = datetime.now()
        last_completed_week_start = get_last_completed_week_start(end_date)
        request_end_date = last_completed_week_start + timedelta(days=6)

        # 커스텀 주 형식 처리 (예: '26w', '52w')
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

        start_date = request_end_date - timedelta(days=days)

        # pytrends 요청
        pytrends = TrendReq(hl='ko_KR', tz=0)
        pytrends.build_payload(
            kw_list=[keyword],
            cat=0,
            timeframe=f'{start_date.strftime("%Y-%m-%d")} {request_end_date.strftime("%Y-%m-%d")}',
            geo=geo,
            gprop=gprop
        )

        # 주간 데이터 수집
        interest_over_time = pytrends.interest_over_time()

        if interest_over_time.empty:
            return []

        # 데이터 정규화: 완료된 전주까지만 월요일 week key로 저장
        trends_by_week = {}
        for date, row in interest_over_time.iterrows():
            if bool(row.get('isPartial', False)):
                continue

            trend_date = date.to_pydatetime() if hasattr(date, 'to_pydatetime') else date
            week_start = normalize_to_week_start(trend_date)
            if week_start.date() > last_completed_week_start.date():
                continue

            date_str = week_start.strftime('%Y-%m-%d')
            value = int(row[keyword])

            trends_by_week[date_str] = {
                'date': date_str,
                'value': value
            }

        return [trends_by_week[key] for key in sorted(trends_by_week.keys())]

    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        return []

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps([]))
        sys.exit(1)

    keyword = sys.argv[1]
    geo = sys.argv[2] if len(sys.argv) > 2 else ''
    timeframe = sys.argv[3] if len(sys.argv) > 3 else '5y'
    gprop = sys.argv[4] if len(sys.argv) > 4 else ''

    result = get_trends(keyword, geo, timeframe, gprop)
    print(json.dumps(result))
