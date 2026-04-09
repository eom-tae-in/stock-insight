/**
 * Phase 2: DB 마이그레이션 - 키워드 분석 시스템 재설계
 *
 * 변경 사항:
 * 1. keywords 테이블 생성 (키워드 이름만 저장)
 * 2. keyword_analysis 테이블 생성 (조건 조합별 분석 데이터)
 * 3. keyword_stock_overlays에 analysis_id 추가
 * 4. RLS 정책 설정
 * 5. 기존 keyword_searches 데이터 마이그레이션
 *
 * 롤백 전략:
 * - 기존 keyword_searches 테이블 유지 (새 구조 문제 시 이전 구조로 복구 가능)
 * - keyword_analysis와 keywords는 새로운 테이블로 독립적
 */

-- ============================================================================
-- Phase 2-1: keywords 테이블 생성
-- ============================================================================

CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT keywords_name_not_empty CHECK (char_length(name) > 0)
);

-- 인덱스: 빠른 조회
CREATE INDEX IF NOT EXISTS keywords_name_idx ON keywords(name);

-- ============================================================================
-- Phase 2-2: keyword_analysis 테이블 생성
-- ============================================================================

CREATE TABLE IF NOT EXISTS keyword_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,

  -- 조건 조합
  region TEXT NOT NULL CHECK (region IN ('GLOBAL', 'US', 'KR', 'JP', 'CN')),
  period TEXT NOT NULL CHECK (period IN ('1Y', '3Y', '5Y')),
  search_type TEXT NOT NULL CHECK (search_type IN ('WEB', 'YOUTUBE')),

  -- 데이터
  trends_data JSONB NOT NULL DEFAULT '[]'::JSONB,
  ma13_data NUMERIC,
  yoy_data NUMERIC,

  -- 타이밍
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- ★핵심: (keyword_id, region, period, search_type) 조합은 유일해야 함
  CONSTRAINT keyword_analysis_unique_combo UNIQUE(keyword_id, region, period, search_type),

  CONSTRAINT trends_data_not_empty CHECK (jsonb_array_length(trends_data) >= 0)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS keyword_analysis_keyword_id_idx ON keyword_analysis(keyword_id);
CREATE INDEX IF NOT EXISTS keyword_analysis_combo_idx ON keyword_analysis(region, period, search_type);

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_keyword_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS keyword_analysis_updated_at_trigger ON keyword_analysis;
CREATE TRIGGER keyword_analysis_updated_at_trigger
BEFORE UPDATE ON keyword_analysis
FOR EACH ROW
EXECUTE FUNCTION update_keyword_analysis_updated_at();

-- ============================================================================
-- Phase 2-3: keyword_stock_overlays 마이그레이션
-- ============================================================================

-- Step 1: analysis_id 컬럼 추가 (기존 데이터 유지)
ALTER TABLE IF EXISTS keyword_stock_overlays
ADD COLUMN IF NOT EXISTS analysis_id UUID REFERENCES keyword_analysis(id) ON DELETE CASCADE;

-- 주의: 기존 keyword_search_id는 일단 유지 (단계적 마이그레이션)
-- Phase 3에서 data migration 후 keyword_search_id 제거

-- ============================================================================
-- Phase 2-4: RLS 정책 (keyword_analysis)
-- ============================================================================

-- keyword_analysis를 user_id로 검증하기 위해 keywords 테이블에 user_id 추가
-- 아니면 keyword_searches와의 관계를 통해 검증

-- 먼저 keywords 테이블에 user_id 추가 (RLS를 위해 필요)
ALTER TABLE IF EXISTS keywords
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- user_id 인덱스 추가
CREATE INDEX IF NOT EXISTS keywords_user_id_idx ON keywords(user_id);

-- RLS 활성화
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_analysis ENABLE ROW LEVEL SECURITY;

-- keywords RLS 정책
DROP POLICY IF EXISTS "Users can view their own keywords" ON keywords;
CREATE POLICY "Users can view their own keywords" ON keywords
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create keywords" ON keywords;
CREATE POLICY "Users can create keywords" ON keywords
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own keywords" ON keywords;
CREATE POLICY "Users can delete their own keywords" ON keywords
  FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own keywords" ON keywords;
CREATE POLICY "Users can update their own keywords" ON keywords
  FOR UPDATE USING (user_id = auth.uid());

