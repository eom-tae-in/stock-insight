#!/usr/bin/env python3
"""
Google Trends 데이터 수집 (pytrends 사용)
"""

import json
import sys
from datetime import datetime, timedelta
from pytrends.request import TrendReq

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

        start_date = end_date - timedelta(days=days)

        # pytrends 요청
        pytrends = TrendReq(hl='ko_KR', tz=0)
        pytrends.build_payload(
            kw_list=[keyword],
            cat=0,
            timeframe=f'{start_date.strftime("%Y-%m-%d")} {end_date.strftime("%Y-%m-%d")}',
            geo=geo,
            gprop=gprop
        )

        # 주간 데이터 수집
        interest_over_time = pytrends.interest_over_time()

        if interest_over_time.empty:
            return []

        # 데이터 정규화
        trends_data = []
        for date, row in interest_over_time.iterrows():
            # date는 datetime 객체
            date_str = date.strftime('%Y-%m-%d')
            value = int(row[keyword])

            trends_data.append({
                'date': date_str,
                'value': value
            })

        return trends_data

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
