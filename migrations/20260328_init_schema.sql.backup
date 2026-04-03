-- ============================================================================
-- Complete Database Schema Initialization (Starter)
-- Date: 2026-03-28
-- Purpose: Initialize all tables with proper structure and RLS policies
-- ============================================================================

-- ============================================================================
-- 1. users table (linked to Supabase auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
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

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- ============================================================================
-- 2. searches table (stock-based searches)
-- ============================================================================

CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  current_price NUMERIC(12, 2) NOT NULL,
  previous_close NUMERIC(12, 2),
  ma13 NUMERIC(12, 2),
  yoy_change NUMERIC(10, 2) NOT NULL,
  week52_high NUMERIC(12, 2),
  week52_low NUMERIC(12, 2),
  price_data JSONB,           -- PriceDataPoint[] cache
  trends_data JSONB,          -- TrendsDataPoint[] cache (ticker-based)
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT searches_user_ticker_unique UNIQUE (user_id, ticker)
);

ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_searches"
ON searches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_searches"
ON searches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_searches"
ON searches FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_searches"
ON searches FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_searches_user_id ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_ticker ON searches(ticker);
CREATE INDEX IF NOT EXISTS idx_searches_searched_at ON searches(searched_at DESC);

-- ============================================================================
-- 3. price_data table (normalized stock price data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS price_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  close NUMERIC(12, 2) NOT NULL,
  open NUMERIC(12, 2),
  high NUMERIC(12, 2),
  low NUMERIC(12, 2),
  volume BIGINT,

  CONSTRAINT price_data_search_date_unique UNIQUE (search_id, date)
);

ALTER TABLE price_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_price_data"
ON price_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = price_data.search_id
      AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_insert_own_price_data"
ON price_data FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = price_data.search_id
      AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_update_own_price_data"
ON price_data FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = price_data.search_id
      AND searches.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = price_data.search_id
      AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_delete_own_price_data"
ON price_data FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = price_data.search_id
      AND searches.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_price_data_search_id ON price_data(search_id);
CREATE INDEX IF NOT EXISTS idx_price_data_date ON price_data(date);

-- ============================================================================
-- 4. trends_data table (normalized trends data for stock searches)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trends_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  value NUMERIC(5, 2) NOT NULL CHECK (value >= 0 AND value <= 100),

  CONSTRAINT trends_data_search_date_unique UNIQUE (search_id, date)
);

ALTER TABLE trends_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_trends_data"
ON trends_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = trends_data.search_id
      AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_insert_own_trends_data"
ON trends_data FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = trends_data.search_id
      AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_update_own_trends_data"
ON trends_data FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = trends_data.search_id
      AND searches.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = trends_data.search_id
      AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_delete_own_trends_data"
ON trends_data FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = trends_data.search_id
      AND searches.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_trends_data_search_id ON trends_data(search_id);
CREATE INDEX IF NOT EXISTS idx_trends_data_date ON trends_data(date);

-- ============================================================================
-- 5. keyword_searches table (keyword-based searches with Google Trends)
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  ma13 NUMERIC(10, 4),        -- Trends index based 13-week moving average
  yoy_change NUMERIC(10, 2),  -- Trends index based 52-week YoY (%)
  trends_data JSONB,          -- TrendsDataPoint[] cache (keyword-based)
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT keyword_searches_user_keyword_unique UNIQUE (user_id, keyword)
);

ALTER TABLE keyword_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_keyword_searches"
ON keyword_searches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_keyword_searches"
ON keyword_searches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_keyword_searches"
ON keyword_searches FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_keyword_searches"
ON keyword_searches FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_keyword_searches_user_id ON keyword_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_searches_keyword ON keyword_searches(keyword);
CREATE INDEX IF NOT EXISTS idx_keyword_searches_searched_at ON keyword_searches(searched_at DESC);

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
-- 6. keyword_trends_data table (normalized trends data for keyword searches)
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_trends_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_search_id UUID NOT NULL REFERENCES keyword_searches(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  value NUMERIC(5, 2) NOT NULL CHECK (value >= 0 AND value <= 100),

  CONSTRAINT keyword_trends_data_search_date_unique UNIQUE (keyword_search_id, date)
);

ALTER TABLE keyword_trends_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_keyword_trends_data"
ON keyword_trends_data FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM keyword_searches
    WHERE keyword_searches.id = keyword_trends_data.keyword_search_id
      AND keyword_searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_insert_own_keyword_trends_data"
ON keyword_trends_data FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM keyword_searches
    WHERE keyword_searches.id = keyword_trends_data.keyword_search_id
      AND keyword_searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_update_own_keyword_trends_data"
ON keyword_trends_data FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM keyword_searches
    WHERE keyword_searches.id = keyword_trends_data.keyword_search_id
      AND keyword_searches.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM keyword_searches
    WHERE keyword_searches.id = keyword_trends_data.keyword_search_id
      AND keyword_searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_delete_own_keyword_trends_data"
ON keyword_trends_data FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM keyword_searches
    WHERE keyword_searches.id = keyword_trends_data.keyword_search_id
      AND keyword_searches.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_keyword_trends_data_search_id ON keyword_trends_data(keyword_search_id);
CREATE INDEX IF NOT EXISTS idx_keyword_trends_data_date ON keyword_trends_data(date);

-- ============================================================================
-- 7. keyword_stock_overlays table (join table for keyword + stock connection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_stock_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_search_id UUID NOT NULL REFERENCES keyword_searches(id) ON DELETE CASCADE,
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  display_order SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  CONSTRAINT keyword_stock_overlays_unique UNIQUE (keyword_search_id, search_id)
);

ALTER TABLE keyword_stock_overlays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_keyword_stock_overlays"
ON keyword_stock_overlays FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM keyword_searches
    WHERE keyword_searches.id = keyword_stock_overlays.keyword_search_id
      AND keyword_searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_insert_own_keyword_stock_overlays"
ON keyword_stock_overlays FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM keyword_searches
    WHERE keyword_searches.id = keyword_stock_overlays.keyword_search_id
      AND keyword_searches.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = keyword_stock_overlays.search_id
      AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_update_own_keyword_stock_overlays"
ON keyword_stock_overlays FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM keyword_searches
    WHERE keyword_searches.id = keyword_stock_overlays.keyword_search_id
      AND keyword_searches.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM keyword_searches
    WHERE keyword_searches.id = keyword_stock_overlays.keyword_search_id
      AND keyword_searches.user_id = auth.uid()
  )
  AND
  EXISTS (
    SELECT 1 FROM searches
    WHERE searches.id = keyword_stock_overlays.search_id
      AND searches.user_id = auth.uid()
  )
);

CREATE POLICY "users_delete_own_keyword_stock_overlays"
ON keyword_stock_overlays FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM keyword_searches
    WHERE keyword_searches.id = keyword_stock_overlays.keyword_search_id
      AND keyword_searches.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS idx_keyword_stock_overlays_keyword_search_id ON keyword_stock_overlays(keyword_search_id);
CREATE INDEX IF NOT EXISTS idx_keyword_stock_overlays_search_id ON keyword_stock_overlays(search_id);
CREATE INDEX IF NOT EXISTS idx_keyword_stock_overlays_display_order ON keyword_stock_overlays(keyword_search_id, display_order);

-- ============================================================================
-- Schema initialization complete
-- ============================================================================
-- This script creates:
-- - users (OAuth linked)
-- - searches + price_data + trends_data (stock-based)
-- - keyword_searches + keyword_trends_data + keyword_stock_overlays (keyword-based)
-- - All RLS policies for multi-user data isolation
