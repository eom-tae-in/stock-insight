-- Add user-controlled ordering for saved keywords.
-- Existing rows are backfilled with newest-first order to preserve current UI.

ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS display_order INTEGER;

WITH ordered_keywords AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY created_at DESC, id ASC
    ) AS row_number
  FROM keywords
)
UPDATE keywords
SET display_order = ordered_keywords.row_number
FROM ordered_keywords
WHERE keywords.id = ordered_keywords.id
  AND keywords.display_order IS NULL;

ALTER TABLE keywords
  ALTER COLUMN display_order SET NOT NULL;

ALTER TABLE keywords
  ALTER COLUMN display_order SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS keywords_user_display_order_idx
  ON keywords(user_id, display_order, created_at DESC);
