-- Migration: 085_migrate_user_groups_to_recommendations.sql
-- Description: Convert existing user merchant groups to recommendations for admin review
-- Date: 2026-01-31
-- Note: This migration should be run manually after reviewing the plan

BEGIN;

-- This migration converts all existing user merchant groups to pending recommendations
-- It should be run after the merchant_recommendations table is created (migration 084)

DO $$
DECLARE
  user_group RECORD;
  pattern_record RECORD;
  rec_id BIGINT;
  pattern_count INTEGER;
  groups_processed INTEGER := 0;
  groups_failed INTEGER := 0;
BEGIN
  -- Loop through all user merchant groups
  FOR user_group IN
    SELECT DISTINCT mg.id, mg.user_id, mg.account_id, mg.display_name
    FROM merchant_groups mg
    WHERE mg.global_merchant_id IS NULL -- Only migrate groups not already linked to global merchants
    ORDER BY mg.id
  LOOP
    BEGIN
      -- Count patterns for this group
      SELECT COUNT(*) INTO pattern_count
      FROM merchant_mappings mm
      WHERE mm.merchant_group_id = user_group.id;

      -- Skip groups with no patterns
      IF pattern_count = 0 THEN
        CONTINUE;
      END IF;

      -- Get the most common pattern (or first pattern) as representative
      SELECT mm.pattern INTO pattern_record
      FROM merchant_mappings mm
      WHERE mm.merchant_group_id = user_group.id
      ORDER BY mm.created_at ASC
      LIMIT 1;

      -- Validate that we got a pattern
      IF pattern_record.pattern IS NULL THEN
        RAISE WARNING 'Skipping merchant group % (id: %) - no pattern found', user_group.display_name, user_group.id;
        groups_failed := groups_failed + 1;
        CONTINUE;
      END IF;

      -- Create recommendation
      INSERT INTO merchant_recommendations (
        user_id,
        account_id,
        pattern,
        suggested_merchant_name,
        status,
        original_merchant_group_id,
        pattern_count,
        transaction_id
      )
      VALUES (
        user_group.user_id,
        user_group.account_id,
        pattern_record.pattern,
        user_group.display_name,
        'pending',
        user_group.id,
        pattern_count,
        NULL -- Could link to first transaction if needed
      )
      RETURNING id INTO rec_id;

      -- Validate that recommendation was created
      IF rec_id IS NULL THEN
        RAISE EXCEPTION 'Failed to create recommendation for merchant group % (id: %)', user_group.display_name, user_group.id;
      END IF;

      -- Store all patterns from the original group
      FOR pattern_record IN
        SELECT DISTINCT mm.pattern
        FROM merchant_mappings mm
        WHERE mm.merchant_group_id = user_group.id
      LOOP
        INSERT INTO merchant_recommendation_patterns (recommendation_id, pattern)
        VALUES (rec_id, pattern_record.pattern)
        ON CONFLICT (recommendation_id, pattern) DO NOTHING;
      END LOOP;

      groups_processed := groups_processed + 1;
      RAISE NOTICE 'Created recommendation % for merchant group % (%)', rec_id, user_group.display_name, pattern_count;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error but continue with other groups
        RAISE WARNING 'Error processing merchant group % (id: %): %', user_group.display_name, user_group.id, SQLERRM;
        groups_failed := groups_failed + 1;
    END;
  END LOOP;

  -- Report summary
  RAISE NOTICE 'Migration complete: Processed % groups, % failed', groups_processed, groups_failed;
  
  -- If all groups failed, raise an exception to fail the migration
  IF groups_processed = 0 AND groups_failed > 0 THEN
    RAISE EXCEPTION 'Migration failed: All % merchant groups failed to migrate', groups_failed;
  END IF;
END $$;

-- After migration, user groups and mappings will be deleted manually via script
-- This allows admins to review recommendations first before cleanup

COMMIT;
