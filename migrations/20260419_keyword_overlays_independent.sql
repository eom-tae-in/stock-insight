/**
 * Phase 1: 키워드 분석 오버레이 독립화
 *
 * 목적:
 * - 키워드 기반 차트의 종목 오버레이를 저장 종목(searches) 도메인에서 분리한다.
 * - 키워드 분석 화면에서 추가한 종목은 keyword_stock_overlays와
 *   overlay_chart_timeseries에만 저장한다.
 * - 사용자 저장 종목 목록은 searches/stock_price_data가 계속 담당한다.
 *
 * 적용 전 확인:
 * - 기존 keyword_stock_overlays.search_id 값은 ticker/company_name으로 이미 복제되어 있어야 한다.
 * - 운영 DB 적용 전에는 백업 후 staging에서 먼저 검증한다.
 *
 * 호환 전략:
 * - 이 마이그레이션에서는 search_id 컬럼을 즉시 삭제하지 않고 nullable legacy 컬럼으로 남긴다.
 * - API/클라이언트가 ticker 기반으로 전환된 뒤 별도 cleanup 마이그레이션에서 제거한다.
 */

BEGIN;

-- 1. ticker 기반 unique 제약을 만들 수 있도록 기존 데이터를 정규화한다.
UPDATE keyword_stock_overlays
SET
  ticker = UPPER(TRIM(ticker)),
  company_name = COALESCE(NULLIF(TRIM(company_name), ''), UPPER(TRIM(ticker)))
WHERE ticker IS NOT NULL;

-- 같은 analysis 안에 같은 ticker가 여러 번 있으면 가장 앞 순서/오래된 row만 남긴다.
WITH ranked_overlays AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY analysis_id, ticker
      ORDER BY display_order ASC NULLS LAST, created_at ASC NULLS LAST, id ASC
    ) AS row_number
  FROM keyword_stock_overlays
)
DELETE FROM keyword_stock_overlays
WHERE id IN (
  SELECT id
  FROM ranked_overlays
  WHERE row_number > 1
);

-- 2. 기존 search_id FK/인덱스/unique 제약 제거
ALTER TABLE keyword_stock_overlays
  DROP CONSTRAINT IF EXISTS keyword_stock_overlays_search_id_fkey;

ALTER TABLE keyword_stock_overlays
  DROP CONSTRAINT IF EXISTS keyword_stock_overlays_unique;

DROP INDEX IF EXISTS idx_keyword_stock_overlays_search_id;

-- 3. ticker 기반 독립 오버레이 모델 보강
ALTER TABLE keyword_stock_overlays
  ALTER COLUMN ticker SET NOT NULL,
  ALTER COLUMN company_name SET NOT NULL,
  ADD COLUMN IF NOT EXISTS exchange TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'yahoo',
  ADD COLUMN IF NOT EXISTS last_refreshed_at TIMESTAMP WITH TIME ZONE;

-- search_id는 마이그레이션 호환용으로 잠시 남기되 신규 코드에서는 사용하지 않는다.
ALTER TABLE keyword_stock_overlays
  ALTER COLUMN search_id DROP NOT NULL;

ALTER TABLE keyword_stock_overlays
  DROP CONSTRAINT IF EXISTS keyword_stock_overlays_ticker_not_empty;

ALTER TABLE keyword_stock_overlays
  ADD CONSTRAINT keyword_stock_overlays_ticker_not_empty
  CHECK (char_length(TRIM(ticker)) > 0);

CREATE UNIQUE INDEX IF NOT EXISTS keyword_stock_overlays_analysis_ticker_unique
  ON keyword_stock_overlays (analysis_id, ticker);

CREATE INDEX IF NOT EXISTS idx_keyword_stock_overlays_ticker
  ON keyword_stock_overlays (ticker);

-- 4. overlay 시계열은 오버레이 소유권만 따른다.
ALTER TABLE overlay_chart_timeseries
  ADD COLUMN IF NOT EXISTS volume NUMERIC;

-- 5. RLS 정책은 analysis -> keyword -> user 소유권만 검증한다.
DROP POLICY IF EXISTS "users_select_own_keyword_stock_overlays" ON keyword_stock_overlays;
CREATE POLICY "users_select_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = keyword_stock_overlays.analysis_id
        AND k.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_insert_own_keyword_stock_overlays" ON keyword_stock_overlays;
CREATE POLICY "users_insert_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = keyword_stock_overlays.analysis_id
        AND k.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_update_own_keyword_stock_overlays" ON keyword_stock_overlays;
CREATE POLICY "users_update_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = keyword_stock_overlays.analysis_id
        AND k.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = keyword_stock_overlays.analysis_id
        AND k.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_delete_own_keyword_stock_overlays" ON keyword_stock_overlays;
CREATE POLICY "users_delete_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = keyword_stock_overlays.analysis_id
        AND k.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_select_own_overlay_chart_timeseries" ON overlay_chart_timeseries;
CREATE POLICY "users_select_own_overlay_chart_timeseries" ON overlay_chart_timeseries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM keyword_stock_overlays kso
      INNER JOIN keyword_analysis ka ON ka.id = kso.analysis_id
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE kso.id = overlay_chart_timeseries.overlay_id
        AND k.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_insert_own_overlay_chart_timeseries" ON overlay_chart_timeseries;
CREATE POLICY "users_insert_own_overlay_chart_timeseries" ON overlay_chart_timeseries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM keyword_stock_overlays kso
      INNER JOIN keyword_analysis ka ON ka.id = kso.analysis_id
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE kso.id = overlay_chart_timeseries.overlay_id
        AND k.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_delete_own_overlay_chart_timeseries" ON overlay_chart_timeseries;
CREATE POLICY "users_delete_own_overlay_chart_timeseries" ON overlay_chart_timeseries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM keyword_stock_overlays kso
      INNER JOIN keyword_analysis ka ON ka.id = kso.analysis_id
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE kso.id = overlay_chart_timeseries.overlay_id
        AND k.user_id = auth.uid()
    )
  );

COMMIT;
