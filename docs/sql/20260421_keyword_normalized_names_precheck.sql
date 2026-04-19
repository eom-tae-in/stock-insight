/**
 * 20260421_keyword_normalized_names.sql 적용 전 확인 SQL
 *
 * 결과가 0행이면 마이그레이션을 바로 적용해도 된다.
 * 결과가 나오면 같은 user 안에서 공백 정규화 후 중복되는 키워드가 있다는 뜻이다.
 */

-- keywords 중복 후보
SELECT
  'keywords' AS source_table,
  user_id,
  regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g') AS normalized_value,
  COUNT(*) AS duplicate_count,
  jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'created_at', created_at
    )
    ORDER BY created_at
  ) AS rows
FROM keywords
WHERE user_id IS NOT NULL
GROUP BY user_id, regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')
HAVING COUNT(*) > 1;

-- keyword_searches 중복 후보
SELECT
  'keyword_searches' AS source_table,
  user_id,
  regexp_replace(btrim(keyword), '[[:space:]]+', ' ', 'g') AS normalized_value,
  region,
  search_type,
  COUNT(*) AS duplicate_count,
  jsonb_agg(
    jsonb_build_object(
      'id', id,
      'keyword', keyword,
      'region', region,
      'search_type', search_type,
      'created_at', created_at
    )
    ORDER BY created_at
  ) AS rows
FROM keyword_searches
GROUP BY
  user_id,
  regexp_replace(btrim(keyword), '[[:space:]]+', ' ', 'g'),
  region,
  search_type
HAVING COUNT(*) > 1;
