-- ============================================================================
-- 완전 재설계: 키워드 시계열 데이터 저장 구조
-- Date: 2026-04-03
-- Purpose: 차트에 표시된 모든 시계열(trends, ma13, yoy, normalized_price)을
--         그대로 저장하여 상세 페이지에서 완벽하게 복현
-- ============================================================================

-- ============================================================================
-- 1. 기존 테이블 전부 삭제 (재설계이므로)
-- ============================================================================

DROP TABLE IF EXISTS overlay_chart_timeseries CASCADE;
DROP TABLE IF EXISTS keyword_chart_timeseries CASCADE;
DROP TABLE IF EXISTS keyword_stock_overlays CASCADE;
DROP TABLE IF EXISTS keyword_trends_data CASCADE;
DROP TABLE IF EXISTS keyword_searches CASCADE;
DROP TABLE IF EXISTS stock_price_data CASCADE;
DROP TABLE IF EXISTS trends_data CASCADE;
DROP TABLE IF EXISTS price_data CASCADE;
DROP TABLE IF EXISTS searches CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================================
-- 2. users 테이블 (Supabase auth.users와 연계)
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE INDEX users_email_idx ON users(email);

-- ============================================================================
-- 3. searches 테이블 (종목 저장소 - 간소화)
-- ============================================================================

CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT searches_user_ticker_unique UNIQUE (user_id, ticker)
);

ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_searches" ON searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_searches" ON searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_searches" ON searches
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_searches" ON searches
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_searches_ticker ON searches(ticker);

-- ============================================================================
-- 4. stock_price_data 테이블 (종목 시계열: 5년 일일 데이터)
-- ============================================================================

CREATE TABLE stock_price_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  close NUMERIC(12, 2) NOT NULL,
  open NUMERIC(12, 2),
  high NUMERIC(12, 2),
  low NUMERIC(12, 2),
  volume BIGINT,

  CONSTRAINT stock_price_data_unique UNIQUE (search_id, date)
);

ALTER TABLE stock_price_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_stock_price_data" ON stock_price_data
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM searches WHERE searches.id = stock_price_data.search_id AND searches.user_id = auth.uid())
  );

CREATE POLICY "users_insert_own_stock_price_data" ON stock_price_data
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM searches WHERE searches.id = stock_price_data.search_id AND searches.user_id = auth.uid())
  );

CREATE POLICY "users_update_own_stock_price_data" ON stock_price_data
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM searches WHERE searches.id = stock_price_data.search_id AND searches.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM searches WHERE searches.id = stock_price_data.search_id AND searches.user_id = auth.uid())
  );

CREATE POLICY "users_delete_own_stock_price_data" ON stock_price_data
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM searches WHERE searches.id = stock_price_data.search_id AND searches.user_id = auth.uid())
  );

CREATE INDEX idx_stock_price_data_search_id ON stock_price_data(search_id);
CREATE INDEX idx_stock_price_data_date ON stock_price_data(date);

-- ============================================================================
-- 5. keyword_searches 테이블 (키워드 검색 기록)
-- ============================================================================

CREATE TABLE keyword_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_viewed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT keyword_searches_user_keyword_unique UNIQUE (user_id, keyword)
);

ALTER TABLE keyword_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_keyword_searches" ON keyword_searches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_keyword_searches" ON keyword_searches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_keyword_searches" ON keyword_searches
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_keyword_searches" ON keyword_searches
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_keyword_searches_user_id ON keyword_searches(user_id);
CREATE INDEX idx_keyword_searches_keyword ON keyword_searches(keyword);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_keyword_searches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_keyword_searches_updated_at ON keyword_searches;
CREATE TRIGGER trigger_keyword_searches_updated_at
BEFORE UPDATE ON keyword_searches
FOR EACH ROW
EXECUTE FUNCTION update_keyword_searches_updated_at();

-- ============================================================================
-- 6. keyword_chart_timeseries 테이블 (차트의 모든 시계열 데이터) ★ 핵심
-- ============================================================================

CREATE TABLE keyword_chart_timeseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_search_id UUID NOT NULL REFERENCES keyword_searches(id) ON DELETE CASCADE,
  week_index SMALLINT NOT NULL,
  date TEXT NOT NULL,
  trends_value NUMERIC(5, 2) NOT NULL CHECK (trends_value >= 0 AND trends_value <= 100),
  ma13_value NUMERIC(10, 4),
  yoy_value NUMERIC(10, 2),

  CONSTRAINT keyword_chart_timeseries_unique UNIQUE (keyword_search_id, date)
);

