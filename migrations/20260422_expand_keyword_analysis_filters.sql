/*
 * Expand keyword_analysis filter values to match parser-supported pytrends inputs.
 *
 * Internal canonical values:
 * - region: frontend/server stores uppercase codes such as GLOBAL, US, KR.
 * - period: frontend/server stores uppercase codes such as 1M, 3M, 1Y, 5Y.
 * - search_type: frontend/server stores uppercase codes such as WEB, NEWS, YOUTUBE.
 *
 * src/lib/parsers/trends-parsers.ts is responsible for translating these values
 * to pytrends build_payload values.
 */

BEGIN;

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'keyword_analysis'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) LIKE '%region%'
        OR pg_get_constraintdef(oid) LIKE '%period%'
        OR pg_get_constraintdef(oid) LIKE '%search_type%'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE keyword_analysis DROP CONSTRAINT IF EXISTS %I',
      constraint_record.conname
    );
  END LOOP;
END $$;

ALTER TABLE keyword_analysis
  ADD CONSTRAINT keyword_analysis_region_supported
  CHECK (
    region = 'GLOBAL'
    OR region ~ '^[A-Z]{2}(-[A-Z0-9]{1,10})?$'
  );

ALTER TABLE keyword_analysis
  ADD CONSTRAINT keyword_analysis_period_supported
  CHECK (
    period IN (
      '1M',
      '3M',
      '12M',
      '1Y',
      '2Y',
      '3Y',
      '4Y',
      '5Y',
      'ALL'
    )
  );

ALTER TABLE keyword_analysis
  ADD CONSTRAINT keyword_analysis_search_type_supported
  CHECK (
    search_type IN (
      'WEB',
      'IMAGES',
      'NEWS',
      'YOUTUBE',
      'SHOPPING'
    )
  );

COMMIT;
