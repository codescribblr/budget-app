# Duplicate Transaction Merge Feature - Implementation Plan

## Overview

This document outlines the plan for significantly improving the duplicate transaction finder feature. The improvements include:

1. **Merge functionality** - Allow merging duplicate transactions instead of just deleting them
2. **Field selection** - Choose which fields to keep from each transaction during merge
3. **Historical transaction handling** - Properly handle envelope balance updates based on historical status
4. **Reviewed status tracking** - Mark duplicate groups as reviewed to prevent them from reappearing
5. **UI relocation** - Move duplicate finder from settings page to transactions page for easier access

## Current State Analysis

### Existing Implementation

**Location:**
- Component: `src/components/settings/DuplicateTransactionFinder.tsx`
- Page: `src/app/(dashboard)/settings/duplicates/page.tsx`
- API Endpoints:
  - `GET /api/transactions/find-duplicates` - Finds duplicate groups
  - `POST /api/transactions/delete-duplicates` - Deletes selected transactions

**Current Functionality:**
- Finds transactions with same amount and date within ±1 day
- Groups duplicates together
- Allows selecting transactions to delete
- Reverses category balance changes when deleting
- Preserves import records to prevent re-import

**Limitations:**
1. Only supports deletion, not merging
2. No way to selectively keep data from different transactions
3. Doesn't properly handle historical transaction envelope updates
4. No way to mark groups as "not duplicates" to prevent re-review
5. Located in settings, not easily accessible

### Database Schema

**Transactions Table:**
- `id` (BIGSERIAL PRIMARY KEY)
- `user_id` (UUID)
- `budget_account_id` (BIGINT)
- `date` (TEXT)
- `description` (TEXT)
- `total_amount` (DECIMAL)
- `transaction_type` ('income' | 'expense')
- `merchant_group_id` (BIGINT, nullable)
- `account_id` (BIGINT, nullable)
- `credit_card_id` (BIGINT, nullable)
- `is_historical` (BOOLEAN, default false)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Transaction Splits Table:**
- `id` (BIGSERIAL PRIMARY KEY)
- `transaction_id` (BIGINT)
- `category_id` (BIGINT)
- `amount` (DECIMAL)

**Key Business Logic:**
- Historical transactions (`is_historical = true`) do NOT affect category envelope balances
- Non-historical transactions update category balances when created/updated/deleted
- Balance updates: income adds to balance, expense subtracts from balance
- System categories (`is_system = true`) are not updated

## Requirements

### 1. Merge Functionality

**Goal:** Allow users to merge duplicate transactions instead of deleting them.

**Requirements:**
- User selects which transaction to keep as the "base" transaction
- User can choose which fields to keep from each transaction:
  - Date
  - Description
  - Category (from splits)
  - Merchant Group
  - Amount
- Merged transaction should preserve the best data from all source transactions
- All source transactions except the base should be deleted after merge

### 2. Field Selection UI

**Goal:** Provide intuitive interface for selecting which data to keep from each transaction.

**Requirements:**
- Show all transactions in the duplicate group side-by-side
- For each field (date, description, category, merchant, amount), allow selection of which transaction's value to use
- Default to the most recent transaction's values
- Show preview of merged transaction before confirming
- Support multiple splits/categories (user can combine categories from different transactions)

### 3. Historical Transaction Handling

**Goal:** Correctly update envelope balances when merging transactions with different historical statuses.

**Requirements:**
- If merging transactions where one is historical and one is not:
  - User can choose whether merged transaction should be historical
  - When updating categories:
    - Reverse the impact of non-historical transactions (add back to envelopes)
    - Apply the merged transaction based on its new historical status
    - Do NOT update envelopes for categories that were only in historical transactions
- If merging transactions with different categories:
  - Reverse envelope updates for old categories (only if transaction was non-historical)
  - Apply envelope updates for new categories (only if merged transaction is non-historical)
- If both transactions are historical:
  - Merged transaction should default to historical
  - No envelope updates should occur regardless of category changes

### 4. Reviewed Status Tracking

