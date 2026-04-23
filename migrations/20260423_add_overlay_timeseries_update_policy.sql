/**
 * Allow overlay_chart_timeseries upsert refreshes.
 *
 * Supabase upsert needs UPDATE permission when a row already exists for
 * (overlay_id, date). Existing policies allowed INSERT/SELECT/DELETE only,
 * so overlay refreshes failed on conflict.
 */

DROP POLICY IF EXISTS "users_update_own_overlay_chart_timeseries" ON overlay_chart_timeseries;
CREATE POLICY "users_update_own_overlay_chart_timeseries" ON overlay_chart_timeseries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM keyword_stock_overlays kso
      INNER JOIN keyword_analysis ka ON ka.id = kso.analysis_id
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE kso.id = overlay_chart_timeseries.overlay_id
        AND k.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM keyword_stock_overlays kso
      INNER JOIN keyword_analysis ka ON ka.id = kso.analysis_id
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE kso.id = overlay_chart_timeseries.overlay_id
        AND k.user_id = auth.uid()
    )
  );
