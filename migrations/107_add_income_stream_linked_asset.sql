-- Migration: 107_add_income_stream_linked_asset.sql
-- Description: Link income streams to non-cash assets for retirement planning
-- When an asset is liquidated, income from linked streams stops in the forecast
-- Date: 2026-02-24

ALTER TABLE income_streams
  ADD COLUMN IF NOT EXISTS linked_non_cash_asset_id BIGINT NULL REFERENCES non_cash_assets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_income_streams_linked_asset ON income_streams(linked_non_cash_asset_id);

COMMENT ON COLUMN income_streams.linked_non_cash_asset_id IS 'Optional 1:1 link to non-cash asset. When asset is liquidated in retirement forecast, this income stream stops.';