**Goal:** Allow users to mark duplicate groups as "reviewed" so they don't reappear.

**Requirements:**
- Create new database table: `duplicate_group_reviews`
- Store which transaction IDs were reviewed together
- When finding duplicates, exclude groups that have been marked as reviewed
- If new transactions are added that match a reviewed group, create a new group (not marked as reviewed)
- Provide UI to mark groups as "Not Duplicates" (reviewed)
- Provide UI to unmark groups if needed

**Database Schema:**
```sql
CREATE TABLE duplicate_group_reviews (
  id BIGSERIAL PRIMARY KEY,
  budget_account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  transaction_ids BIGINT[] NOT NULL, -- Array of transaction IDs that were reviewed together
  group_fingerprint TEXT NOT NULL, -- Hash of amount+date+description for fuzzy matching
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(budget_account_id, transaction_ids)
);

CREATE INDEX idx_duplicate_group_reviews_account ON duplicate_group_reviews(budget_account_id);
CREATE INDEX idx_duplicate_group_reviews_transaction_ids ON duplicate_group_reviews USING GIN(transaction_ids);
CREATE INDEX idx_duplicate_group_reviews_fingerprint ON duplicate_group_reviews(budget_account_id, group_fingerprint);
```

**Note:** Using array for `transaction_ids` allows efficient querying with PostgreSQL's array operators. The `group_fingerprint` provides a content-based way to identify reviewed groups even if transactions are deleted.

### 5. UI Relocation

**Goal:** Make duplicate finder easily accessible from transactions page without cluttering it.

**Requirements:**
- Add "Find Duplicates" button on transactions page that links to standalone duplicates page
- Create new standalone page: `/transactions/duplicates` for managing duplicates
- Standalone page should have link back to transactions page
- Keep existing settings page link for backward compatibility (or redirect to new page)
- Show duplicate count badge on button if duplicates exist
- Keep transactions page clean and uncluttered

## Implementation Plan

### Phase 1: Database Migration

**File:** `migrations/042_add_duplicate_group_reviews.sql`

**Tasks:**
1. Create `duplicate_group_reviews` table
2. Add indexes for performance
3. Add comments for documentation

**Migration Details:**
```sql
-- Migration: 042_add_duplicate_group_reviews.sql
-- Description: Add table to track reviewed duplicate transaction groups
-- Date: 2025-01-XX

CREATE TABLE IF NOT EXISTS duplicate_group_reviews (
  id BIGSERIAL PRIMARY KEY,
  budget_account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  transaction_ids BIGINT[] NOT NULL,
  group_fingerprint TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(budget_account_id, transaction_ids)
);

CREATE INDEX IF NOT EXISTS idx_duplicate_group_reviews_account 
  ON duplicate_group_reviews(budget_account_id);

CREATE INDEX IF NOT EXISTS idx_duplicate_group_reviews_transaction_ids 
  ON duplicate_group_reviews USING GIN(transaction_ids);

CREATE INDEX IF NOT EXISTS idx_duplicate_group_reviews_fingerprint 
  ON duplicate_group_reviews(budget_account_id, group_fingerprint);

COMMENT ON TABLE duplicate_group_reviews IS 
  'Tracks duplicate transaction groups that have been reviewed and marked as "not duplicates"';
COMMENT ON COLUMN duplicate_group_reviews.transaction_ids IS 
  'Array of transaction IDs that were reviewed together. Used to prevent re-showing the same group.';
COMMENT ON COLUMN duplicate_group_reviews.group_fingerprint IS 
  'Content-based hash (amount+date+description) for identifying reviewed groups even if transactions are deleted.';
```

### Phase 2: API Updates

#### 2.1 Update Find Duplicates API

**File:** `src/app/api/transactions/find-duplicates/route.ts`

**Changes:**
1. Include `is_historical` field in transaction query
2. Include `merchant_group_id` in transaction query
3. Filter out reviewed duplicate groups
4. Return additional fields needed for merge UI

