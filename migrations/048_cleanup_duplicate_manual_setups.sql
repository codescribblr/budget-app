BEGIN;

-- Clean up duplicate manual import setups
-- Keep only one manual setup per account (the oldest one)
-- Delete the rest if they have no active queued imports

WITH manual_setups AS (
  SELECT 
    id,
    account_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY created_at ASC) as rn
  FROM automatic_import_setups
  WHERE source_type = 'manual'
),
active_queued_imports AS (
  SELECT DISTINCT import_setup_id
  FROM queued_imports
  WHERE status IN ('pending', 'reviewing')
),
setups_to_delete AS (
  SELECT ms.id
  FROM manual_setups ms
  LEFT JOIN active_queued_imports aqi ON ms.id = aqi.import_setup_id
  WHERE ms.rn > 1  -- Keep the oldest one (rn = 1)
    AND aqi.import_setup_id IS NULL  -- Only delete if no active queued imports
)
DELETE FROM automatic_import_setups
WHERE id IN (SELECT id FROM setups_to_delete);

COMMIT;

