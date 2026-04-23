/**
 * 키워드 오버레이의 legacy keyword_id 제거
 *
 * 목적:
 * - keyword_stock_overlays는 keyword_id가 아니라 analysis_id에 종속된다.
 * - 같은 키워드라도 분석 조건(region/search_type)마다 다른 오버레이 목록을 가질 수 있다.
 * - keyword_id는 analysis_id -> keyword_analysis.keyword_id로 이미 알 수 있으므로 중복 저장하지 않는다.
 *
 * 적용 전제:
 * - keyword_stock_overlays.analysis_id가 존재한다.
 * - 기존 오버레이 row의 analysis_id가 모두 채워져 있다.
 */

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'keyword_stock_overlays'
      AND column_name = 'analysis_id'
  ) THEN
    RAISE EXCEPTION 'keyword_stock_overlays.analysis_id column is required before dropping keyword_id.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM keyword_stock_overlays
    WHERE analysis_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot drop keyword_stock_overlays.keyword_id while analysis_id contains NULL rows.';
  END IF;
END $$;

-- 컬럼 제거 전에 기존 정책을 정리하고 analysis_id 기반 정책으로 재생성한다.
DROP POLICY IF EXISTS "users_select_own_keyword_stock_overlays" ON keyword_stock_overlays;
DROP POLICY IF EXISTS "users_insert_own_keyword_stock_overlays" ON keyword_stock_overlays;
DROP POLICY IF EXISTS "users_update_own_keyword_stock_overlays" ON keyword_stock_overlays;
DROP POLICY IF EXISTS "users_delete_own_keyword_stock_overlays" ON keyword_stock_overlays;

DROP INDEX IF EXISTS idx_keyword_stock_overlays_keyword_id;

ALTER TABLE keyword_stock_overlays
  DROP COLUMN IF EXISTS keyword_id;

ALTER TABLE keyword_stock_overlays
  ALTER COLUMN analysis_id SET NOT NULL,
  ALTER COLUMN ticker SET NOT NULL,
  ALTER COLUMN company_name SET NOT NULL;

ALTER TABLE keyword_stock_overlays
  DROP CONSTRAINT IF EXISTS keyword_stock_overlays_unique;

DROP INDEX IF EXISTS keyword_stock_overlays_analysis_ticker_unique;
CREATE UNIQUE INDEX keyword_stock_overlays_analysis_ticker_unique
  ON keyword_stock_overlays (analysis_id, ticker);

CREATE INDEX IF NOT EXISTS idx_keyword_stock_overlays_analysis_id
  ON keyword_stock_overlays (analysis_id);

ALTER TABLE keyword_stock_overlays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = keyword_stock_overlays.analysis_id
        AND k.user_id = auth.uid()
    )
  );

CREATE POLICY "users_insert_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = keyword_stock_overlays.analysis_id
        AND k.user_id = auth.uid()
    )
  );

CREATE POLICY "users_update_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = keyword_stock_overlays.analysis_id
        AND k.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = keyword_stock_overlays.analysis_id
        AND k.user_id = auth.uid()
    )
  );

CREATE POLICY "users_delete_own_keyword_stock_overlays" ON keyword_stock_overlays
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM keyword_analysis ka
      INNER JOIN keywords k ON k.id = ka.keyword_id
      WHERE ka.id = keyword_stock_overlays.analysis_id
        AND k.user_id = auth.uid()
    )
  );

COMMIT;