**Updated Query:**
```typescript
const { data: transactions, error } = await supabase
  .from('transactions')
  .select(`
    id,
    date,
    description,
    total_amount,
    transaction_type,
    merchant_group_id,
    is_historical,
    account_id,
    credit_card_id,
    created_at,
    splits:transaction_splits(
      id,
      category_id,
      amount,
      category:categories(name)
    )
  `)
  .eq('budget_account_id', accountId)
  .order('date', { ascending: false });
```

**Filter Reviewed Groups:**
```typescript
// After finding duplicate groups, filter out reviewed ones
const { data: reviewedGroups } = await supabase
  .from('duplicate_group_reviews')
  .select('transaction_ids')
  .eq('budget_account_id', accountId);

const reviewedTransactionIdsSet = new Set<number>();
reviewedGroups?.forEach(review => {
  review.transaction_ids.forEach(id => reviewedTransactionIdsSet.add(id));
});

// Filter duplicate groups
const filteredGroups = duplicateGroups.filter(group => {
  const groupTransactionIds = group.transactions.map(t => t.id);
  // Check if all transactions in this group are in a reviewed group
  return !groupTransactionIds.every(id => reviewedTransactionIdsSet.has(id));
});
```

#### 2.2 Create Merge Transactions API

**File:** `src/app/api/transactions/merge-duplicates/route.ts`

**Endpoint:** `POST /api/transactions/merge-duplicates`

**Request Body:**
```typescript
{
  baseTransactionId: number; // Transaction to keep
  transactionsToMerge: number[]; // Transactions to merge into base
  mergeData: {
    date: number; // Index of transaction to take date from
    description: number; // Index of transaction to take description from
    merchant_group_id: number | null; // Merchant group ID (can be from any transaction or null)
    is_historical: boolean; // Whether merged transaction should be historical
    splits: Array<{
      category_id: number;
      amount: number;
      sourceTransactionId: number; // Which transaction this split came from
    }>;
  };
}
```

**Logic:**
1. Validate all transactions exist and belong to user's account
2. Get all transactions with their current splits and historical status
3. Calculate envelope balance changes:
   - For each transaction being merged:
     - If non-historical: reverse its impact on envelopes
   - For merged transaction:
     - If non-historical: apply its impact on envelopes
4. Update base transaction with merged data
5. Delete other transactions (preserve import links)
6. Return merged transaction

**Envelope Update Logic:**
```typescript
// Step 1: Reverse old transactions (only if non-historical)
for (const transactionId of [baseTransactionId, ...transactionsToMerge]) {
  const transaction = transactions.find(t => t.id === transactionId);
  if (!transaction.is_historical) {
    // Reverse each split's impact
    for (const split of transaction.splits) {
      const balanceChange = transaction.transaction_type === 'income'
        ? -split.amount  // Reverse income: subtract
        : split.amount;  // Reverse expense: add back
      
      // Update category balance
      await updateCategoryBalance(split.category_id, balanceChange);
    }
  }
}

// Step 2: Apply merged transaction (only if non-historical)
if (!mergeData.is_historical) {
  for (const split of mergeData.splits) {
    const balanceChange = mergeData.transaction_type === 'income'
      ? split.amount   // Income adds
      : -split.amount; // Expense subtracts
    
    await updateCategoryBalance(split.category_id, balanceChange);
  }
}
```

#### 2.3 Create Mark Reviewed API

**File:** `src/app/api/transactions/mark-duplicates-reviewed/route.ts`

**Endpoint:** `POST /api/transactions/mark-duplicates-reviewed`

**Request Body:**
```typescript
{
  transactionIds: number[]; // Array of transaction IDs in the group
}
```

**Logic:**
1. Validate all transactions belong to user's account
2. Sort transaction IDs array for consistent storage
3. Generate group fingerprint: hash of (amount + date + normalized description)
4. Insert or update review record (with fingerprint)
5. Return success

