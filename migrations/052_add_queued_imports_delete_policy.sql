-- Add DELETE policy for queued_imports
-- Allows editors to delete queued imports for their accounts
-- This is needed for remap operations and batch deletion

CREATE POLICY "Editors can delete queued imports"
  ON queued_imports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      JOIN account_users au ON au.account_id = ba.id
      WHERE ba.id = queued_imports.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      AND au.role IN ('owner', 'editor')
    )
  );
