-- Migration: 103_add_help_article_feedback.sql
-- Description: Store "Was this helpful?" feedback from help articles for admin review
-- Date: 2025-02-12

BEGIN;

CREATE TABLE IF NOT EXISTS help_article_feedback (
  id BIGSERIAL PRIMARY KEY,
  article_path TEXT NOT NULL,
  was_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_help_article_feedback_article_path ON help_article_feedback(article_path);
CREATE INDEX IF NOT EXISTS idx_help_article_feedback_was_helpful ON help_article_feedback(article_path, was_helpful);
CREATE INDEX IF NOT EXISTS idx_help_article_feedback_created_at ON help_article_feedback(created_at DESC);

COMMENT ON TABLE help_article_feedback IS 'User feedback on help center articles (Was this helpful? Yes/No and optional comment)';

-- RLS: anyone authenticated can insert their own feedback; only admins can read
ALTER TABLE help_article_feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users may submit feedback (user_id stored for their submission)
CREATE POLICY "Authenticated users can insert help feedback" ON help_article_feedback
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all help feedback" ON help_article_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_admin = TRUE
    )
  );

COMMIT;