**Fingerprint Generation:**
```typescript
function generateGroupFingerprint(transactions: Transaction[]): string {
  // Normalize and combine key fields
  const normalized = transactions.map(t => ({
    amount: t.total_amount,
    date: t.date,
    description: t.description.toLowerCase().trim()
  }));
  
  // Sort by date for consistency
  normalized.sort((a, b) => a.date.localeCompare(b.date));
  
  // Create hash
  const combined = normalized.map(n => 
    `${n.amount}|${n.date}|${n.description}`
  ).join('||');
  
  return hashString(combined); // Use crypto.createHash or similar
}
```

#### 2.4 Create Unmark Reviewed API

**File:** `src/app/api/transactions/unmark-duplicates-reviewed/route.ts`

**Endpoint:** `POST /api/transactions/unmark-duplicates-reviewed`

**Request Body:**
```typescript
{
  transactionIds: number[]; // Array of transaction IDs in the group
}
```

**Logic:**
1. Validate all transactions belong to user's account
2. Delete review record
3. Return success

### Phase 3: Component Updates

#### 3.1 Create Merge Transaction Dialog Component

**File:** `src/components/transactions/MergeTransactionDialog.tsx`

**Features:**
- Side-by-side comparison of transactions
- Field selection dropdowns for each field
- Category split editor (can combine splits from multiple transactions)
- Historical transaction checkbox
- Preview of merged transaction
- Validation (ensure at least one split, amounts match, etc.)

**UI Structure (Two-Tier Approach):**

**Default View (Quick Merge):**
```
┌─────────────────────────────────────────────────────────┐
│ Merge Duplicate Transactions (2 found)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Why these are duplicates:                               │
│ ✓ Same amount: $80.00                                   │
│ ✓ Same date: Jan 15, 2025                               │
│ ⚠ Different categories (will be combined)                │
│                                                         │
│ Preview of Merged Transaction:                          │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Date: Jan 15, 2025 (from Transaction 2)            ││
│ │ Description: AMAZON PURCHASE (from Transaction 1)  ││
│ │ Amount: $80.00                                      ││
│ │ Categories: Groceries ($50.00), Gas ($30.00)       ││
│ │ Merchant: Amazon (from Transaction 2)               ││
│ │ Historical: No                                      ││
│ │                                                      ││
│ │ Split Total: $80.00 ✓ (matches transaction amount) ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [Customize Merge ▼]                                    │
│                                                         │
│ [Cancel] [Merge Transactions]                           │
└─────────────────────────────────────────────────────────┘
```

**Expanded View (Customize Merge):**
```
┌─────────────────────────────────────────────────────────┐
│ Merge Duplicate Transactions                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Transaction Comparison:                                 │
│ ┌──────────────┬──────────────┬──────────────┬────────┐│
│ │              │ Transaction 1│ Transaction 2│ Diff   ││
│ ├──────────────┼──────────────┼──────────────┼────────┤│
│ │ Date         │ Jan 14       │ Jan 15       │ 1 day  ││
│ │ Description  │ AMAZON.COM   │ AMAZON PURCH │ Diff   ││
│ │ Amount       │ $80.00       │ $80.00       │ Same ✓ ││
│ │ Category     │ Groceries    │ Gas          │ Diff   ││
│ │ Merchant     │ Amazon       │ Amazon       │ Same ✓ ││
│ │ Historical   │ No           │ Yes          │ Diff   ││
│ └──────────────┴──────────────┴──────────────┴────────┘│
│                                                         │
│ Select fields to keep:                                  │
│ Date: [Transaction 2 ▼]                                │
│ Description: [Transaction 1 ▼]                          │
│ Merchant: [Transaction 2 ▼]                            │
│ Historical: ☑                                          │
│                                                         │
│ Categories:                                            │
│ ┌─────────────────────────────────────────────────────┐│
│ │ [Transaction 1] Groceries: $50.00        [Remove] ││
│ │ [Transaction 2] Gas: $30.00              [Remove] ││
│ │ [+ Add Category]                                    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Split Total: $80.00 ✓ (matches transaction amount)    │
│                                                         │
│ [Collapse ▲]                                           │
│                                                         │
│ [Cancel] [Merge Transactions]                          │
└─────────────────────────────────────────────────────────┘
```

#### 3.2 Update DuplicateTransactionFinder Component

