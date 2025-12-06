-- Migration: 042_add_ai_conversations.sql
-- Description: Add AI conversations table to store chat history
-- Date: 2025-11-28

BEGIN;

-- AI Conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- Auto-generated from first message or user-provided
  messages JSONB NOT NULL DEFAULT '[]', -- Array of ChatMessage objects
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_account ON ai_conversations(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_archived ON ai_conversations(user_id, is_archived, updated_at DESC);

-- RLS Policies
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
DROP POLICY IF EXISTS ai_conversations_user_select ON ai_conversations;
CREATE POLICY ai_conversations_user_select ON ai_conversations
  FOR SELECT
  USING (user_id = auth.uid() AND user_has_account_access(account_id));

-- Users can insert their own conversations
DROP POLICY IF EXISTS ai_conversations_user_insert ON ai_conversations;
CREATE POLICY ai_conversations_user_insert ON ai_conversations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() 
    AND user_has_account_access(account_id)
  );

-- Users can update their own conversations
DROP POLICY IF EXISTS ai_conversations_user_update ON ai_conversations;
CREATE POLICY ai_conversations_user_update ON ai_conversations
  FOR UPDATE
  USING (user_id = auth.uid() AND user_has_account_access(account_id));

-- Users can delete their own conversations
DROP POLICY IF EXISTS ai_conversations_user_delete ON ai_conversations;
CREATE POLICY ai_conversations_user_delete ON ai_conversations
  FOR DELETE
  USING (user_id = auth.uid() AND user_has_account_access(account_id));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_conversation_updated_at();

COMMIT;




