-- Migration: 111_add_api_keys.sql
-- Description: API keys for external integrations with scoped permissions
-- Date: 2026-06-02

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ NULL,
  last_used_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT api_keys_permissions_is_array CHECK (jsonb_typeof(permissions) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_api_keys_budget_account_id ON api_keys(budget_account_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);

CREATE TABLE IF NOT EXISTS api_key_usage_log (
  id BIGSERIAL PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  scope_used TEXT NULL,
  status_code INT NOT NULL,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_log_api_key_id ON api_key_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_log_created_at ON api_key_usage_log(created_at DESC);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage_log ENABLE ROW LEVEL SECURITY;

-- Account owners can manage API keys for their budget accounts
CREATE POLICY "Account owners can view api keys"
  ON api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = api_keys.budget_account_id
      AND ba.owner_id = auth.uid()
      AND ba.deleted_at IS NULL
    )
  );

CREATE POLICY "Account owners can create api keys"
  ON api_keys FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = api_keys.budget_account_id
      AND ba.owner_id = auth.uid()
      AND ba.deleted_at IS NULL
    )
  );

CREATE POLICY "Account owners can update api keys"
  ON api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = api_keys.budget_account_id
      AND ba.owner_id = auth.uid()
      AND ba.deleted_at IS NULL
    )
  );

CREATE POLICY "Account owners can delete api keys"
  ON api_keys FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = api_keys.budget_account_id
      AND ba.owner_id = auth.uid()
      AND ba.deleted_at IS NULL
    )
  );

-- Usage logs visible to account owners
CREATE POLICY "Account owners can view api key usage logs"
  ON api_key_usage_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM api_keys ak
      JOIN budget_accounts ba ON ba.id = ak.budget_account_id
      WHERE ak.id = api_key_usage_log.api_key_id
      AND ba.owner_id = auth.uid()
      AND ba.deleted_at IS NULL
    )
  );

COMMENT ON TABLE api_keys IS 'Scoped API keys for external integrations. Keys are hashed; plaintext shown once at creation.';
COMMENT ON TABLE api_key_usage_log IS 'Audit log of external API requests authenticated via API keys.';