**File:** `src/components/settings/DuplicateTransactionFinder.tsx`

**Changes:**
1. Add "Merge" button for each duplicate group
2. Add "Mark as Not Duplicates" button
3. Integrate MergeTransactionDialog
4. Add reviewed status indicator
5. Update API calls to use new endpoints

**New Features:**
- Show "Reviewed" badge for groups that are marked as reviewed
- Allow unmarking reviewed groups
- Merge button opens MergeTransactionDialog
- Keep delete functionality for backward compatibility

#### 3.3 Create Standalone Duplicates Page

**File:** `src/app/(dashboard)/transactions/duplicates/page.tsx`

**New Page:**
- Standalone page dedicated to duplicate transaction management
- Uses the updated `DuplicateTransactionFinder` component
- Includes navigation back to transactions page
- Clean, focused interface for duplicate management

**File:** `src/components/transactions/TransactionsPage.tsx`

**Changes:**
1. Add "Find Duplicates" button in header/toolbar area
2. Button links to `/transactions/duplicates` page
3. Show duplicate count badge on button if duplicates exist
4. Button should be prominent but not intrusive

**UI Structure:**
```
Transactions Page:
┌─────────────────────────────────────────────────────────┐
│ Transactions                    [Find Duplicates (3)]  │
├─────────────────────────────────────────────────────────┤
│ [Search] [Filters] [Add Transaction]                   │
│                                                         │
│ [Transaction list...]                                  │
└─────────────────────────────────────────────────────────┘

Duplicates Page:
┌─────────────────────────────────────────────────────────┐
│ Duplicate Transactions        [← Back to Transactions] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [DuplicateTransactionFinder component with all features]│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Phase 4: Type Updates

**File:** `src/lib/types.ts`

**Add Types:**
```typescript
export interface DuplicateGroup {
  amount: number;
  transactions: Array<{
    id: number;
    date: string;
    description: string;
    total_amount: number;
    transaction_type: 'income' | 'expense';
    merchant_group_id: number | null;
    is_historical: boolean;
    account_id: number | null;
    credit_card_id: number | null;
    created_at: string;
    splits: Array<{
      id: number;
      category_id: number;
      amount: number;
      category_name: string;
    }>;
  }>;
  isReviewed?: boolean; // Optional, for UI state
}

