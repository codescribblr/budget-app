# Automatic Transaction Import Feature - Implementation Plan

## Overview

This document outlines the implementation plan for automatic transaction imports. Unlike traditional budgeting apps that automatically import transactions directly, this feature will queue transactions for review and approval before they are applied to envelopes/budgets, maintaining the same preview-and-edit workflow as manual imports.

## Core Requirements

1. **Queue-Based Import System**: Transactions are fetched automatically but queued for review before import
2. **Per-Account Configuration**: Each account can have its own automatic import setup
3. **Historical Flag**: Each import setup can specify whether transactions should be marked as historical
4. **Preview & Edit Workflow**: Queued transactions use the same preview/edit interface as manual imports
5. **Cost-Effective**: Prioritize low-cost, reliable solutions
6. **Multiple Data Sources**: Support various methods for fetching transactions (API integrations, automated file collection, etc.)

## Architecture Options Analysis

This section analyzes multiple integration options that users can enable/disable based on their bank's compatibility and cost preferences. Users can have multiple integrations active simultaneously, providing redundancy and flexibility.

### Option 1: Plaid Integration

**How it works:**
- Users connect their bank accounts via Plaid Link
- Plaid fetches transactions via bank APIs
- Webhooks notify us of new transactions
- Transactions are queued for review

**Pros:**
- ✅ Most reliable and comprehensive coverage
- ✅ Real-time transaction updates via webhooks
- ✅ Supports 12,000+ financial institutions (strongest US coverage)
- ✅ Handles OAuth flows automatically
- ✅ Standardized transaction format
- ✅ Built-in security and compliance
- ✅ Excellent developer experience and documentation

**Cons:**
- ❌ Higher cost: $0.30 per transaction (after free tier)
- ❌ Requires PCI compliance considerations
- ❌ More complex setup (OAuth, webhooks, token management)

**Cost Estimate:**
- Free tier: 100 items/month (transactions + accounts)
- After free tier: $0.30 per transaction
- For 100 transactions/month: ~$30/month per user
- For 500 transactions/month: ~$150/month per user

**Reliability:** ⭐⭐⭐⭐⭐ (Excellent)  
**Bank Coverage:** 12,000+ institutions (strongest US coverage)  
**Regions:** US (primary focus)  
**Best For:** US users who want the most reliable option and don't mind higher costs

---

### Option 2: Yodlee Integration

**How it works:**
- Similar to Plaid but different provider
- Users connect accounts via Yodlee FastLink
- API fetches transactions periodically or via webhooks

**Pros:**
- ✅ Good US bank coverage (11,000+ institutions)
- ✅ Slightly lower cost than Plaid in some cases
- ✅ Aggregation-focused platform
- ✅ Good alternative for banks not on Plaid

**Cons:**
- ❌ Still relatively expensive
- ❌ Less developer-friendly than Plaid
- ❌ More complex integration
- ❌ Slower API response times

**Cost Estimate:**
- Varies by plan, typically $0.25-$0.35 per transaction
- Similar cost structure to Plaid

**Reliability:** ⭐⭐⭐⭐ (Very Good)  
**Bank Coverage:** 11,000+ institutions (strong US coverage)  
**Regions:** US (primary focus)  
**Best For:** US users whose banks aren't supported by Plaid or prefer Yodlee's pricing

---

### Option 3: Finicity Integration

**How it works:**
- Mastercard-owned aggregation platform
- Users connect via Finicity Connect
- API fetches transactions with webhook support

**Pros:**
- ✅ Good US bank coverage (10,000+ institutions)
- ✅ Competitive pricing
- ✅ Strong data quality
- ✅ Good for credit unions

**Cons:**
- ❌ Primarily US-focused
- ❌ Less comprehensive than Plaid
- ❌ Smaller developer community

**Cost Estimate:**
- Typically $0.20-$0.30 per transaction
- Volume discounts available

**Reliability:** ⭐⭐⭐⭐ (Very Good)  
**Bank Coverage:** 10,000+ institutions (US-focused)  
**Regions:** US  
**Best For:** US users looking for Plaid alternative with better pricing

---

### Option 4: MX Integration

**How it works:**
- Financial data platform with strong categorization
- Users connect via MX Connect
- API fetches transactions with real-time updates

**Pros:**
- ✅ Excellent transaction categorization
- ✅ Good US bank coverage (16,000+ institutions)
- ✅ Strong data enrichment features
- ✅ Competitive pricing

**Cons:**
- ❌ US-only (not a con for US-focused product)
- ❌ Smaller than Plaid ecosystem

**Cost Estimate:**
- Typically $0.15-$0.25 per transaction
- Volume discounts available

**Reliability:** ⭐⭐⭐⭐ (Very Good)  
**Bank Coverage:** 16,000+ institutions (primarily US)  
**Regions:** US  
**Best For:** US users who want better categorization and competitive pricing

---

### Option 5: Teller Integration

**How it works:**
- Developer-friendly banking API
- Uses open banking standards
- Direct API access to banks

**Pros:**
- ✅ Very developer-friendly
- ✅ Transparent pricing
- ✅ Good for specific banks
- ✅ Modern API design

