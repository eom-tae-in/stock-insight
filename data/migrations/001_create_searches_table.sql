-- 종목 조회 기록 메인 테이블
-- 각 종목의 메타데이터와 핵심 지표를 저장합니다
CREATE TABLE IF NOT EXISTS searches (
  id TEXT PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  current_price REAL NOT NULL,
  previous_close REAL,
  ma13 REAL,
  yoy_change REAL NOT NULL,
  week52_high REAL,
  week52_low REAL,
  price_data TEXT NOT NULL,
  trends_data TEXT NOT NULL,
  last_updated_at TEXT NOT NULL,
  searched_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 빠른 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_searches_ticker ON searches(ticker);
CREATE INDEX IF NOT EXISTS idx_searches_searched_at ON searches(searched_at DESC);
