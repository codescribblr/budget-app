-- Migration: 012_add_goals_feature.sql
-- Description: Add goals feature with envelope and account-linked support
-- Date: 2025-01-21

-- Add is_goal column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_goal BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_categories_is_goal ON categories(user_id, is_goal);

-- Add linked_goal_id to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS linked_goal_id BIGINT REFERENCES goals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_linked_goal ON accounts(linked_goal_id);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL,
  target_date DATE, -- NULL if no target date
  goal_type TEXT NOT NULL CHECK(goal_type IN ('envelope', 'account-linked')),
  monthly_contribution DECIMAL(10,2) NOT NULL DEFAULT 0, -- Required for envelope goals
  linked_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL, -- Only for account-linked
  linked_category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL, -- Only for envelope goals
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'overdue', 'paused')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT envelope_has_category CHECK (
    (goal_type = 'envelope' AND linked_category_id IS NOT NULL) OR
    (goal_type = 'account-linked' AND linked_category_id IS NULL)
  ),
  CONSTRAINT account_linked_has_account CHECK (
    (goal_type = 'account-linked' AND linked_account_id IS NOT NULL) OR
    (goal_type = 'envelope' AND linked_account_id IS NULL)
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_linked_account ON goals(linked_account_id);
CREATE INDEX IF NOT EXISTS idx_goals_linked_category ON goals(linked_category_id);

-- RLS Policies
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- Add foreign key constraint for linked_category_id (must be done after goals table exists)
-- Note: This is a self-referencing constraint that will be handled by application logic

