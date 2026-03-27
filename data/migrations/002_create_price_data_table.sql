-- 주가 데이터 (정규화됨)
-- searches 테이블의 각 종목에 대한 5년 주간 주가 데이터
CREATE TABLE IF NOT EXISTS price_data (
  id TEXT PRIMARY KEY,
  search_id TEXT NOT NULL,
  date TEXT NOT NULL,
  close REAL NOT NULL,
  open REAL,
  high REAL,
  low REAL,
  volume INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE
);

-- 빠른 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_price_data_search_id ON price_data(search_id);
CREATE INDEX IF NOT EXISTS idx_price_data_date ON price_data(search_id, date);
