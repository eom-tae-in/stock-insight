import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers'
import pg from 'pg'

const { Pool } = pg

export type PostgresTestDatabase = {
  pool: pg.Pool
  stop: () => Promise<void>
}

const POSTGRES_PORT = 5432
const POSTGRES_IMAGE = 'postgres:16-alpine'
const POSTGRES_USER = 'test_user'
const POSTGRES_PASSWORD = 'test_password'
const POSTGRES_DB = 'stock_insight_test'

const schemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  currency TEXT DEFAULT 'USD',
  weekly_open NUMERIC,
  weekly_high NUMERIC,
  weekly_low NUMERIC,
  current_price NUMERIC,
  previous_close NUMERIC,
  ma13 NUMERIC,
  yoy_change NUMERIC,
  last_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT searches_user_ticker_unique UNIQUE (user_id, ticker),
  CONSTRAINT searches_ticker_not_empty CHECK (length(trim(ticker)) > 0),
  CONSTRAINT searches_company_name_not_empty CHECK (length(trim(company_name)) > 0)
);

CREATE INDEX searches_user_searched_at_idx
  ON searches(user_id, searched_at DESC);

CREATE TABLE stock_price_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  close NUMERIC NOT NULL,
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  volume BIGINT,
  CONSTRAINT stock_price_data_unique UNIQUE (search_id, date)
);

CREATE INDEX stock_price_data_search_date_idx
  ON stock_price_data(search_id, date);

CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  display_order INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT keywords_user_normalized_unique UNIQUE (user_id, normalized_name),
  CONSTRAINT keywords_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT keywords_normalized_name_not_empty CHECK (length(trim(normalized_name)) > 0)
);

CREATE INDEX keywords_user_display_order_idx
  ON keywords(user_id, display_order, created_at DESC);

CREATE TABLE keyword_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  period TEXT NOT NULL,
  search_type TEXT NOT NULL,
  trends_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  ma13_data NUMERIC,
  yoy_data NUMERIC,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT keyword_analysis_unique_combo UNIQUE(keyword_id, region, period, search_type),
  CONSTRAINT keyword_analysis_region_not_empty CHECK (length(trim(region)) > 0),
  CONSTRAINT keyword_analysis_period_not_empty CHECK (length(trim(period)) > 0),
  CONSTRAINT keyword_analysis_search_type_not_empty CHECK (length(trim(search_type)) > 0)
);

CREATE INDEX keyword_analysis_keyword_display_order_idx
  ON keyword_analysis(keyword_id, display_order, created_at DESC);

CREATE TABLE keyword_stock_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES keyword_analysis(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT keyword_stock_overlays_analysis_ticker_unique UNIQUE (analysis_id, ticker),
  CONSTRAINT keyword_stock_overlays_ticker_not_empty CHECK (length(trim(ticker)) > 0),
  CONSTRAINT keyword_stock_overlays_company_name_not_empty CHECK (length(trim(company_name)) > 0)
);

CREATE INDEX keyword_stock_overlays_analysis_display_order_idx
  ON keyword_stock_overlays(analysis_id, display_order, created_at DESC);

CREATE TABLE overlay_chart_timeseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overlay_id UUID NOT NULL REFERENCES keyword_stock_overlays(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  normalized_price NUMERIC NOT NULL,
  raw_price NUMERIC NOT NULL,
  CONSTRAINT overlay_chart_timeseries_unique UNIQUE (overlay_id, date)
);

CREATE INDEX overlay_chart_timeseries_overlay_date_idx
  ON overlay_chart_timeseries(overlay_id, date);
`

export async function startPostgresTestDatabase(): Promise<PostgresTestDatabase> {
  const container = await startContainer()
  const pool = new Pool({
    host: container.getHost(),
    port: container.getMappedPort(POSTGRES_PORT),
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB,
  })

  await pool.query(schemaSql)

  return {
    pool,
    stop: async () => {
      await pool.end()
      await container.stop()
    },
  }
}

async function startContainer(): Promise<StartedTestContainer> {
  return new GenericContainer(POSTGRES_IMAGE)
    .withEnvironment({
      POSTGRES_USER,
      POSTGRES_PASSWORD,
      POSTGRES_DB,
    })
    .withExposedPorts(POSTGRES_PORT)
    .withWaitStrategy(
      Wait.forLogMessage('database system is ready to accept connections', 2)
    )
    .withStartupTimeout(120_000)
    .start()
}