export interface MergeTransactionRequest {
  baseTransactionId: number;
  transactionsToMerge: number[];
  mergeData: {
    date: string; // Selected date
    description: string; // Selected description
    merchant_group_id: number | null;
    is_historical: boolean;
    transaction_type: 'income' | 'expense';
    splits: Array<{
      category_id: number;
      amount: number;
    }>;
  };
}
```

## Testing Plan

### Unit Tests

1. **Merge Logic Tests:**
   - Test merging two non-historical transactions
   - Test merging historical and non-historical transactions
   - Test merging transactions with different categories
   - Test envelope balance calculations
   - Test validation (amounts must match, etc.)

2. **Reviewed Groups Tests:**
   - Test marking group as reviewed
   - Test filtering reviewed groups from results
   - Test unmarking reviewed groups
   - Test that new transactions create new groups

### Integration Tests

1. **API Endpoints:**
   - Test merge endpoint with various scenarios
   - Test reviewed marking/unmarking
   - Test find duplicates excludes reviewed groups

2. **UI Components:**
   - Test merge dialog field selection
   - Test category combination
   - Test validation messages
   - Test preview updates

### Manual Testing Scenarios

1. **Basic Merge:**
   - Find duplicates
   - Merge two transactions
   - Verify merged transaction appears correctly
   - Verify deleted transactions are gone
   - Verify envelope balances are correct

2. **Historical Merge:**
   - Merge historical and non-historical transactions
   - Verify envelope updates are correct
   - Test changing historical status during merge

3. **Category Changes:**
   - Merge transactions with different categories
   - Verify old category envelopes are updated correctly
   - Verify new category envelopes are updated correctly

4. **Reviewed Groups:**
   - Mark a group as reviewed
   - Verify it doesn't appear in future searches
   - Add a new transaction that matches reviewed group
   - Verify new group is created (not marked as reviewed)
   - Unmark reviewed group
   - Verify it appears in future searches

## Migration Strategy

1. **Backward Compatibility:**
   - Keep existing delete functionality
   - Keep settings page link (redirect to new `/transactions/duplicates` page)
   - Existing duplicate groups will work with new system

2. **Data Migration:**
   - No data migration needed
   - New table is empty initially
   - Existing transactions unaffected

3. **Rollout:**
   - Deploy database migration first
   - Deploy API endpoints
   - Deploy UI components
   - Monitor for issues

## Risk Assessment

### High Risk Areas

1. **Envelope Balance Updates:**
   - Risk: Incorrect balance calculations could corrupt budget data
   - Mitigation: Extensive testing, transaction rollback on errors, validation

2. **Historical Transaction Logic:**
   - Risk: Complex logic for handling historical vs non-historical
   - Mitigation: Clear documentation, unit tests, code review

3. **Reviewed Groups:**
   - Risk: Array comparison in PostgreSQL might have edge cases
   - Mitigation: Use sorted arrays, test edge cases

### Medium Risk Areas

1. **UI Complexity:**
   - Risk: Merge dialog might be confusing
   - Mitigation: Clear labels, preview, validation messages

2. **Performance:**
   - Risk: Finding duplicates with reviewed filter might be slow
   - Mitigation: Proper indexing, consider caching

## Future Enhancements

1. **Smart Merge Suggestions:**
   - AI/ML to suggest which fields to keep
   - Suggest most likely correct data

2. **Bulk Operations:**
   - Merge multiple groups at once
   - Batch mark as reviewed

3. **Duplicate Detection Improvements:**
   - More sophisticated matching algorithms
   - Fuzzy matching for descriptions
   - Machine learning for duplicate detection

4. **Audit Trail:**
   - Track who merged what and when
   - Show merge history

## Implementation Checklist

### Database
- [ ] Create migration file `042_add_duplicate_group_reviews.sql`
- [ ] Run migration in development
- [ ] Test migration rollback

### API Endpoints
- [ ] Update `GET /api/transactions/find-duplicates` to include new fields
- [ ] Update `GET /api/transactions/find-duplicates` to filter reviewed groups
- [ ] Create `POST /api/transactions/merge-duplicates`
- [ ] Create `POST /api/transactions/mark-duplicates-reviewed`
- [ ] Create `POST /api/transactions/unmark-duplicates-reviewed`
- [ ] Add error handling and validation
- [ ] Add API tests

### Components
- [ ] Create `MergeTransactionDialog.tsx` with two-tier UI (quick/customize)
- [ ] Implement smart defaults logic for selecting best base transaction
- [ ] Add transaction comparison view
- [ ] Add amount validation with visual feedback
- [ ] Update `DuplicateTransactionFinder.tsx` with merge functionality
- [ ] Update `DuplicateTransactionFinder.tsx` with reviewed status
- [ ] Add bulk actions (select multiple groups)
- [ ] Create standalone duplicates page `src/app/(dashboard)/transactions/duplicates/page.tsx`
- [ ] Add "Find Duplicates" button to `TransactionsPage.tsx` that links to duplicates page
- [ ] Add navigation back to transactions page from duplicates page
- [ ] Add types to `types.ts`
- [ ] Update UI styling and responsiveness
- [ ] Add undo functionality (store deleted transactions temporarily)
- [ ] Add accessibility features (keyboard nav, ARIA labels)

### Testing
- [ ] Write unit tests for merge logic
- [ ] Write unit tests for envelope updates
- [ ] Write integration tests for API endpoints
- [ ] Manual testing of all scenarios
- [ ] Test with large datasets

### Documentation
- [ ] Update user documentation
- [ ] Add inline code comments
- [ ] Update API documentation

## Timeline Estimate

- **Phase 1 (Database):** 1 day
- **Phase 2 (API):** 3-4 days
- **Phase 3 (Components):** 4-5 days
- **Phase 4 (Testing):** 2-3 days
- **Total:** 10-13 days

## Success Criteria

1. ✅ Users can merge duplicate transactions with field selection
2. ✅ Envelope balances update correctly for all scenarios
3. ✅ Historical transactions are handled correctly
4. ✅ Users can mark groups as reviewed
5. ✅ Reviewed groups don't reappear in searches
6. ✅ Duplicate finder is accessible via button on transactions page, leading to standalone duplicates page
7. ✅ All existing functionality still works
8. ✅ No data corruption or balance calculation errors

## UX Improvements & Recommendations

### 1. Smart Defaults for Merge

**Current Plan:** Defaults to "most recent transaction"

**Improvement:** Implement intelligent defaults that prefer:
- **Non-historical transactions** (they're "real" transactions affecting budgets)
- **Transactions with merchant groups** (more complete metadata)
- **Better descriptions** (longer, more specific descriptions are usually better)
- **Most recent** as final tiebreaker

**Implementation:**
```typescript
function selectBestBaseTransaction(transactions: Transaction[]): Transaction {
  // Score each transaction
  return transactions.reduce((best, current) => {
    let score = 0;
    
    // Prefer non-historical
    if (!current.is_historical) score += 10;
    
    // Prefer transactions with merchant groups
    if (current.merchant_group_id) score += 5;
    
    // Prefer longer, more descriptive descriptions
    score += Math.min(current.description.length / 10, 3);
    
    // Prefer more recent
    const daysSince = (Date.now() - new Date(current.created_at).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - daysSince);
    
    return score > best.score ? { transaction: current, score } : best;
  }, { transaction: transactions[0], score: 0 }).transaction;
}
```

### 2. Simplified Merge UI - Two-Tier Approach

**Current Plan:** Show all fields with dropdowns upfront (potentially overwhelming)

**Improvement:** Two-tier UI:
- **Quick Merge** (default): Show smart defaults, one-click merge with "Merge" button
- **Customize Merge** (expandable): Click "Customize" to see full field selection UI

**Benefits:**
- Faster for common cases (most duplicates are straightforward)
- Less overwhelming for users
- Still allows full control when needed

**UI Structure:**
```
┌─────────────────────────────────────────────────────────┐
│ Merge Duplicate Transactions (2 found)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Preview of Merged Transaction:                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Date: Jan 15, 2025 (from Transaction 2)           ││
│ │ Description: AMAZON PURCHASE (from Transaction 1) ││
│ │ Amount: $80.00                                      ││
│ │ Categories: Groceries ($50.00), Gas ($30.00)       ││
│ │ Merchant: Amazon (from Transaction 2)              ││
│ │ Historical: No                                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [Customize Merge ▼]                                    │
│                                                         │
│ [Cancel] [Merge Transactions]                          │
└─────────────────────────────────────────────────────────┘

