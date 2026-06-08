# Duplicate Merge and Import Integration

## Problem Statement

When merging duplicate transactions, we need to ensure that:
1. The merged transaction retains links to all original import records
2. Duplicate detection continues to work for all original transaction hashes
3. Re-importing the same transaction (by any of its original hashes) is prevented

## Current Architecture

### Import Duplicate Detection
- Uses `imported_transactions` table to store transaction hashes
- Checks for duplicates by querying `imported_transactions` by hash
- Links `imported_transactions` to `transactions` via `imported_transaction_links`
- When importing, if a hash exists in `imported_transactions`, the transaction is marked as duplicate

### Merge Process (Before Fix)
- Merged transactions were deleted
- `imported_transaction_links` for merged transactions were deleted
- `imported_transactions` records were preserved (good for duplicate detection)
- **Problem**: Links were deleted but not recreated, leaving orphaned `imported_transactions` records

## Solution

### Updated Merge Process
When merging transactions (e.g., Transaction A + B → Merged A):

1. **Collect all import links**: Before deleting anything, collect all `imported_transaction_id`s from ALL transactions being merged (including the base transaction)

2. **Delete merged transactions**: Delete the transactions being merged (not the base)

3. **Delete old links**: Delete all `imported_transaction_links` for both base and merged transactions

4. **Recreate links**: Create new `imported_transaction_links` from ALL collected `imported_transaction_id`s to the merged transaction

### Benefits
- ✅ All original hashes remain linked to the merged transaction
- ✅ Duplicate detection works for all original transaction hashes
- ✅ Re-importing any of the original transactions is prevented
- ✅ Import metadata (original row data, filename) is preserved for all merged transactions
- ✅ Transaction detail dialog shows all import sources

## Implementation Details

### Code Changes
- Updated `src/app/api/transactions/merge-duplicates/route.ts`
- Added Step 5: Collect all `imported_transaction_id`s before deletion
- Added Step 7: Re-link all `imported_transaction_id`s to merged transaction

### Database Schema
- `imported_transactions`: Stores transaction hashes and metadata (preserved)
- `imported_transaction_links`: Links `imported_transactions` to `transactions` (recreated on merge)
- `transactions`: The actual transaction records (merged/deleted)

## Example Scenario

**Before Merge:**
- Transaction A (hash: abc123) ← linked to imported_transaction #1
- Transaction B (hash: def456) ← linked to imported_transaction #2

**After Merge (A + B → Merged A):**
- Merged Transaction A ← linked to imported_transaction #1 AND #2
- Transaction B (deleted)
- Both hashes (abc123, def456) remain in `imported_transactions` and are linked to Merged A

**Re-import Attempt:**
- Importing transaction with hash abc123 → Detected as duplicate ✅
- Importing transaction with hash def456 → Detected as duplicate ✅
- Both point to the same merged transaction

## Testing Checklist

- [ ] Merge two transactions with different import sources
- [ ] Verify both import records are linked to merged transaction
- [ ] Re-import one of the original transactions → Should be detected as duplicate
- [ ] Re-import the other original transaction → Should be detected as duplicate
- [ ] Verify transaction detail dialog shows all import sources
- [ ] Verify duplicate finder still works correctly after merge


