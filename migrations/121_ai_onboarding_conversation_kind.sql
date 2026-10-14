-- Migration: 121_ai_onboarding_conversation_kind.sql
-- Description: Discriminate onboarding agent sessions from chat conversations
-- Date: 2026-08-04

BEGIN;

ALTER TABLE ai_conversations
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'chat';

ALTER TABLE ai_conversations
  DROP CONSTRAINT IF EXISTS ai_conversations_kind_check;

ALTER TABLE ai_conversations
  ADD CONSTRAINT ai_conversations_kind_check
  CHECK (kind IN ('chat', 'onboarding'));

CREATE INDEX IF NOT EXISTS idx_ai_conversations_kind
  ON ai_conversations(account_id, kind, updated_at DESC)
  WHERE is_archived = FALSE;

COMMIT;
