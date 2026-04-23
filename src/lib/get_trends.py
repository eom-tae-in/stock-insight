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

def get_trends(keyword: str, geo: str = '', timeframe: str = 'today 5-y', gprop: str = '') -> list:
    """
    Google Trends에서 데이터 수집

    Args:
        keyword: 검색 키워드
        geo: 국가 코드 (예: 'US', 'KR', 'JP', 기본값: 전체 → '')
        timeframe: 기간 (pytrends 형식: 'now 1-H', 'today 1-m', 'today 5-y' 등, 기본값: 'today 5-y')
        gprop: 검색 범위 ('', 'youtube', 'images', 'news', 'froogle', 기본값: 웹 검색 → '')

    Returns:
        list: [{"date": "YYYY-MM-DD", "value": 0-100}, ...]
    """
    try:
        # 기간 계산
        end_date = datetime.now()
        last_completed_week_start = get_last_completed_week_start(end_date)
        request_end_date = last_completed_week_start + timedelta(days=6)

        # pytrends timeframe 형식 파싱 (예: 'today 5-y', 'today 1-m', 'now 1-H')
        # timeframe이 'today ...' 또는 'now ...' 형식인 경우, 날짜 범위로 계산
        days = 365 * 5  # 기본값: 5년

        if ' ' in timeframe:
            # 형식: 'today 5-y', 'today 1-m', 'now 1-H' 등
            parts = timeframe.split()
            if len(parts) == 2:
                _, period = parts  # 예: '5-y', '1-m', '1-H'
                # 형식 파싱: '5-y', '1-m', '1-H'
                match = __import__('re').match(r'(\d+)-([ymdhH])', period)
                if match:
                    value = int(match.group(1))
                    unit = match.group(2)

                    if unit == 'H':  # 시간
                        days = value / 24
                    elif unit == 'd':  # 일
                        days = value
                    elif unit == 'm':  # 월 (약 30일)
                        days = value * 30
                    elif unit == 'y':  # 년
                        days = value * 365
        # 아니면 timeframe이 이미 'now 1-H' 형식이므로 그대로 사용

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
    timeframe = sys.argv[3] if len(sys.argv) > 3 else 'today 5-y'
    gprop = sys.argv[4] if len(sys.argv) > 4 else ''

    result = get_trends(keyword, geo, timeframe, gprop)
    print(json.dumps(result))
