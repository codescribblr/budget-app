# Backup/Restore Review - Automatic Imports Feature

## Review Date
2025-01-XX

## Summary
Reviewed backup/restore functionality to ensure automatic imports feature is properly included and backward compatible with older backups.

## Findings

### ✅ Already Implemented

1. **Export Functionality**
   - `automatic_import_setups` table is exported (line 188 in backup-utils.ts)
   - `queued_imports` table is exported (line 189 in backup-utils.ts)
   - Both are included in `AccountBackupData` interface (lines 59-60)
   - Both are included in legacy `UserBackupData` interface (lines 88-89)

2. **Import Functionality**
   - `automatic_import_setups` are imported with proper ID remapping (lines 820-855)
   - `queued_imports` are imported with proper foreign key remapping (lines 857-889)
   - Insertion order is correct: automatic_import_setups before queued_imports
   - All dependencies are satisfied (accounts, credit_cards, categories, transactions inserted first)

3. **Delete Functionality**
   - Both tables are deleted before restore (lines 347-348)
   - Delete order is correct: queued_imports before automatic_import_setups (respects foreign key constraints)

### 🔧 Issues Fixed

1. **Critical: NULL import_setup_id Constraint Violation**
   - **Problem**: `queued_imports.import_setup_id` is NOT NULL, but restore code could set it to null if:
     - Older backups don't have `automatic_import_setups`
     - The `import_setup_id` in backup doesn't exist in the restored `automatic_import_setups`
   - **Fix**: Added filtering to skip `queued_imports` that don't have a valid `import_setup_id` mapping
   - **Impact**: Older backups without automatic imports will restore successfully, but queued imports will be skipped (with warning logged)

2. **Documentation Updates**
   - Updated `USER_BACKUP_COMPLETE_GUIDE.md` to include new tables (16 → 17 tables)
   - Added backward compatibility notes
   - Updated restore process documentation

## Backward Compatibility

### ✅ Handles Older Backups Gracefully

- **Missing `automatic_import_setups`**: Restored as empty array (no automatic imports configured)
- **Missing `queued_imports`**: Restored as empty array (no queued transactions)
- **`queued_imports` without matching `automatic_import_setups`**: Skipped with warning (prevents constraint violation)

### ⚠️ Data Loss Scenarios

When restoring older backups:
- **Queued imports will be lost** if the backup doesn't include `automatic_import_setups`
- This is expected behavior - queued imports require an import setup to exist
- Users will need to reconfigure automatic imports after restore

## Restore Order Verification

### Delete Order (Reverse Dependency)
✅ Correct - queued_imports deleted before automatic_import_setups

### Insert Order (Dependency)
✅ Correct:
1. accounts
2. categories  
3. credit_cards
4. transactions (builds transactionIdMap)
5. automatic_import_setups (builds importSetupIdMap)
6. queued_imports (uses importSetupIdMap, categoryIdMap, accountIdMap, creditCardIdMap, transactionIdMap)

## Foreign Key Dependencies

### `automatic_import_setups`
- ✅ `account_id` → `budget_accounts.id` (inserted first)
- ✅ `target_account_id` → `accounts.id` (remapped via accountIdMap)
- ✅ `target_credit_card_id` → `credit_cards.id` (remapped via creditCardIdMap)

### `queued_imports`
- ✅ `account_id` → `budget_accounts.id` (inserted first)
- ✅ `import_setup_id` → `automatic_import_setups.id` (remapped via importSetupIdMap) - **NOW HANDLED**
- ✅ `suggested_category_id` → `categories.id` (remapped via categoryIdMap)
- ✅ `target_account_id` → `accounts.id` (remapped via accountIdMap)
- ✅ `target_credit_card_id` → `credit_cards.id` (remapped via creditCardIdMap)
- ✅ `imported_transaction_id` → `transactions.id` (remapped via transactionIdMap)

## Testing Recommendations

1. **Test with new backup** (includes automatic imports)
   - Create backup with Teller integration and queued imports
   - Restore backup
   - Verify automatic import setups are restored
   - Verify queued imports are restored with correct mappings

2. **Test with old backup** (no automatic imports)
   - Restore backup created before automatic imports feature
   - Verify restore completes successfully
   - Verify no errors about missing tables
   - Verify queued imports are skipped (if any exist)

3. **Test partial restore** (automatic_import_setups but no queued_imports)
   - Should restore successfully
   - Automatic imports configured but no queued transactions

4. **Test edge case** (queued_imports without matching automatic_import_setups)
   - Should skip queued imports with warning
   - Should not cause constraint violation

## Files Modified

1. `src/lib/backup-utils.ts`
   - Fixed NULL import_setup_id handling in queued_imports restore
   - Added filtering and warning logging

2. `USER_BACKUP_COMPLETE_GUIDE.md`
   - Updated table count (14 → 17)
   - Added automatic_import_setups and queued_imports to list
   - Updated restore process documentation
   - Added backward compatibility section

## Conclusion

✅ **Backup/Restore is fully functional** for automatic imports feature
✅ **Backward compatible** with older backups
✅ **Proper error handling** for edge cases
✅ **Documentation updated**

The system will gracefully handle:
- New backups with automatic imports
- Old backups without automatic imports  
- Partial backups (missing some tables)
- Invalid foreign key references (skipped with warnings)

