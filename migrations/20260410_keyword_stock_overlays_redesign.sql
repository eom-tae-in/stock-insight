/**
 * Phase 3: keyword_stock_overlays 재설계
 *
 * 변경 사항:
 * 1. keyword_stock_overlays 테이블 완전 재구성
 * 2. analysis_id를 기본 키로 (각 분석 조건별 독립적 overlay 목록)
 * 3. keyword_search_id 제거 (analysis 통해 간접 참조)
 * 4. UNIQUE 제약 변경: (analysis_id, search_id)
 * 5. RLS 정책 재설정
 *
 * 요구사항:
 * - 같은 키워드의 다른 분석 조건에서 같은 종목 추가 가능
 * - 예: Apple+GLOBAL/WEB에 AAPL, Apple+US/WEB에도 AAPL 추가 가능
 * - 조건 변경 시 해당 조건의 종목 목록만 조회
 */

-- ============================================================================
-- Step 1: 기존 keyword_stock_overlays 관련 객체 모두 제거
-- ============================================================================

DROP TABLE IF EXISTS overlay_chart_timeseries CASCADE;
DROP TABLE IF EXISTS keyword_stock_overlays CASCADE;

-- ============================================================================
-- Step 2: keyword_stock_overlays 재생성 (분석별 설계)
-- ============================================================================

CREATE TABLE keyword_stock_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ★ 핵심: analysis_id가 분석 조건을 정의
  -- analysis_id 하나 = "Apple의 GLOBAL/WEB 분석"
  analysis_id UUID NOT NULL REFERENCES keyword_analysis(id) ON DELETE CASCADE,

  -- 어떤 종목을 추가했는가
  search_id UUID NOT NULL REFERENCES searches(id) ON DELETE CASCADE,

  -- 편의 정보 (조회 최소화)
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  display_order SMALLINT DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- ★ 변경: 각 분석 내에서만 search_id 중복 방지
  CONSTRAINT keyword_stock_overlays_unique UNIQUE (analysis_id, search_id)
);

-- 인덱스
CREATE INDEX idx_keyword_stock_overlays_analysis_id
  ON keyword_stock_overlays(analysis_id);
CREATE INDEX idx_keyword_stock_overlays_search_id
  ON keyword_stock_overlays(search_id);

-- ============================================================================
-- Step 3: overlay_chart_timeseries 재생성 (정규화된 주가 시계열)
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

CREATE INDEX idx_overlay_chart_timeseries_overlay_id
  ON overlay_chart_timeseries(overlay_id);
CREATE INDEX idx_overlay_chart_timeseries_date
  ON overlay_chart_timeseries(date);

-- ============================================================================
-- Step 4: RLS 정책 설정 (keyword_stock_overlays)
-- ============================================================================

ALTER TABLE keyword_stock_overlays ENABLE ROW LEVEL SECURITY;

-- SELECT: 자신의 분석에 추가한 overlays만
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

-- INSERT: 자신의 분석에만 overlay 추가 가능
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

-- UPDATE: 자신의 분석의 overlays만 수정 가능
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

-- DELETE: 자신의 분석의 overlays만 삭제 가능
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

-- ============================================================================
-- Step 5: overlay_chart_timeseries RLS 정책
-- ============================================================================

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

-- ============================================================================
-- 재설계 완료
-- ============================================================================
--
-- 새로운 구조:
--
-- keyword_analysis (이미 있음)
--   - id: "Apple의 GLOBAL/WEB 분석"
--   - keyword_id: Apple 키워드
--   - region, search_type
--   - trends_data, ma13_data, yoy_data
--
-- keyword_stock_overlays (재설계)
--   - analysis_id: 위의 분석
--   - search_id: 추가한 종목
--   - UNIQUE(analysis_id, search_id)
--
-- 이제:
-- 1. 같은 키워드, 다른 분석에서 같은 종목 추가 가능 ✅
-- 2. 분석 조건 변경 시 해당 조건의 종목만 조회 ✅
-- 3. RLS: analysis_id → keyword_analysis → keywords.user_id 검증 ✅
--
