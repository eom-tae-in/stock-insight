-- ============================================================================
-- Migration: Create searches table in Supabase (PostgreSQL)
-- Created: 2026-03-28
-- Purpose: Phase 2A - First table migration to Supabase
--
-- Table: searches
-- Stores stock search history and metadata
-- ============================================================================

-- Drop table if exists (for re-running migrations)
DROP TABLE IF EXISTS searches CASCADE;

-- Create searches table
CREATE TABLE searches (
  id TEXT PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  current_price NUMERIC(10, 2),
  previous_close NUMERIC(10, 2),
  ma13 NUMERIC(10, 2),
  yoy_change NUMERIC(10, 2),
  week52_high NUMERIC(10, 2),
  week52_low NUMERIC(10, 2),
  price_data JSONB,
  trends_data JSONB,
  last_updated_at TIMESTAMP,
  searched_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for query performance
CREATE INDEX idx_searches_ticker ON searches(ticker);
CREATE INDEX idx_searches_searched_at ON searches(searched_at DESC);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_searches_updated_at
BEFORE UPDATE ON searches
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- Summary of changes:
-- - Created searches table with same structure as SQLite
-- - JSONB columns for price_data and trends_data
-- - Added timestamp indexes for query optimization
-- - Added automatic updated_at trigger
-- ============================================================================