**Cons:**
- ❌ Limited bank coverage (growing)
- ❌ Newer platform (less mature)
- ❌ US-only

**Cost Estimate:**
- Typically $0.10-$0.20 per transaction
- More affordable than Plaid

**Reliability:** ⭐⭐⭐ (Good, growing)  
**Bank Coverage:** Growing (100+ institutions)  
**Regions:** US  
**Best For:** Users with supported banks who want lower costs

---

### Option 6: Automated Email/PDF Collection

**How it works:**
- Users forward bank statement emails to a unique email address
- System parses PDF/CSV attachments from emails
- Extracts transactions using existing PDF/CSV parsers
- Queues transactions for review

**Pros:**
- ✅ Very low cost (email processing only)
- ✅ Works with any bank that sends statements
- ✅ Leverages existing PDF/CSV parsing infrastructure
- ✅ No third-party API dependencies
- ✅ User maintains control

**Cons:**
- ❌ Requires manual email forwarding (semi-automatic)
- ❌ Parsing reliability depends on statement format
- ❌ Not real-time (depends on statement frequency)
- ❌ May require per-bank parsing rules

**Cost Estimate:**
- Email processing: ~$0.001 per email (using services like SendGrid, AWS SES)
- PDF parsing: Free (using existing libraries)
- **Total: ~$0.10-0.50/month per user** (very low cost)

**Reliability:** ⭐⭐⭐ (Good, depends on parsing accuracy)  
**Bank Coverage:** Any US bank that sends statements  
**Regions:** US  
**Best For:** Cost-conscious US users who don't mind manual forwarding

---

## Integration Comparison Matrix

| Integration | Cost/Transaction | Bank Coverage | Reliability | Best Use Case |
|------------|------------------|---------------|-------------|---------------|
| **Plaid** | $0.30 | 12,000+ (US) | ⭐⭐⭐⭐⭐ | Premium users, maximum reliability |
| **Yodlee** | $0.25-0.35 | 11,000+ (US) | ⭐⭐⭐⭐ | Plaid alternative, broader bank coverage |
| **Finicity** | $0.20-0.30 | 10,000+ (US) | ⭐⭐⭐⭐ | Cost savings, credit unions |
| **MX** | $0.15-0.25 | 16,000+ (US) | ⭐⭐⭐⭐ | Better categorization, competitive pricing |
| **Teller** | $0.10-0.20 | 100+ (US) | ⭐⭐⭐ | Supported banks, lowest cost API |
| **Email/PDF** | $0.001 | Any US bank | ⭐⭐⭐ | Cost-conscious, universal compatibility |

---

## Multi-Integration Strategy (Recommended)

### User-Controlled Integration Selection

Users can enable/disable multiple integrations simultaneously, allowing them to:
1. **Choose based on bank compatibility** - Enable integrations that support their specific US banks
2. **Optimize for cost** - Use lower-cost options when available
3. **Create redundancy** - Enable multiple integrations for the same account as backup
4. **Maximize coverage** - Use different integrations for different banks/accounts

### Recommended Approach: Tiered Integration Support

**Phase 1: Email/PDF Collection (Free for All)**
- Low-cost option available to everyone
- Validates the queue workflow
- Works with any bank

**Phase 2: Add Multiple API Integrations (Premium)**
- Offer 3-5 most popular integrations initially (Plaid, Finicity, MX)
- Users can enable/disable each integration
- Show bank compatibility before connecting
- Allow multiple integrations per account for redundancy

**Phase 3: Expand Integration Options**
- Add more integrations based on user demand
- Additional US-focused providers as they emerge
- Monitor usage and costs per integration

**Benefits:**
- ✅ Users choose what works for their banks
- ✅ Cost optimization per user
- ✅ Redundancy and reliability
- ✅ Competitive differentiation
- ✅ Flexible pricing strategy

**Phase 1: Email/PDF Collection (MVP)**
- Start with automated email forwarding
- Leverage existing PDF/CSV parsing
- Low cost, quick to implement
- Validates the queue workflow

**Phase 2: Add Plaid Integration (Premium Feature)**
- Offer Plaid as a premium option
- Users can choose between email forwarding (free) or Plaid (premium)
- Charge premium users for Plaid costs + margin

**Benefits:**
- ✅ Low-cost option for all users
- ✅ Premium option for users who want convenience
- ✅ Validates demand before investing in expensive integrations
- ✅ Flexible architecture supports multiple sources

---

## Recommended Approach: Multi-Integration Strategy

### Phase 1: Email/PDF Collection (Free for All)
**Timeline:** 4-6 weeks  
**Cost:** Very low (~$0.10-0.50/user/month)  
**Availability:** All users

### Phase 2: Core API Integrations (Premium)
**Timeline:** 8-12 weeks (after Phase 1)  
**Cost:** Pass-through to premium users  
**Integrations:** Plaid, Finicity, MX (initial set)  
**Availability:** Premium users can enable/disable each integration

### Phase 3: Expanded Integration Options
**Timeline:** 4-6 weeks (after Phase 2)  
**Integrations:** Teller, Yodlee, and other US-focused providers based on demand  
**Availability:** Premium users based on demand

---

## Database Schema Changes

### New Table: `automatic_import_setups`