When "Customize Merge" is expanded:
│ Select fields to keep:                                  │
│ Date: [Transaction 2 ▼]                                │
│ Description: [Transaction 1 ▼]                          │
│ Merchant: [Transaction 2 ▼]                           │
│ Historical: ☑                                          │
│                                                         │
│ Categories:                                            │
│ ┌─────────────────────────────────────────────────────┐│
│ │ [Transaction 1] Groceries: $50.00        [Remove] ││
│ │ [Transaction 2] Gas: $30.00              [Remove] ││
│ │ [+ Add Category]                                    ││
│ └─────────────────────────────────────────────────────┘│
```

### 3. Better Reviewed Groups Tracking

**Current Plan:** Store transaction IDs array

**Issue:** If transactions are deleted, the reviewed group still references them, potentially causing issues

**Improvement:** Use a content-based fingerprint instead of (or in addition to) transaction IDs:
- Create a hash based on: amount + date + description (normalized)
- This way, even if transactions are deleted, we can still identify reviewed groups
- Store both: transaction IDs (for exact matching) AND fingerprint (for fuzzy matching)

**Updated Schema:**
```sql
CREATE TABLE duplicate_group_reviews (
  id BIGSERIAL PRIMARY KEY,
  budget_account_id BIGINT NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
  transaction_ids BIGINT[] NOT NULL, -- Exact transaction IDs
  group_fingerprint TEXT NOT NULL, -- Hash of amount+date+description for fuzzy matching
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(budget_account_id, transaction_ids)
);

