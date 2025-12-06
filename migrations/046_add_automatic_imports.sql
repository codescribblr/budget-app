-- Migration: 046_add_automatic_imports.sql
-- Description: Add automatic transaction import feature with queue-based system
-- Date: 2025-01-XX
--
-- This migration creates tables for automatic import setups and queued imports.
-- Users can configure multiple import sources (email, Plaid, etc.) and review
-- transactions before they are imported.

BEGIN;

-- =====================================================
-- AUTOMATIC IMPORT SETUPS TABLE
-- =====================================================
-- Stores configuration for each automatic import setup per account

CREATE TABLE IF NOT EXISTS automatic_import_setups (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Import source configuration
  source_type TEXT NOT NULL CHECK (source_type IN (
    'email', 
    'plaid', 
    'yodlee', 
    'finicity', 
    'mx', 
    'teller'
  )),
  source_identifier TEXT NOT NULL, -- Email address, Plaid item_id, Finicity customer_id, etc.
  
  -- Account mapping
  target_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL, -- Which account these transactions belong to
  target_credit_card_id BIGINT REFERENCES credit_cards(id) ON DELETE SET NULL,
  
  -- Import settings
  is_historical BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Source-specific configuration (JSONB for flexibility)
  source_config JSONB DEFAULT '{}',
  -- Example for email: {"email_address": "user123@imports.budgetapp.com", "forwarding_enabled": true}
  -- Example for Plaid: {"item_id": "item_123", "access_token": "encrypted_token", "institution_id": "ins_123", "institution_name": "Chase"}
  -- Example for Finicity: {"customer_id": "cust_123", "account_id": "acc_456", "institution_id": "ins_789"}
  -- Example for MX: {"user_guid": "usr_123", "member_guid": "mbr_456", "institution_code": "chase"}
  -- Stores provider-specific connection details (encrypted where sensitive)
  
  -- Integration metadata
  integration_name TEXT, -- User-friendly name: "Chase Checking via Plaid"
  bank_name TEXT, -- Name of the connected bank/institution
  account_numbers TEXT[], -- Last 4 digits of connected accounts (for display)
  
  -- Cost tracking
  estimated_monthly_cost DECIMAL(10,2), -- Estimated cost based on transaction volume
  last_month_transaction_count INTEGER DEFAULT 0,
  
  -- Status tracking
  last_fetch_at TIMESTAMPTZ,
  last_successful_fetch_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Allow multiple integrations of same type for different banks/accounts
  -- But prevent exact duplicates
  UNIQUE(account_id, source_type, source_identifier, target_account_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automatic_import_setups_account_id ON automatic_import_setups(account_id);
CREATE INDEX IF NOT EXISTS idx_automatic_import_setups_user_id ON automatic_import_setups(user_id);
CREATE INDEX IF NOT EXISTS idx_automatic_import_setups_active ON automatic_import_setups(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_automatic_import_setups_source_type ON automatic_import_setups(source_type);

-- =====================================================
-- QUEUED IMPORTS TABLE
-- =====================================================
-- Stores transactions that have been fetched but not yet imported

CREATE TABLE IF NOT EXISTS queued_imports (
  id BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  import_setup_id BIGINT NOT NULL REFERENCES automatic_import_setups(id) ON DELETE CASCADE,
  
  -- Transaction data (matches ParsedTransaction structure)
  transaction_date TEXT NOT NULL,
  description TEXT NOT NULL,
  merchant TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  
  -- Parsed data
  hash TEXT NOT NULL, -- For deduplication
  original_data JSONB, -- Original transaction data from source
  
  -- Categorization (pre-filled if available)
  suggested_category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
  suggested_merchant TEXT,
  
  -- Account mapping
  target_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
  target_credit_card_id BIGINT REFERENCES credit_cards(id) ON DELETE SET NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'imported')),
  is_historical BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Review metadata
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Import metadata
  imported_transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  imported_at TIMESTAMPTZ,
  
  -- Source metadata
  source_batch_id TEXT, -- Groups transactions from same fetch
  source_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate queuing within same batch
  UNIQUE(account_id, hash, source_batch_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_queued_imports_account_id ON queued_imports(account_id);
CREATE INDEX IF NOT EXISTS idx_queued_imports_setup_id ON queued_imports(import_setup_id);
CREATE INDEX IF NOT EXISTS idx_queued_imports_status ON queued_imports(status) WHERE status IN ('pending', 'reviewing');
CREATE INDEX IF NOT EXISTS idx_queued_imports_hash ON queued_imports(account_id, hash);
CREATE INDEX IF NOT EXISTS idx_queued_imports_batch_id ON queued_imports(source_batch_id);
CREATE INDEX IF NOT EXISTS idx_queued_imports_created_at ON queued_imports(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE automatic_import_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE queued_imports ENABLE ROW LEVEL SECURITY;

-- Automatic Import Setups Policies
CREATE POLICY "Users can view setups for their accounts"
  ON automatic_import_setups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = automatic_import_setups.account_id
      AND (
        ba.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM account_users au
          WHERE au.account_id = ba.id
          AND au.user_id = auth.uid()
          AND au.status = 'active'
        )
      )
    )
  );

CREATE POLICY "Editors can create setups for their accounts"
  ON automatic_import_setups FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      JOIN account_users au ON au.account_id = ba.id
      WHERE ba.id = automatic_import_setups.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      AND au.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can update setups for their accounts"
  ON automatic_import_setups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      JOIN account_users au ON au.account_id = ba.id
      WHERE ba.id = automatic_import_setups.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      AND au.role IN ('owner', 'editor')
    )
  );

CREATE POLICY "Editors can delete setups for their accounts"
  ON automatic_import_setups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      JOIN account_users au ON au.account_id = ba.id
      WHERE ba.id = automatic_import_setups.account_id
      AND au.user_id = auth.uid()
      AND au.status = 'active'
      AND au.role IN ('owner', 'editor')
    )
  );

-- Queued Imports Policies
CREATE POLICY "Users can view queued imports for their accounts"
  ON queued_imports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM budget_accounts ba
      WHERE ba.id = queued_imports.account_id
      AND (
        ba.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM account_users au
          WHERE au.account_id = ba.id
          AND au.user_id = auth.uid()
          AND au.status = 'active'
        )
      )
    )
  );

CREATE POLICY "System can create queued imports"
  ON queued_imports FOR INSERT
  WITH CHECK (TRUE); -- Handled by service role in API routes

CREATE POLICY "Editors can update queued imports"
  ON queued_imports FOR UPDATE
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

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp for automatic_import_setups
CREATE OR REPLACE FUNCTION update_automatic_import_setups_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_automatic_import_setups_updated_at
  BEFORE UPDATE ON automatic_import_setups
  FOR EACH ROW
  EXECUTE FUNCTION update_automatic_import_setups_updated_at();

-- Update updated_at timestamp for queued_imports
CREATE OR REPLACE FUNCTION update_queued_imports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_queued_imports_updated_at
  BEFORE UPDATE ON queued_imports
  FOR EACH ROW
  EXECUTE FUNCTION update_queued_imports_updated_at();

COMMIT;
