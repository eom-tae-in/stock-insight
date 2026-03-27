#!/usr/bin/env python3
"""
Google Trends 데이터 수집 (pytrends 사용)
"""

import json
import sys
from datetime import datetime, timedelta
from pytrends.request import TrendReq

def get_trends(keyword: str) -> list:
    """
    Google Trends에서 5년치 데이터 수집

    Args:
        keyword: 검색 키워드

    Returns:
        list: [{"date": "YYYY-MM-DD", "value": 0-100}, ...]
    """
    try:
        # 5년 전 날짜
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365 * 5)

        # pytrends 요청
        pytrends = TrendReq(hl='ko_KR', tz=0)
        pytrends.build_payload(
            kw_list=[keyword],
            cat=0,
            timeframe=f'{start_date.strftime("%Y-%m-%d")} {end_date.strftime("%Y-%m-%d")}',
            geo=''
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
    result = get_trends(keyword)
    print(json.dumps(result))
