# Teller Webhook UX Improvements

## Overview

This document outlines improvements made to enhance the user experience when processing Teller webhook events. The changes reduce batch fragmentation and make the import queue more manageable.

## Implemented Improvements

### 1. Batching Window - Append to Existing Batches ✅

**Problem:** Previously, each webhook event created new batches for each account. If Teller sent multiple webhooks within a short time period (e.g., 3 webhooks in 5 minutes), users would see many separate batches to review, making it harder to categorize transactions.

**Solution:** Transactions from new webhooks are now appended to existing pending batches for the same account/import setup, rather than creating new batches. This groups transactions from multiple webhooks together while keeping accounts separate.

**How It Works:**
1. When a webhook fires with transactions for account A and B, two batches are created (one per account)
2. When another webhook fires with more transactions for account A and B:
   - If a pending batch exists for account A, append to it
   - If a pending batch exists for account B, append to it
   - Only create new batches if no pending batch exists for that account

**Implementation:**
- Added `findExistingPendingBatch()` function to locate existing pending batches for the same import setup and target account/credit card
- Modified `fetchAndQueueTellerTransactions()` to check for existing batches before creating new ones
- Each account gets its own batch (not grouped across accounts) to maintain categorization context
- Batches are matched by: import setup ID, target account/credit card ID, and pending/reviewing status

**Benefits:**
- Reduces batch fragmentation - transactions from multiple webhooks are grouped together
- Maintains account separation - each account has its own batch for easier categorization
- Better UX - users see fewer batches but can still categorize by account context
- Automatic - no configuration needed, works out of the box

**Files Changed:**
- `src/lib/automatic-imports/queue-manager.ts` - Added `findExistingPendingBatch()` function
- `src/lib/automatic-imports/providers/teller-service.ts` - Check for existing batches before creating new ones
- `src/app/api/webhooks/teller/route.ts` - Removed single-batch-per-webhook logic (reverted)

**Example Scenario:**
- Webhook 1 (2:00 PM): 30 transactions for Chase Credit Card A, 10 for Chase Credit Card B
  - Creates batch `teller-xxx` for Card A (30 transactions)
  - Creates batch `teller-yyy` for Card B (10 transactions)
- Webhook 2 (2:05 PM): 20 more transactions for Card A, 10 more for Card B
  - Appends to batch `teller-xxx` for Card A (now 50 transactions)
  - Appends to batch `teller-yyy` for Card B (now 20 transactions)
- User reviews one batch per card, with all transactions from both webhooks grouped together

## Future Enhancement Opportunities

### 2. Configurable Batching Window

**Proposed:** Allow users to configure a time window (e.g., 5-15 minutes) where transactions from multiple webhooks are grouped into a single batch. Currently, batches are appended indefinitely until imported, but a time window would create new batches after a period of inactivity.

**Use Case:** If a user hasn't reviewed a batch in 15 minutes and new transactions arrive, create a new batch instead of appending to the old one. This prevents batches from growing too large.

**Implementation Approach:**
- Add `batching_window_minutes` to `source_config` JSONB field
- When finding existing batches, check if the batch was created within the window
- If outside the window, create a new batch instead of appending
- Default behavior (no window) = append indefinitely until imported

**Configuration:**
```json
{
  "account_mappings": [...],
  "batching_window_minutes": 15
}
```

### 3. Auto-Approval for Trusted Transactions

**Proposed:** Automatically approve and import transactions that meet certain criteria:
- Have a suggested category (from AI categorization)
- Match a merchant/category rule the user has configured
- Are from trusted merchants/accounts

**Implementation Approach:**
- Add `auto_approve_rules` to `source_config`:
  ```json
  {
    "auto_approve_rules": {
      "enabled": true,
      "require_category": true,
      "require_merchant_match": false,
      "min_confidence": 0.8
    }
  }
  ```
- After queuing transactions, check if they meet auto-approval criteria
- If yes, automatically approve and import (still queue for review if criteria not met)
- Log auto-approved transactions for audit trail

**Benefits:**
- Reduces manual review workload
- Faster transaction import for routine transactions
- Users can still review auto-approved transactions if needed

### 4. Batch Consolidation UI

**Proposed:** Improve the batch display UI to:
- Group related batches visually (e.g., batches from same setup within time window)
- Show batch relationships (e.g., "Part of sync from 2:30 PM")
- Allow bulk actions (approve all batches from same sync)
- Filter/sort options (by date, by setup, by count)

**UI Enhancements:**
- Add collapsible groups for batches from same setup/time period
- Show batch metadata (webhook timestamp, number of accounts)
- Add "Approve All" button for related batches
- Better empty state when all transactions are duplicates

### 5. Smart Deduplication Notifications

**Proposed:** When a webhook creates a batch with all duplicate transactions (nothing new to import):
- Don't create a batch at all (or mark as "all duplicates")
- Show a summary notification: "Received 5 transactions from Teller, all were duplicates"
- Optionally log to import setup history

**Benefits:**
- Reduces queue clutter
- Users know syncs are working even when no new transactions
- Better visibility into import activity

### 6. Batch Preview Improvements

**Proposed:** Enhance the batch review page to:
- Show account breakdown (e.g., "3 transactions from Checking, 2 from Savings")
- Group transactions by account within batch
- Show webhook metadata (when received, how many accounts)
- Quick filters (show only transactions needing category, show duplicates, etc.)

## Configuration Options

Future configuration could be added to `source_config`:

```json
{
  "account_mappings": [...],
  "batching": {
    "window_minutes": 5,
    "group_by_account": false
  },
  "auto_approval": {
    "enabled": false,
    "require_category": true,
    "require_merchant_match": false
  },
  "notifications": {
    "notify_on_empty": false,
    "notify_on_duplicates": true
  }
}
```

## Migration Notes

The current implementation is backward compatible:
- Existing setups continue to work
- New webhooks automatically use the improved batching
- No database migrations required for the single-batch-per-webhook change

Future enhancements may require:
- Database migration for new configuration fields
- UI updates for new settings
- Migration script to update existing setups with default values

## Testing Recommendations

1. **Single Batch Per Webhook:**
   - Test webhook with multiple accounts → verify single batch created
   - Test webhook with single account → verify batch created normally
   - Test multiple webhooks → verify separate batches created

2. **Future Batching Window:**
   - Test webhooks within window → verify grouping
   - Test webhooks outside window → verify separate batches
   - Test edge cases (exactly at window boundary)

3. **Future Auto-Approval:**
   - Test transactions with categories → verify auto-approval
   - Test transactions without categories → verify queued for review
   - Test error handling (approval fails → fallback to queue)

