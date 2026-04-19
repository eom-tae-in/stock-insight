/**
 * Phase 4: Keywords 테이블 구조 개선
 *
 * 변경 사항:
 * 1. keyword_searches에 region, search_type 컬럼 추가
 * 2. UNIQUE 제약 변경: keyword만 → (keyword, region, search_type) 조합
 * 3. "Apple/GLOBAL/WEB", "Apple/US/WEB" 등이 별도 레코드로 저장
 *
 * 이점:
 * - overlay를 keyword 기준으로 해도 자동으로 region/search_type별 분리
 * - 분석 조건 변경 시에도 overlay 유지
 */

-- ============================================================================
-- Step 1: region, search_type 컬럼 추가
-- ============================================================================

ALTER TABLE keyword_searches
  ADD COLUMN region VARCHAR(10) DEFAULT 'GLOBAL',
  ADD COLUMN search_type VARCHAR(10) DEFAULT 'WEB';

-- ============================================================================
-- Step 2: UNIQUE 제약 변경
-- ============================================================================

-- 기존 UNIQUE 제약 제거
ALTER TABLE keyword_searches
  DROP CONSTRAINT IF EXISTS keyword_searches_user_keyword_unique;

-- 새 UNIQUE 제약: (user_id, keyword, region, search_type)
ALTER TABLE keyword_searches
  ADD CONSTRAINT keyword_searches_user_keyword_region_searchtype_unique
    UNIQUE (user_id, keyword, region, search_type);

-- ============================================================================
-- Step 3: 인덱스 추가
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_keyword_searches_region
  ON keyword_searches(region);

CREATE INDEX IF NOT EXISTS idx_keyword_searches_search_type
  ON keyword_searches(search_type);

CREATE INDEX IF NOT EXISTS idx_keyword_searches_region_searchtype
  ON keyword_searches(region, search_type);

-- ============================================================================
-- 변경 완료
-- ============================================================================
--
-- 새로운 구조:
--
-- keyword_searches (기존명: keywords로 이해)
--   - keyword: "Apple"
--   - region: "GLOBAL" | "US" | "KR" | "JP" | "CN"
--   - search_type: "WEB" | "YOUTUBE"
--   - UNIQUE(user_id, keyword, region, search_type)
--
-- 이제:
-- 1. keyword_searches는 (keyword, region, search_type) 조합으로 저장
-- 2. 같은 keyword도 region/search_type별로 다른 레코드
-- 3. overlay를 keyword 기준으로 하면 자동 분리 ✅
--
