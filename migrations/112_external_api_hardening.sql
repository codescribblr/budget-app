-- Migration: 112_external_api_hardening.sql
-- Description: Idempotency keys for external API writes and usage log retention job
-- Date: 2026-06-02

CREATE TABLE IF NOT EXISTS api_key_idempotency (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INT NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT api_key_idempotency_unique UNIQUE (api_key_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_api_key_idempotency_api_key_id ON api_key_idempotency(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_idempotency_created_at ON api_key_idempotency(created_at DESC);

ALTER TABLE api_key_idempotency ENABLE ROW LEVEL SECURITY;

-- No user-facing policies; accessed via service role only

COMMENT ON TABLE api_key_idempotency IS 'Cached write responses for Idempotency-Key header replay (external API).';

-- Daily cleanup job for 90-day usage log retention and stale idempotency records
INSERT INTO scheduled_jobs (job_type, status, scheduled_for, metadata)
SELECT
  'cleanup_api_key_logs',
  'pending',
  DATE_TRUNC('day', NOW() + INTERVAL '1 day') + INTERVAL '8 hours',
  '{"schedule": "0 8 * * *", "usage_log_retention_days": 90, "idempotency_retention_hours": 24}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM scheduled_jobs WHERE job_type = 'cleanup_api_key_logs' AND status = 'pending'
);
