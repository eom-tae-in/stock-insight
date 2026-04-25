-- Add user-controlled ordering for saved keyword analysis conditions.

ALTER TABLE keyword_analysis
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

WITH ordered_analyses AS (
  SELECT
    ka.id,
    ROW_NUMBER() OVER (
      PARTITION BY k.user_id
      ORDER BY
        COALESCE(ka.updated_at, ka.created_at) DESC,
        ka.created_at DESC,
        ka.id ASC
    ) AS row_number
  FROM keyword_analysis ka
  INNER JOIN keywords k ON k.id = ka.keyword_id
)
UPDATE keyword_analysis
SET display_order = ordered_analyses.row_number
FROM ordered_analyses
WHERE keyword_analysis.id = ordered_analyses.id
  AND keyword_analysis.display_order IS NULL;

ALTER TABLE keyword_analysis
  ALTER COLUMN display_order SET NOT NULL;

ALTER TABLE keyword_analysis
  ALTER COLUMN display_order SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS keyword_analysis_keyword_display_order_idx
  ON keyword_analysis(keyword_id, display_order, created_at DESC);