Stores configuration for each automatic import setup per account.

```sql
CREATE TABLE automatic_import_setups (
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
CREATE INDEX idx_automatic_import_setups_account_id ON automatic_import_setups(account_id);
CREATE INDEX idx_automatic_import_setups_user_id ON automatic_import_setups(user_id);
CREATE INDEX idx_automatic_import_setups_active ON automatic_import_setups(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_automatic_import_setups_source_type ON automatic_import_setups(source_type);

-- RLS Policies
ALTER TABLE automatic_import_setups ENABLE ROW LEVEL SECURITY;

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
```

### New Table: `queued_imports`

Stores transactions that have been fetched but not yet imported.

```sql
CREATE TABLE queued_imports (
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
  
  UNIQUE(account_id, hash, source_batch_id) -- Prevent duplicate queuing
);

-- Indexes
CREATE INDEX idx_queued_imports_account_id ON queued_imports(account_id);
CREATE INDEX idx_queued_imports_setup_id ON queued_imports(import_setup_id);
CREATE INDEX idx_queued_imports_status ON queued_imports(status) WHERE status IN ('pending', 'reviewing');
CREATE INDEX idx_queued_imports_hash ON queued_imports(account_id, hash);
CREATE INDEX idx_queued_imports_batch_id ON queued_imports(source_batch_id);
CREATE INDEX idx_queued_imports_created_at ON queued_imports(created_at DESC);

-- RLS Policies
ALTER TABLE queued_imports ENABLE ROW LEVEL SECURITY;

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
```

### Migration File

Create: `migrations/046_add_automatic_imports.sql`

---

## Backup and Restore Updates

The automatic import feature introduces two new tables that must be included in the backup/restore system to ensure users can fully restore their automatic import configurations and queued transactions.

### New Tables to Include in Backups

1. **`automatic_import_setups`** - Import configuration and settings
2. **`queued_imports`** - Transactions awaiting review/approval

### Required Updates

#### 1. Update Backup Data Interfaces

**File:** `src/lib/backup-utils.ts`

Add new fields to `AccountBackupData` and `UserBackupData` interfaces:

```typescript
export interface AccountBackupData {
  // ... existing fields ...
  automatic_import_setups?: any[];
  queued_imports?: any[];
}
```

#### 2. Update Export Function

**File:** `src/lib/backup-utils.ts` - `exportAccountData()`

Add queries to fetch automatic import data:

```typescript
const [
  // ... existing queries ...
  { data: automatic_import_setups },
  { data: queued_imports },
] = await Promise.all([
  // ... existing promises ...
  supabase.from('automatic_import_setups').select('*').eq('account_id', accountId),
  supabase.from('queued_imports').select('*').eq('account_id', accountId),
]);

return {
  // ... existing fields ...
  automatic_import_setups: automatic_import_setups || [],
  queued_imports: queued_imports || [],
};
```

**Important Considerations:**
- **Sensitive Data Handling**: `source_config` JSONB field may contain encrypted tokens (e.g., Plaid access tokens). Ensure these are properly encrypted/decrypted during backup/restore.
- **Foreign Key Remapping**: `queued_imports` references `automatic_import_setups.id`, `categories.id`, `accounts.id`, `credit_cards.id`, and `transactions.id`. All foreign keys must be remapped during restore.
- **Account ID Remapping**: Both tables use `account_id` which must be remapped to the current active account during restore.

#### 3. Update Import Function

**File:** `src/lib/backup-utils.ts` - `importUserDataFromFile()`

Add import logic for new tables in correct dependency order:

**Insert Order (after dependencies are created):**
1. Insert `automatic_import_setups` (depends on `budget_accounts`, `accounts`, `credit_cards`)
2. Insert `queued_imports` (depends on `automatic_import_setups`, `categories`, `accounts`, `credit_cards`)

**Implementation:**

