-- Migration: 086_add_merchant_recommendations_delete_policy.sql
-- Description: Add RLS DELETE policy for admins to delete merchant recommendations
-- Date: 2026-02-01

BEGIN;

-- Add DELETE policy for admins on merchant_recommendations
CREATE POLICY "Admins can delete recommendations"
  ON merchant_recommendations FOR DELETE
  USING (is_current_user_admin());

COMMIT;