-- keyword_analysis RLS 정책 (keywords.user_id를 통해 검증)
DROP POLICY IF EXISTS "Users can view their own analyses" ON keyword_analysis;
CREATE POLICY "Users can view their own analyses" ON keyword_analysis
  FOR SELECT USING (
    keyword_id IN (
      SELECT id FROM keywords WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create analyses for their keywords" ON keyword_analysis;
CREATE POLICY "Users can create analyses for their keywords" ON keyword_analysis
  FOR INSERT WITH CHECK (
    keyword_id IN (
      SELECT id FROM keywords WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own analyses" ON keyword_analysis;
CREATE POLICY "Users can delete their own analyses" ON keyword_analysis
  FOR DELETE USING (
    keyword_id IN (
      SELECT id FROM keywords WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own analyses" ON keyword_analysis;
CREATE POLICY "Users can update their own analyses" ON keyword_analysis
  FOR UPDATE USING (
    keyword_id IN (
      SELECT id FROM keywords WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Phase 2-5: 데이터 마이그레이션
-- ============================================================================

-- Step 1: 기존 keyword_searches에서 keywords 생성 (DISTINCT)
-- user_id와 함께 저장하여 RLS 정책이 작동하도록 함
INSERT INTO keywords (id, user_id, name, created_at)
SELECT
  id,
  user_id,
  keyword,
  created_at
FROM keyword_searches
ON CONFLICT DO NOTHING;

-- Step 2: 기존 keyword_searches를 keyword_analysis로 변환
-- 기본값: GLOBAL / 5Y / WEB
-- keyword_chart_timeseries에서 데이터를 수집하여 trends_data JSONB 생성
-- ma13_data, yoy_data는 시계열 기준 최신값(마지막 row)을 사용
INSERT INTO keyword_analysis (
  id,
  keyword_id,
  region,
  period,
  search_type,
  trends_data,
  ma13_data,
  yoy_data,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  ks.id,
  'GLOBAL'::TEXT,
  '5Y'::TEXT,
  'WEB'::TEXT,
  -- trends_data: 모든 차트 데이터를 배열로 집계
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'date', kct.date,
        'value', kct.trends_value,
        'ma13Value', kct.ma13_value,
        'yoyValue', kct.yoy_value
      ) ORDER BY kct.week_index
    ),
    '[]'::JSONB
  ),
  -- ma13_data: 최신값(week_index 기준 마지막 행)
  (
    SELECT kct.ma13_value
    FROM keyword_chart_timeseries kct
    WHERE kct.keyword_search_id = ks.id
    ORDER BY kct.week_index DESC
    LIMIT 1
  ),
  -- yoy_data: 최신값(week_index 기준 마지막 행)
  (
    SELECT kct.yoy_value
    FROM keyword_chart_timeseries kct
    WHERE kct.keyword_search_id = ks.id
    ORDER BY kct.week_index DESC
    LIMIT 1
  ),
  ks.created_at,
  ks.updated_at
FROM keyword_searches ks
LEFT JOIN keyword_chart_timeseries kct ON kct.keyword_search_id = ks.id
WHERE NOT EXISTS (
  SELECT 1 FROM keyword_analysis ka
  WHERE ka.keyword_id = ks.id
    AND ka.region = 'GLOBAL'
    AND ka.period = '5Y'
    AND ka.search_type = 'WEB'
)
GROUP BY ks.id, ks.created_at, ks.updated_at;

-- Step 3: keyword_stock_overlays 업데이트 (기존 데이터)
-- 각 overlay를 해당 keyword의 기본 analysis(GLOBAL/5Y/WEB)로 매핑
-- keyword_search_id(=keywords.id) 기준으로 GLOBAL/5Y/WEB analysis 찾아서 설정
UPDATE keyword_stock_overlays
SET analysis_id = (
  SELECT ka.id
  FROM keyword_analysis ka
  WHERE ka.keyword_id = keyword_stock_overlays.keyword_search_id
    AND ka.region = 'GLOBAL'
    AND ka.period = '5Y'
    AND ka.search_type = 'WEB'
)
WHERE analysis_id IS NULL
  AND keyword_search_id IN (
    SELECT id FROM keywords
  );

-- ============================================================================
-- Phase 2-6: 상태 확인 쿼리 (검증용)
-- ============================================================================

-- keywords 테이블 확인
-- SELECT COUNT(*) as keyword_count FROM keywords;

-- keyword_analysis 테이블 확인
-- SELECT COUNT(*) as analysis_count FROM keyword_analysis;

-- UNIQUE 제약 확인 (중복 시도)
-- SELECT keyword_id, region, period, search_type, COUNT(*)
-- FROM keyword_analysis
-- GROUP BY keyword_id, region, period, search_type
-- HAVING COUNT(*) > 1;

-- RLS 정책 확인
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE tablename IN ('keywords', 'keyword_analysis');