```typescript
// Insert automatic_import_setups (after accounts, credit_cards are inserted)
if (backupData.automatic_import_setups && backupData.automatic_import_setups.length > 0) {
  const setupsToInsert = backupData.automatic_import_setups.map(({ 
    id, 
    account_id, 
    user_id, 
    target_account_id, 
    target_credit_card_id,
    created_by,
    ...setup 
  }) => ({
    ...setup,
    user_id: user.id,
    account_id: accountId,
    target_account_id: target_account_id ? (accountIdMap.get(target_account_id) || null) : null,
    target_credit_card_id: target_credit_card_id ? (creditCardIdMap.get(target_credit_card_id) || null) : null,
    created_by: created_by || user.id,
  }));

  const { data, error } = await supabase
    .from('automatic_import_setups')
    .insert(setupsToInsert)
    .select('id');

  if (error) {
    console.error('[Import] Error inserting automatic_import_setups:', error);
    throw error;
  }

  // Create ID mapping for queued_imports foreign key
  const importSetupIdMap = new Map();
  backupData.automatic_import_setups.forEach((oldSetup, index) => {
    importSetupIdMap.set(oldSetup.id, data[index].id);
  });
  console.log('[Import] Inserted', data.length, 'automatic import setups');
}

// Insert queued_imports (after automatic_import_setups, categories, accounts, credit_cards are inserted)
if (backupData.queued_imports && backupData.queued_imports.length > 0) {
  const queuedImportsToInsert = backupData.queued_imports.map(({ 
    id, 
    account_id, 
    import_setup_id,
    suggested_category_id,
    target_account_id,
    target_credit_card_id,
    imported_transaction_id,
    reviewed_by,
    ...queuedImport 
  }) => ({
    ...queuedImport,
    account_id: accountId,
    import_setup_id: import_setup_id ? (importSetupIdMap.get(import_setup_id) || null) : null,
    suggested_category_id: suggested_category_id ? (categoryIdMap.get(suggested_category_id) || null) : null,
    target_account_id: target_account_id ? (accountIdMap.get(target_account_id) || null) : null,
    target_credit_card_id: target_credit_card_id ? (creditCardIdMap.get(target_credit_card_id) || null) : null,
    imported_transaction_id: imported_transaction_id ? (transactionIdMap.get(imported_transaction_id) || null) : null,
    reviewed_by: reviewed_by || null, // Keep reviewed_by if restoring to same user, otherwise null
  }));

  const { error } = await supabase
    .from('queued_imports')
    .insert(queuedImportsToInsert);

  if (error) {
    console.error('[Import] Error inserting queued_imports:', error);
    throw error;
  }
  console.log('[Import] Inserted', queuedImportsToInsert.length, 'queued imports');
}
```

**Delete Order (before dependencies are deleted):**
1. Delete `queued_imports` (before `automatic_import_setups`)
2. Delete `automatic_import_setups` (before `budget_accounts`, `accounts`, `credit_cards`)

#### 4. Update Backup Documentation

**File:** `USER_BACKUP_COMPLETE_GUIDE.md`

Add to "What's Included in User Backups" section:

```markdown
16. **`automatic_import_setups`** - Automatic import configurations (email forwarding, Plaid connections, etc.)
17. **`queued_imports`** - Transactions queued for review before import
```

Update backup format example to include new tables.

#### 5. Security Considerations

**Sensitive Data in Backups:**
- **Encrypted Tokens**: `source_config` may contain encrypted API tokens (Plaid access tokens, etc.)
- **Email Addresses**: Email import setups contain unique email addresses
- **Bank Information**: Integration setups may contain bank names and account identifiers

**Recommendations:**
- Ensure `source_config` encryption/decryption works correctly during backup/restore
- Consider excluding sensitive tokens from backups (user must reconnect integrations after restore)
- Or ensure tokens are properly encrypted in backups
- Document that users may need to reconnect integrations after restore

#### 6. Testing Checklist

