-- ============================================================================
-- Migration: 지난주 OHLC 데이터 추가
-- Date: 2026-04-20
-- Purpose: 저장된 종목 카드에 지난주 시가/고가/저가/종가 표시
-- ============================================================================

ALTER TABLE searches
ADD COLUMN weekly_open NUMERIC(12, 2),
ADD COLUMN weekly_high NUMERIC(12, 2),
ADD COLUMN weekly_low NUMERIC(12, 2);

-- ============================================================================
-- Index 추가 (필요시)
-- ============================================================================
CREATE INDEX idx_searches_ticker_user ON searches(ticker, user_id);
