-- Migration: 089_delete_merchant_groups_without_global_merchant.sql
-- Description: Delete merchant groups that don't have a global_merchant_id linked
--              This cleans up old user-created merchant groups that weren't linked to global merchants
-- Date: 2026-02-01

BEGIN;

-- Delete merchant groups that don't have a global_merchant_id
-- This will cascade delete:
--   - merchant_mappings (ON DELETE CASCADE)
--   - merchant_category_rules (ON DELETE CASCADE)
-- Transactions will have merchant_group_id set to NULL (ON DELETE SET NULL)
DELETE FROM merchant_groups
WHERE global_merchant_id IS NULL;

-- Note: Auto-categorization will fall back to pattern-based rules in merchant_category_rules
-- if merchant group rules are deleted. Pattern-based rules are not affected by this migration.

COMMIT;