- [ ] Backup includes `automatic_import_setups` data
- [ ] Backup includes `queued_imports` data
- [ ] Restore correctly remaps `automatic_import_setups.account_id`
- [ ] Restore correctly remaps `automatic_import_setups.target_account_id`
- [ ] Restore correctly remaps `automatic_import_setups.target_credit_card_id`
- [ ] Restore correctly remaps `queued_imports.import_setup_id`
- [ ] Restore correctly remaps `queued_imports.suggested_category_id`
- [ ] Restore correctly remaps `queued_imports.target_account_id`
- [ ] Restore correctly remaps `queued_imports.target_credit_card_id`
- [ ] Restore correctly remaps `queued_imports.imported_transaction_id`
- [ ] Encrypted tokens in `source_config` are preserved/restored correctly
- [ ] Email addresses in `source_config` are preserved correctly
- [ ] Backup size increase is reasonable (new tables shouldn't add significant size)
- [ ] Restore performance is acceptable with new tables
- [ ] Backward compatibility: old backups without new tables restore successfully
- [ ] Forward compatibility: new backups restore on older code versions gracefully

#### 7. Migration Strategy

**Version Handling:**
- Update backup version to `2.1` when adding automatic import support
- Handle backward compatibility: old backups (v2.0) should restore without errors
- New backups (v2.1) should include automatic import data

**Implementation:**
```typescript
// In exportAccountData()
return {
  version: '2.1', // Increment version
  // ... rest of data including automatic_import_setups and queued_imports
};

// In importUserDataFromFile()
// Check version and handle accordingly
if (backupData.version >= '2.1') {
  // Import automatic_import_setups and queued_imports
} else {
  // Skip new tables for older backups
}
```

#### 8. User-Facing Considerations

**What Users Should Know:**
- Automatic import setups are included in backups
- Queued transactions (pending review) are included in backups
- After restore, users may need to reconnect API integrations (Plaid, etc.) if tokens expired
- Email import setups should continue working after restore
- Queued imports will be restored with their current status (pending, reviewing, etc.)

**UI Updates:**
- Update backup creation confirmation to mention automatic imports
- Update restore confirmation to mention automatic imports
- Show count of automatic import setups in backup summary
- Show count of queued imports in backup summary

---

## Implementation Phases

### Phase 1: Foundation & Email Import (MVP)

#### 1.1 Database Schema
- [ ] Create migration for `automatic_import_setups` table
- [ ] Create migration for `queued_imports` table
- [ ] Add RLS policies
- [ ] Test migrations

#### 1.1.1 Backup/Restore Updates
- [ ] Update `AccountBackupData` and `UserBackupData` interfaces
- [ ] Update `exportAccountData()` to include `automatic_import_setups` and `queued_imports`
- [ ] Update `importUserDataFromFile()` to restore new tables with proper ID remapping
- [ ] Update backup version to 2.1
- [ ] Add backward compatibility handling for v2.0 backups
- [ ] Update `USER_BACKUP_COMPLETE_GUIDE.md` documentation
- [ ] Test backup/restore with automatic import data
- [ ] Test backward compatibility (v2.0 backups restore correctly)

#### 1.2 Email Infrastructure
- [ ] Set up email receiving service (SendGrid Inbound Parse, AWS SES, or Postmark)
- [ ] Create unique email addresses per import setup
- [ ] Implement email webhook handler: `POST /api/webhooks/email-import`
- [ ] Extract PDF/CSV attachments from emails
- [ ] Store attachments temporarily (S3 or Supabase Storage)

#### 1.3 Import Processing
- [ ] Create service: `src/lib/automatic-imports/email-processor.ts`
  - Parse email attachments
  - Extract transactions using existing CSV/PDF parsers
  - Create queued imports
- [ ] Create service: `src/lib/automatic-imports/queue-manager.ts`
  - Queue transactions
  - Handle deduplication
  - Batch processing

#### 1.4 UI: Import Setup Management
- [ ] Create page: `src/app/(dashboard)/settings/automatic-imports/page.tsx`
  - List all import setups
  - Create new setup (email forwarding)
  - Edit/delete setups
  - Show status (last fetch, error count, etc.)
- [ ] Component: `src/components/automatic-imports/ImportSetupCard.tsx`
- [ ] Component: `src/components/automatic-imports/CreateEmailImportDialog.tsx`
  - Generate unique email address
  - Show instructions for forwarding emails
  - Configure target account and historical flag

#### 1.5 UI: Queue Review
- [ ] Create page: `src/app/(dashboard)/imports/queue/page.tsx`
  - List queued imports grouped by batch
  - Filter by status, setup, date range
  - Show batch summary (count, date range, source)
- [ ] Extend: `src/components/import/TransactionPreview.tsx`
  - Support loading from `queued_imports` table
  - Mark transactions as reviewed/approved
  - Batch approval workflow
- [ ] Component: `src/components/automatic-imports/QueueBatchCard.tsx`
  - Show batch info
  - Quick actions (approve all, reject all, review)

#### 1.6 API Routes
- [ ] `POST /api/automatic-imports/setups` - Create import setup
- [ ] `GET /api/automatic-imports/setups` - List setups for account
- [ ] `PUT /api/automatic-imports/setups/[id]` - Update setup
- [ ] `DELETE /api/automatic-imports/setups/[id]` - Delete setup
- [ ] `GET /api/automatic-imports/queue` - Get queued imports
- [ ] `POST /api/automatic-imports/queue/[id]/approve` - Approve and import
- [ ] `POST /api/automatic-imports/queue/[id]/reject` - Reject queued import
- [ ] `POST /api/webhooks/email-import` - Handle incoming emails

#### 1.7 Background Jobs
- [ ] Create scheduled job: `src/lib/automatic-imports/process-email-queue.ts`
  - Process email attachments
  - Create queued imports
  - Handle errors and retries
- [ ] Add to `vercel.json` cron jobs or Supabase Edge Functions

#### 1.8 Testing
- [ ] Unit tests for email processor
- [ ] Unit tests for queue manager
- [ ] Integration tests for email webhook
- [ ] E2E tests for setup creation and queue review
- [ ] Backup/restore tests with automatic import data
- [ ] Test ID remapping for all foreign keys in queued_imports
- [ ] Test sensitive data (encrypted tokens) in backups

**Timeline:** 4-6 weeks

---

### Phase 2: Core API Integrations (Premium Feature)

#### 2.1 Integration Infrastructure
- [ ] Create abstraction layer: `src/lib/automatic-imports/integration-adapter.ts`
  - Common interface for all integrations
  - Provider-specific implementations
  - Unified error handling
- [ ] Create integration registry: `src/lib/automatic-imports/integration-registry.ts`
  - Manage available integrations
  - Bank compatibility lookup
  - Cost estimation per integration
- [ ] Create service: `src/lib/automatic-imports/integration-manager.ts`
  - Enable/disable integrations
  - Handle multiple active integrations
  - Deduplication across integrations
  - Cost tracking

#### 2.2 Plaid Integration
- [ ] Create Plaid account and get API keys
- [ ] Install Plaid SDK: `npm install plaid`
- [ ] Create service: `src/lib/automatic-imports/providers/plaid-service.ts`
  - Exchange public token for access token
  - Fetch transactions
  - Handle webhooks
  - Refresh tokens
  - Bank compatibility lookup
- [ ] Create component: `src/components/automatic-imports/providers/PlaidConnect.tsx`
  - Plaid Link integration
  - Handle connection flow
- [ ] Webhook handler: `POST /api/webhooks/plaid`
  - Handle `TRANSACTIONS` webhook
  - Queue new transactions

#### 2.3 Finicity Integration
- [ ] Create Finicity account and get API keys
- [ ] Install Finicity SDK or use REST API
- [ ] Create service: `src/lib/automatic-imports/providers/finicity-service.ts`
  - Customer creation and management
  - Connect flow
  - Fetch transactions
  - Handle webhooks
- [ ] Create component: `src/components/automatic-imports/providers/FinicityConnect.tsx`
- [ ] Webhook handler: `POST /api/webhooks/finicity`

#### 2.4 MX Integration
- [ ] Create MX account and get API keys
- [ ] Install MX SDK or use REST API
- [ ] Create service: `src/lib/automatic-imports/providers/mx-service.ts`
  - User and member management
  - Connect flow
  - Fetch transactions with categorization
  - Handle webhooks
- [ ] Create component: `src/components/automatic-imports/providers/MXConnect.tsx`
- [ ] Webhook handler: `POST /api/webhooks/mx`

#### 2.5 Yodlee Integration (Optional)
- [ ] Create Yodlee account and get API keys
- [ ] Install Yodlee SDK or use REST API
- [ ] Create service: `src/lib/automatic-imports/providers/yodlee-service.ts`
  - FastLink integration
  - Fetch transactions
  - Handle webhooks
- [ ] Create component: `src/components/automatic-imports/providers/YodleeConnect.tsx`
- [ ] Webhook handler: `POST /api/webhooks/yodlee`

#### 2.6 Teller Integration (Optional - Low Cost)
- [ ] Create Teller account and get API keys
- [ ] Use Teller REST API
- [ ] Create service: `src/lib/automatic-imports/providers/teller-service.ts`
  - Connect flow
  - Fetch transactions
  - Handle webhooks
- [ ] Create component: `src/components/automatic-imports/providers/TellerConnect.tsx`
- [ ] Webhook handler: `POST /api/webhooks/teller`

#### 2.7 UI: Multi-Integration Management
- [ ] Update: `src/app/(dashboard)/settings/automatic-imports/page.tsx`
  - Show all available integrations
  - Bank compatibility search/filter
  - Cost comparison per integration
  - Enable/disable toggle per integration
  - Show active integrations per account
- [ ] Component: `src/components/automatic-imports/IntegrationSelector.tsx`
  - List available integrations
  - Show bank compatibility
  - Show cost estimates
  - Enable/disable controls
- [ ] Component: `src/components/automatic-imports/BankCompatibilitySearch.tsx`
  - Search US banks by name
  - Show which integrations support each bank
  - Cost comparison for supported integrations
  - Filter by integration type
- [ ] Component: `src/components/automatic-imports/IntegrationStatusCard.tsx`
  - Show status of each active integration
  - Last fetch time
  - Error status
  - Transaction count
  - Estimated cost
- [ ] Component: `src/components/automatic-imports/CostEstimator.tsx`
  - Estimate monthly cost based on transaction volume
  - Compare costs across integrations
  - Show savings recommendations

#### 2.8 Premium Feature Gating
- [ ] Check subscription status before allowing API integrations
- [ ] Show upgrade prompt for free users
- [ ] Track usage per integration for billing
- [ ] Cost pass-through or markup strategy

#### 2.9 Testing
- [ ] Test each integration's connection flow
- [ ] Test webhook handling for each provider
- [ ] Test transaction fetching from multiple integrations
- [ ] Test deduplication across integrations
- [ ] Test error scenarios (expired tokens, etc.)
- [ ] Test enable/disable functionality
- [ ] Test cost tracking accuracy

**Timeline:** 8-12 weeks (after Phase 1)

---

### Phase 3: Expanded Integration Options

#### 3.1 Additional Integrations
- [ ] Add any integrations not included in Phase 2 based on user demand
- [ ] Monitor emerging US-focused providers
- [ ] Evaluate new integrations based on:
  - US bank coverage
  - Cost competitiveness
  - Developer experience
  - User requests

#### 3.2 Integration Marketplace UI
- [ ] Create integration discovery page
- [ ] Show integration popularity
- [ ] User reviews/ratings
- [ ] Request new integrations
- [ ] Show US bank coverage per integration

**Timeline:** 4-6 weeks (after Phase 2)

---

## Technical Implementation Details

### Email Processing Flow

```
1. User sets up email import
   → System generates unique email: user123+setup456@imports.budgetapp.com
   → User forwards bank statement emails to this address

2. Email arrives at webhook endpoint
   → POST /api/webhooks/email-import
   → Extract attachments (PDF/CSV)
   → Store in temporary storage
   → Queue for processing

3. Background job processes email
   → Parse PDF/CSV using existing parsers
   → Extract transactions
   → Check for duplicates (hash comparison)
   → Create queued_imports records
   → Link to import_setup_id

4. User reviews queue
   → Navigate to /imports/queue
   → See batches of queued transactions
   → Review, edit, approve/reject
   → Approved transactions imported via existing import flow
```

### Queue Management

**Deduplication Strategy:**
- Use transaction hash (same as manual imports)
- Check against both `imported_transactions` and `queued_imports`
- Prevent duplicate queuing within same batch

**Batch Grouping:**
- Group transactions by `source_batch_id`
- Each email/API fetch creates a new batch
- Users can approve/reject entire batches

**Status Flow:**
```
pending → reviewing → approved → imported
                    → rejected
```

### Integration with Existing Import System

**Reuse Existing Components:**
- `TransactionPreview` component can load from `queued_imports`
- Use same `ParsedTransaction` interface
- Reuse `importTransactions` function for final import

**Modifications Needed:**
- Extend `TransactionPreview` to accept `queuedImportId`
- Update import API to handle queued imports
- Add batch operations (approve all, reject all)
- Show integration source in transaction preview
- Group by integration in queue view

### Multi-Integration Management

**User Workflow:**
1. **Discovery**: User searches for their bank
   - System shows which integrations support that bank
   - Displays cost comparison
   - Shows reliability ratings

2. **Selection**: User chooses integration(s)
   - Can enable multiple integrations for redundancy
   - Can enable different integrations for different accounts
   - Sees estimated monthly cost before connecting

3. **Connection**: User connects bank account
   - Integration-specific OAuth/connection flow
   - System stores connection securely
   - Shows connection status

4. **Management**: User manages active integrations
   - Enable/disable toggle per integration
   - View status, last fetch, error count
   - See transaction volume and cost
   - Reconnect if needed
   - Remove integration

5. **Queue Review**: Transactions from all integrations
   - See which integration provided each transaction
   - Filter by integration source
   - Handle duplicates from multiple integrations
   - Approve/reject batches per integration

**Deduplication Strategy:**
- When multiple integrations fetch same transaction:
  - Use transaction hash + date + amount
  - Keep transaction from most reliable integration
  - Or keep transaction from lowest-cost integration
  - User preference setting for priority

**Cost Optimization:**
- Show cost per integration
- Recommend lower-cost alternatives
- Allow users to disable expensive integrations
- Show estimated savings from switching

---

## Security Considerations

### Email Import
- ✅ Unique email addresses per setup (prevents cross-user access)
- ✅ Verify email signature/SPF records
- ✅ Rate limit email processing
- ✅ Sanitize file attachments
- ✅ Scan for malware (optional, using services like VirusTotal)

### API Integrations (Plaid, Finicity, MX, etc.)
- ✅ Never store access tokens in plain text (encrypt all tokens)
- ✅ Use provider-specific webhook verification
- ✅ Implement token refresh flow for each provider
- ✅ Handle token expiration gracefully
- ✅ Follow each provider's security best practices
- ✅ Rotate API keys regularly
- ✅ Monitor for suspicious activity
- ✅ Implement rate limiting per integration
- ✅ Encrypt sensitive data in `source_config` JSONB field

### General
- ✅ RLS policies ensure users only see their own data
- ✅ Audit logging for import actions
- ✅ Rate limiting on API endpoints
- ✅ Input validation and sanitization

---

## Cost Analysis

### Email Import (Per User/Month)
- Email processing: $0.10-0.50
- Storage (attachments): $0.01-0.05
- Compute (parsing): $0.05-0.20
- **Total: ~$0.16-0.75/user/month**

### API Integrations (Per User/Month)
Cost varies by integration and transaction volume:

**Plaid:**
- $0.30/transaction × transactions
- For 100 transactions: $30/month
- For 500 transactions: $150/month

**Finicity:**
- $0.20-0.30/transaction × transactions
- For 100 transactions: $20-30/month
- For 500 transactions: $100-150/month

**MX:**
- $0.15-0.25/transaction × transactions
- For 100 transactions: $15-25/month
- For 500 transactions: $75-125/month

**Teller:**
- $0.10-0.20/transaction × transactions
- For 100 transactions: $10-20/month
- For 500 transactions: $50-100/month

**Other integrations:** Similar cost structures, varies by provider

**Cost Strategy:**
- Pass-through costs to premium users
- Or charge flat premium fee + usage-based pricing
- Show cost estimates before connecting
- Allow users to compare and choose

### Infrastructure (Shared)
- Database storage: Negligible
- API routes: Included in hosting
- Background jobs: Included in hosting
- **Total: ~$0-10/month (shared across all users)**

---

## Monitoring & Observability

### Metrics to Track
- Number of active import setups per integration type
- Queue size (pending imports)
- Processing time (email/API → queue)
- Error rates by integration type
- User engagement (review/approval rates)
- Cost per user per integration
- Integration popularity (which integrations are most used)
- Bank compatibility coverage
- Average cost per transaction by integration
- Integration reliability scores
- User satisfaction per integration

### Alerts
- High error rates (>5%) per integration
- Queue backlog (>1000 pending)
- Failed email processing
- API token expiration (any integration)
- Unusual import volumes
- Integration downtime
- Cost threshold exceeded per user
- Bank compatibility issues

### Logging
- All import setup changes (enable/disable integrations)
- Queue operations (create, approve, reject)
- Email processing events
- API calls for each integration provider
- Integration connection/disconnection events
- Cost tracking per integration
- US bank compatibility lookups
- Error details with context (including integration type)

---

## Future Enhancements

### Phase 4: Smart Features
- Auto-categorization suggestions for queued imports
- Duplicate detection improvements (across integrations)
- Batch rules (auto-approve certain merchants/categories)
- Import scheduling (daily, weekly, etc.)
- Smart integration selection (recommend best integration per US bank)
- Cost optimization suggestions
- Integration health monitoring and auto-switching
- US bank coverage expansion tracking

### Phase 5: Advanced Queue Management
- Bulk operations (approve/reject by filters)
- Queue prioritization
- Import templates per setup
- Custom parsing rules per bank

---

## Open Questions & Decisions Needed

1. **Email Service Provider**
   - [ ] Choose: SendGrid Inbound Parse vs AWS SES vs Postmark
   - [ ] Consider: Cost, reliability, features

2. **Storage for Email Attachments**
   - [ ] Choose: Supabase Storage vs AWS S3
   - [ ] Consider: Cost, integration ease

3. **Premium Feature Pricing**
   - [ ] How to price API integrations?
   - [ ] Flat fee vs per-transaction vs hybrid?
   - [ ] Include in existing premium tier?
   - [ ] Allow free tier with limited integrations?
   - [ ] Cost pass-through vs markup strategy?

4. **Queue Retention Policy**
   - [ ] How long to keep rejected imports?
   - [ ] Auto-delete after X days?
   - [ ] Archive old batches?

5. **Batch Size Limits**
   - [ ] Max transactions per batch?
   - [ ] Pagination for large batches?
   - [ ] Performance considerations?

6. **Error Handling Strategy**
   - [ ] Retry failed email processing?
   - [ ] Retry failed API calls per integration?
   - [ ] Notify users of errors?
   - [ ] Auto-disable failing setups?
   - [ ] Auto-switch to backup integration on failure?

7. **Multi-Integration Management**
   - [ ] How to handle duplicate transactions from multiple integrations?
   - [ ] Priority order when multiple integrations active?
   - [ ] Cost optimization recommendations?
   - [ ] US bank compatibility database maintenance?
- [ ] How to handle banks not supported by any integration?

---

## Success Metrics

### Phase 1 (Email Import)
- [ ] 50% of active users set up at least one email import
- [ ] Average queue review time < 5 minutes
- [ ] Email processing success rate > 95%
- [ ] User satisfaction score > 4/5

### Phase 2 (API Integrations)
- [ ] 30% of premium users use at least one API integration
- [ ] Average transaction fetch success rate > 99% across all integrations
- [ ] Average time from transaction to queue < 1 hour
- [ ] Revenue covers integration costs + margin
- [ ] Users average 1.5 active integrations per account
- [ ] US bank compatibility coverage > 80% for users
- [ ] Top 20 US banks supported by at least 2 integrations

### Phase 3 (Expanded Integrations)
- [ ] Cost savings of 20%+ for users using lower-cost integrations
- [ ] Integration marketplace engagement > 50% of premium users
- [ ] 90%+ of top 50 US banks supported

---

## Timeline Summary

**Phase 1: Email Import (MVP)**
- Start: Week 1
- Database & Infrastructure: Weeks 1-2
- Email Processing: Weeks 2-3
- UI Development: Weeks 3-5
- Testing & Polish: Weeks 5-6
- **Launch: Week 6-7**

**Phase 2: Core API Integrations**
- Start: After Phase 1 launch
- Integration Infrastructure: Weeks 1-2
- Plaid Integration: Weeks 2-4
- Finicity Integration: Weeks 4-6
- MX Integration: Weeks 6-7
- Multi-Integration UI: Weeks 7-9
- Testing: Weeks 9-10
- **Launch: Week 10-12**

**Phase 3: Expanded Integrations**
- Start: After Phase 2 launch
- Additional Integrations: Weeks 1-4
- Integration Marketplace: Weeks 4-5
- Testing: Weeks 5-6
- **Launch: Week 6**

---

## References & Resources

### Integration Providers (US-Focused)
- [Plaid API Documentation](https://plaid.com/docs/)
- [Plaid Pricing](https://plaid.com/pricing/)
- [Finicity Developer Portal](https://developer.finicity.com/)
- [MX Developer Portal](https://developer.mx.com/)
- [Teller API Documentation](https://teller.io/docs)
- [Yodlee Developer Portal](https://developer.yodlee.com/)

### Email & Infrastructure
- [SendGrid Inbound Parse](https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook)
- [AWS SES Email Receiving](https://docs.aws.amazon.com/ses/latest/dg/receiving-email.html)
- [Postmark Inbound](https://postmarkapp.com/developer/inbound-parse)

### Existing Codebase
- [Existing CSV Parser](../src/lib/csv-parser.ts)
- [Existing PDF Parser](../src/lib/pdf-parser.ts)
- [Existing Import Types](../src/lib/import-types.ts)

---

## Appendix: Database Migration Template

See `migrations/046_add_automatic_imports.sql` (to be created)

---

**Document Version:** 2.2  
**Last Updated:** 2025-01-XX  
**Author:** Development Team  
**Status:** Draft - Pending Review  
**Changes:** 
- Removed non-US integrations (TrueLayer, Salt Edge, Yapily, Flinks) and browser automation (security concerns)
- Focused on US-only secure integrations: Plaid, Yodlee, Finicity, MX, Teller, Email/PDF
- Added comprehensive backup/restore updates section covering automatic_import_setups and queued_imports tables

