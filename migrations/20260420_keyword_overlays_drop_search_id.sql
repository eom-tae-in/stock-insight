/**
 * Phase 1 cleanup: 키워드 오버레이 legacy search_id 제거
 *
 * 전제:
 * - 애플리케이션 코드는 keyword_stock_overlays.search_id를 더 이상 읽거나 쓰지 않는다.
 * - 키워드 기반 종목 오버레이는 (analysis_id, ticker) 기준으로만 중복을 판단한다.
 * - 사용자 저장 종목(searches) 도메인과 키워드 오버레이 도메인은 독립이다.
 *
 * 적용 전 확인:
 * - 20260419_keyword_overlays_independent.sql 적용 완료
 * - staging에서 오버레이 추가/조회/삭제/최신화 검증 완료
 */

BEGIN;

DROP INDEX IF EXISTS idx_keyword_stock_overlays_search_id;

ALTER TABLE keyword_stock_overlays
  DROP CONSTRAINT IF EXISTS keyword_stock_overlays_search_id_fkey;

ALTER TABLE keyword_stock_overlays
  DROP COLUMN IF EXISTS search_id;

COMMIT;
