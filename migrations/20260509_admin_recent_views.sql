/*
 * Admin recent list views
 *
 * These views expose a single recent_at value so the admin dashboard can sort
 * by "updated/refreshed date if present, otherwise created date" in one query.
 */

BEGIN;

CREATE INDEX IF NOT EXISTS keyword_analysis_recent_updated_idx
  ON keyword_analysis (updated_at DESC);

CREATE INDEX IF NOT EXISTS keyword_analysis_recent_created_idx
  ON keyword_analysis (created_at DESC);

CREATE INDEX IF NOT EXISTS keyword_stock_overlays_recent_refreshed_idx
  ON keyword_stock_overlays (last_refreshed_at DESC);

CREATE INDEX IF NOT EXISTS keyword_stock_overlays_recent_created_idx
  ON keyword_stock_overlays (created_at DESC);

CREATE OR REPLACE VIEW public.admin_recent_keyword_analysis
WITH (security_invoker = true) AS
SELECT
  ka.id,
  ka.keyword_id,
  k.name AS keyword_name,
  k.user_id AS keyword_user_id,
  ka.region,
  ka.period,
  ka.search_type,
  ka.trends_data,
  ka.created_at,
  ka.updated_at,
  COALESCE(ka.updated_at, ka.created_at) AS recent_at
FROM keyword_analysis ka
INNER JOIN keywords k ON k.id = ka.keyword_id;

CREATE OR REPLACE VIEW public.admin_recent_keyword_stock_overlays
WITH (security_invoker = true) AS
SELECT
  kso.id,
  kso.analysis_id,
  kso.ticker,
  kso.company_name,
  kso.created_at,
  kso.last_refreshed_at,
  COALESCE(kso.last_refreshed_at, kso.created_at) AS recent_at,
  ka.region,
  ka.period,
  ka.search_type,
  k.name AS keyword_name,
  k.user_id AS keyword_user_id,
  COALESCE(
    jsonb_agg(
      jsonb_build_object('date', oct.date)
      ORDER BY oct.date
    ) FILTER (WHERE oct.date IS NOT NULL),
    '[]'::jsonb
  ) AS overlay_chart_timeseries
FROM keyword_stock_overlays kso
LEFT JOIN keyword_analysis ka ON ka.id = kso.analysis_id
LEFT JOIN keywords k ON k.id = ka.keyword_id
LEFT JOIN overlay_chart_timeseries oct ON oct.overlay_id = kso.id
GROUP BY
  kso.id,
  kso.analysis_id,
  kso.ticker,
  kso.company_name,
  kso.created_at,
  kso.last_refreshed_at,
  ka.region,
  ka.period,
  ka.search_type,
  k.name,
  k.user_id;

GRANT SELECT ON public.admin_recent_keyword_analysis TO authenticated;
GRANT SELECT ON public.admin_recent_keyword_stock_overlays TO authenticated;

COMMIT;