CREATE INDEX idx_duplicate_group_reviews_fingerprint 
  ON duplicate_group_reviews(budget_account_id, group_fingerprint);
```

### 4. Visual Feedback & Validation

**Additions:**
- **Amount validation:** Show green checkmark if splits match total, red warning if not
- **Base transaction indicator:** Clearly highlight which transaction is being kept
- **Confidence score:** Show why transactions are considered duplicates (e.g., "Same amount ($80.00) and date (Jan 15)")
- **Impact preview:** Show envelope balance changes before merging (if non-historical)

**Example:**
```
┌─────────────────────────────────────────────────────────┐
│ Why these are duplicates:                               │
│ ✓ Same amount: $80.00                                   │
│ ✓ Same date: Jan 15, 2025                               │
│ ⚠ Different categories (will be combined)                │
└─────────────────────────────────────────────────────────┘

Split Total: $80.00 ✓ (matches transaction amount)
```

### 5. Undo Functionality

**Current Plan:** Mentioned in notes only

**Improvement:** Add to main plan - store deleted transaction data temporarily (24-48 hours) to allow undo

**Implementation:**
- Store deleted transaction data in a `deleted_transactions_archive` table
- Show "Undo Merge" toast notification after merge
- Allow undo within 24-48 hours
- Auto-cleanup after retention period

### 6. Bulk Actions

**Current Plan:** Future enhancement

**Improvement:** Add basic bulk actions:
- Select multiple groups with checkboxes
- "Mark All Selected as Reviewed" button
- "Merge All Selected" (with smart defaults) for power users

### 7. Better Empty States & Onboarding

**Additions:**
- If no duplicates found: Show helpful message with tips on what constitutes duplicates
- First-time user: Show brief tooltip explaining merge vs delete
- Show example: "Merging combines data from multiple transactions. Deleting removes them entirely."

### 8. Transaction Comparison View

**Enhancement:** Before merge dialog, show a comparison table highlighting differences:
```
┌─────────────────────────────────────────────────────────┐
│ Transaction Comparison                                  │
├──────────────┬──────────────┬──────────────┬────────────┤
│              │ Transaction 1│ Transaction 2│ Difference │
├──────────────┼──────────────┼──────────────┼────────────┤
│ Date         │ Jan 14       │ Jan 15       │ 1 day      │
│ Description  │ AMAZON.COM   │ AMAZON PURCH │ Different  │
│ Amount       │ $80.00       │ $80.00       │ Same ✓     │
│ Category     │ Groceries    │ Gas          │ Different  │
│ Merchant     │ Amazon       │ Amazon       │ Same ✓     │
└──────────────┴──────────────┴──────────────┴────────────┘
```

### 9. Improved Error Handling

**Additions:**
- If merge fails partway through: Show which step failed
- Offer to retry or cancel
- Log detailed error for debugging
- Show user-friendly error messages

### 10. Accessibility Improvements

**Additions:**
- Keyboard navigation for merge dialog
- Screen reader labels for all fields
- Focus management (focus on first field when dialog opens)
- ARIA labels for action buttons

## Revised UI Flow

1. **User clicks "Find Duplicates"** → Shows list of groups
2. **User clicks "Merge" on a group** → Opens merge dialog with smart defaults
3. **User reviews preview** → Can click "Customize" if needed
4. **User clicks "Merge"** → Shows confirmation with impact preview
5. **After merge** → Shows success toast with "Undo" option
6. **User can mark as "Not Duplicates"** → Group disappears from future searches

## Notes

- Consider adding a confirmation dialog before merging to prevent accidental merges
- Consider adding export functionality for duplicate groups (for reporting)
- Consider adding statistics: "X duplicate groups found, Y merged, Z marked as reviewed"
- Consider adding "Merge Similar" suggestion (transactions that are close but not exact duplicates)

