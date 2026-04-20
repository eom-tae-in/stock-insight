/**
 * Drop legacy keyword tables after RESTful keyword/analysis routes migration.
 *
 * Preconditions:
 * - Application routes no longer read or write these tables.
 * - Required historical data has been migrated into:
 *   - keywords
 *   - keyword_analysis
 *   - keyword_stock_overlays
 *   - overlay_chart_timeseries
 * - Run a backup or table export before applying in production.
 */

BEGIN;

DROP TABLE IF EXISTS keyword_temporary_overlays CASCADE;
DROP TABLE IF EXISTS keyword_chart_timeseries CASCADE;
DROP TABLE IF EXISTS keyword_searches CASCADE;

COMMIT;