ALTER TABLE keyword_chart_timeseries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_keyword_chart_timeseries" ON keyword_chart_timeseries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM keyword_searches
      WHERE keyword_searches.id = keyword_chart_timeseries.keyword_search_id
        AND keyword_searches.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_keyword_chart_timeseries" ON keyword_chart_timeseries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM keyword_searches
      WHERE keyword_searches.id = keyword_chart_timeseries.keyword_search_id
        AND keyword_searches.user_id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_keyword_chart_timeseries" ON keyword_chart_timeseries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM keyword_searches
      WHERE keyword_searches.id = keyword_chart_timeseries.keyword_search_id
        AND keyword_searches.user_id = auth.uid()
    )
  );

CREATE INDEX idx_keyword_chart_timeseries_keyword_search_id 
  ON keyword_chart_timeseries(keyword_search_id);
CREATE INDEX idx_keyword_chart_timeseries_date 
  ON keyword_chart_timeseries(date);

-- ============================================================================
-- 7. keyword_stock_overlays 테이블 (키워드-종목 매핑)
-- ============================================================================

CREATE TABLE keyword_stock_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_search_id UUID NOT NULL REFERENCES keyword_searches(id) ON DELETE CASCADE,
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  display_order SMALLINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT keyword_stock_overlays_unique UNIQUE (keyword_search_id, search_id)
);

ALTER TABLE keyword_stock_overlays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM keyword_searches
      WHERE keyword_searches.id = keyword_stock_overlays.keyword_search_id
        AND keyword_searches.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM keyword_searches
      WHERE keyword_searches.id = keyword_stock_overlays.keyword_search_id
        AND keyword_searches.user_id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM keyword_searches
      WHERE keyword_searches.id = keyword_stock_overlays.keyword_search_id
        AND keyword_searches.user_id = auth.uid()
    )
  );

CREATE INDEX idx_keyword_stock_overlays_keyword_search_id 
  ON keyword_stock_overlays(keyword_search_id);
CREATE INDEX idx_keyword_stock_overlays_search_id 
  ON keyword_stock_overlays(search_id);

-- ============================================================================
-- 8. overlay_chart_timeseries 테이블 (정규화된 주가 시계열) ★ 핵심
-- ============================================================================

CREATE TABLE overlay_chart_timeseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overlay_id UUID NOT NULL REFERENCES keyword_stock_overlays(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  normalized_price NUMERIC(5, 2) CHECK (normalized_price >= 0 AND normalized_price <= 100),
  raw_price NUMERIC(12, 2),

  CONSTRAINT overlay_chart_timeseries_unique UNIQUE (overlay_id, date)
);

ALTER TABLE overlay_chart_timeseries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_overlay_chart_timeseries" ON overlay_chart_timeseries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM keyword_stock_overlays
      INNER JOIN keyword_searches ON keyword_searches.id = keyword_stock_overlays.keyword_search_id
      WHERE keyword_stock_overlays.id = overlay_chart_timeseries.overlay_id
        AND keyword_searches.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_overlay_chart_timeseries" ON overlay_chart_timeseries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM keyword_stock_overlays
      INNER JOIN keyword_searches ON keyword_searches.id = keyword_stock_overlays.keyword_search_id
      WHERE keyword_stock_overlays.id = overlay_chart_timeseries.overlay_id
        AND keyword_searches.user_id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_overlay_chart_timeseries" ON overlay_chart_timeseries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM keyword_stock_overlays
      INNER JOIN keyword_searches ON keyword_searches.id = keyword_stock_overlays.keyword_search_id
      WHERE keyword_stock_overlays.id = overlay_chart_timeseries.overlay_id
        AND keyword_searches.user_id = auth.uid()
    )
  );

CREATE INDEX idx_overlay_chart_timeseries_overlay_id 
  ON overlay_chart_timeseries(overlay_id);
CREATE INDEX idx_overlay_chart_timeseries_date 
  ON overlay_chart_timeseries(date);

-- ============================================================================
-- 스키마 재설계 완료
-- ============================================================================
