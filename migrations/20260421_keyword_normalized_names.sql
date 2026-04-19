/**
 * Phase 1 cleanup: 키워드 공백 정규화 중복 기준 추가
 *
 * 규칙:
 * - 앞뒤 공백 제거
 * - 연속 공백은 공백 1개로 축소
 * - 대소문자, 언어, 내부 단어 구분은 보존
 *
 * 적용 전 주의:
 * - 기존 데이터에 정규화 기준 중복이 있으면 의도적으로 실패한다.
 * - 실패 시 중복 데이터를 수동 정리한 뒤 다시 적용한다.
 */

BEGIN;

ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS normalized_name TEXT;

ALTER TABLE keyword_searches
  ADD COLUMN IF NOT EXISTS normalized_keyword TEXT;

UPDATE keywords
SET
  name = regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g'),
  normalized_name = regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')
WHERE normalized_name IS NULL
  OR normalized_name <> regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')
  OR name <> regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g');

UPDATE keyword_searches
SET
  keyword = regexp_replace(btrim(keyword), '[[:space:]]+', ' ', 'g'),
  normalized_keyword = regexp_replace(btrim(keyword), '[[:space:]]+', ' ', 'g')
WHERE normalized_keyword IS NULL
  OR normalized_keyword <> regexp_replace(btrim(keyword), '[[:space:]]+', ' ', 'g')
  OR keyword <> regexp_replace(btrim(keyword), '[[:space:]]+', ' ', 'g');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM keywords
    WHERE user_id IS NOT NULL
    GROUP BY user_id, normalized_name
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate keywords after spacing normalization. Resolve duplicates in keywords before applying this migration.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM keyword_searches
    GROUP BY user_id, normalized_keyword, region, search_type
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate keyword_searches after spacing normalization. Resolve duplicates before applying this migration.';
  END IF;
END $$;

ALTER TABLE keywords
  ALTER COLUMN normalized_name SET NOT NULL;

ALTER TABLE keyword_searches
  ALTER COLUMN normalized_keyword SET NOT NULL;

ALTER TABLE keywords
  DROP CONSTRAINT IF EXISTS keywords_normalized_name_not_empty;

ALTER TABLE keywords
  ADD CONSTRAINT keywords_normalized_name_not_empty
  CHECK (char_length(normalized_name) > 0);

ALTER TABLE keyword_searches
  DROP CONSTRAINT IF EXISTS keyword_searches_normalized_keyword_not_empty;

ALTER TABLE keyword_searches
  ADD CONSTRAINT keyword_searches_normalized_keyword_not_empty
  CHECK (char_length(normalized_keyword) > 0);

CREATE UNIQUE INDEX IF NOT EXISTS keywords_user_normalized_name_unique
  ON keywords(user_id, normalized_name)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS keyword_searches_user_normalized_keyword_region_searchtype_unique
  ON keyword_searches(user_id, normalized_keyword, region, search_type);

COMMIT;
