-- Google Trends 데이터 (정규화됨)
-- searches 테이블의 각 종목에 대한 5년 주간 검색 관심도 데이터
CREATE TABLE IF NOT EXISTS trends_data (
  id TEXT PRIMARY KEY,
  search_id TEXT NOT NULL,
  date TEXT NOT NULL,
  value INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (search_id) REFERENCES searches(id) ON DELETE CASCADE
);

-- 빠른 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_trends_data_search_id ON trends_data(search_id);
CREATE INDEX IF NOT EXISTS idx_trends_data_date ON trends_data(search_id, date);
