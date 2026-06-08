# Automatic Import Mapping Feature Plan

## Problem Statement

Currently, automatic imports (especially from Teller) automatically detect transaction types (income vs expense) but sometimes get it wrong. For example:
- Expenses are marked as income (showing green with positive numbers)
- Income is marked as expenses (showing red with negative numbers)

The system has no way to:
1. Change the mapping template/rules for automatic imports after they're created
2. Remap transactions that are already in the import queue
3. Update the automatic import setup so future imports use the corrected mapping

## Current State Analysis

### CSV-Based Automatic Imports (Email Attachments)
- ✅ Already store CSV data in `queued_imports.csv_data`
- ✅ Already have remap functionality via `/api/import/queue/[batchId]/remap` and `/api/import/queue/[batchId]/apply-remap`
- ✅ Can use CSV import templates (`csv_import_templates`)
- ❌ Remapping doesn't update the automatic import setup's mapping template
- ❌ No way to set a default template for an automatic import setup

### API-Based Automatic Imports (Teller, Plaid, etc.)
- ❌ Don't have CSV data (they're API-based)
- ❌ Transaction type is hardcoded: `const isIncome = parsedAmount > 0;` in `convertTellerTransactionToParsed`
- ❌ No way to configure transaction type detection rules per account/setup
- ❌ No way to remap already-queued transactions
- ✅ Store original transaction data in `queued_imports.original_data`

### Import Queue Behavior
- ✅ Automatic imports append to existing import queue if same account/import setup
- ✅ Same `source_batch_id` is reused for appending transactions
- ✅ Batch is identified by `source_batch_id` + `account_id` + `import_setup_id`

## Solution Overview

**Key Principle**: Reuse the existing CSV mapping/template system for ALL imports (CSV and API-based).

1. **CSV-Based Remapping** (Email imports): Use existing CSV remap flow, but also update the automatic import setup's template
2. **API-Based Remapping** (Teller, Plaid, etc.): Convert API transaction data to a "virtual CSV" format and use the SAME CSV mapping UI and template system

This approach:
- ✅ Reuses existing `/import/map-columns` page
- ✅ Reuses existing `csv_import_templates` table
- ✅ Reuses existing `amount_sign_convention` field (already supports `positive_is_expense` and `positive_is_income`)
- ✅ No duplicate code or UI
- ✅ Consistent user experience

## Database Changes

### Migration: Add Template Reference to Automatic Import Setups

**File**: `migrations/XXX_add_automatic_import_mapping.sql`

```sql
BEGIN;

-- Add template reference to automatic_import_setups
-- This works for BOTH CSV-based and API-based imports
-- For CSV imports: References the CSV template directly
-- For API imports: References a template created from API data (virtual CSV)
ALTER TABLE automatic_import_setups
  ADD COLUMN IF NOT EXISTS csv_mapping_template_id BIGINT REFERENCES csv_import_templates(id) ON DELETE SET NULL;

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_automatic_import_setups_template_id ON automatic_import_setups(csv_mapping_template_id);

-- Comments
COMMENT ON COLUMN automatic_import_setups.csv_mapping_template_id IS 'CSV import template to use for automatic imports. Works for both CSV-based (email) and API-based (Teller, Plaid) imports. For API imports, template stores amount_sign_convention and other mapping rules.';

COMMIT;
```

**Note**: For Teller multi-account setups, we'll store per-account template IDs in `source_config.account_mappings[].csv_mapping_template_id` (JSONB field, no schema change needed).

## API Changes

### 1. Update: `/api/import/queue/[batchId]/apply-remap`

**File**: `src/app/api/import/queue/[batchId]/apply-remap/route.ts`

**Changes**:
- After successfully remapping, check if `import_setup_id` points to an automatic import setup
- If it does, update the automatic import setup's `csv_mapping_template_id` to the new template
- This ensures future imports from this setup use the corrected template

**New Logic**:
```typescript
// After remapping transactions successfully...

// Check if this is an automatic import setup
const { data: importSetup } = await supabase
  .from('automatic_import_setups')
  .select('id, source_type, source_config')
  .eq('id', queuedImport.import_setup_id)
  .single();

if (importSetup && importSetup.source_type !== 'manual') {
  // Update the automatic import setup's template
  if (newTemplateId) {
    // For Teller multi-account setups, check if we need to update per-account mapping
    if (importSetup.source_type === 'teller' && importSetup.source_config?.account_mappings) {
      // Extract teller_account_id from batch (if available)
      // Update the specific account mapping's template_id
      // This will be handled in the remap flow
    }
    
    // Update global template
    await supabase
      .from('automatic_import_setups')
      .update({ csv_mapping_template_id: newTemplateId })
      .eq('id', importSetup.id);
  }
}
```

### 2. New API: `/api/automatic-imports/queue/[batchId]/remap-api`

**File**: `src/app/api/automatic-imports/queue/[batchId]/remap-api/route.ts`

**Purpose**: Convert API transaction data to virtual CSV format for remapping

**GET Request**:
- Returns virtual CSV data created from API transactions
- Returns current template if one exists

**Response**:
```typescript
{
  csvData: string[][], // Virtual CSV: [["Date", "Amount", "Description"], ["2024-01-01", "100.00", "Transaction 1"], ...]
  csvAnalysis: CSVAnalysisResult, // Analysis of virtual CSV
  csvFileName: string, // e.g., "Teller Account Transactions"
  currentMapping?: ColumnMapping, // Current template mapping if exists
  currentTemplateId?: number,
  currentTemplateName?: string,
  importSetupId: number,
  sourceType: string,
  tellerAccountId?: string, // For Teller multi-account setups
}
```

**Logic**:
1. Get all queued imports for this batch
2. Extract `original_data` from each queued import
3. Convert to virtual CSV format:
   ```typescript
   const csvData = [
     ['Date', 'Amount', 'Description'], // Header
     ...transactions.map(t => [
       t.transaction_date,
       t.original_data.amount, // Use original signed amount
       t.description
     ])
   ];
   ```
4. Analyze CSV structure (reuse existing `analyzeCSV` function)
5. Check for existing template (by fingerprint or import setup)
6. Return virtual CSV data + analysis + current template

### 3. Update: `/api/import/queue/[batchId]/remap` to Support API Imports

**File**: `src/app/api/import/queue/[batchId]/remap/route.ts`

**Changes**:
- Currently only handles CSV data
- Add logic to detect if batch is API-based (no CSV data but has `original_data`)
- If API-based, call conversion logic to create virtual CSV
- Return same format as CSV remap (so existing UI works)

### 4. Update: Teller Service - Use Template for Transaction Type

**File**: `src/lib/automatic-imports/providers/teller-service.ts`

**Changes**:
- Update `convertTellerTransactionToParsed` to accept optional `ColumnMapping` (specifically `amountSignConvention`)
- Use `amountSignConvention` from template instead of hardcoded logic

**New Function Signature**:
```typescript
export function convertTellerTransactionToParsed(
  tellerTransaction: TellerTransaction,
  accountId?: number,
  creditCardId?: number,
  mapping?: ColumnMapping // Optional mapping template
): ParsedTransaction
```

**Updated Logic**:
```typescript
const parsedAmount = parseFloat(tellerTransaction.amount);
const amount = Math.abs(parsedAmount);

// Use mapping template if provided, otherwise default to positive_is_expense
const amountSignConvention = mapping?.amountSignConvention || 'positive_is_expense';
const isIncome = amountSignConvention === 'positive_is_income'
  ? parsedAmount > 0
  : parsedAmount < 0; // positive_is_expense: negative amounts are income
```

- Update `fetchAndQueueTellerTransactions` to:
  1. Load template from `automatic_import_setups.csv_mapping_template_id` or account mapping
  2. Pass mapping to `convertTellerTransactionToParsed`

### 5. New Helper: Convert API Transactions to Virtual CSV

**File**: `src/lib/automatic-imports/api-to-csv-converter.ts` (new file)

**Purpose**: Convert API transaction data to virtual CSV format for remapping

**Function**:
```typescript
export function convertApiTransactionsToVirtualCSV(
  transactions: Array<{
    transaction_date: string;
    description: string;
    amount: number;
    original_data: any;
  }>,
  sourceType: string
): {
  csvData: string[][];
  fingerprint: string;
} {
  // Create CSV structure: Date, Amount (signed), Description
  const csvData = [
    ['Date', 'Amount', 'Description'],
    ...transactions.map(t => [
      t.transaction_date,
      t.original_data?.amount?.toString() || t.amount.toString(), // Use original signed amount
      t.description
    ])
  ];
  
  // Generate fingerprint based on source type and structure
  const fingerprint = `api-${sourceType}-standard`;
  
  return { csvData, fingerprint };
}
```

### 6. Update: Queue Manager - Store Virtual CSV for API Imports

**File**: `src/lib/automatic-imports/queue-manager.ts`

**Changes**:
- When queueing API-based transactions, also create and store virtual CSV data
- This enables remapping using existing CSV remap flow
- Store virtual CSV in `csv_data` field (same as CSV imports)

## Frontend Changes

### 1. Update: Batch Review Page - Unified Remap Button

**File**: `src/app/(dashboard)/imports/queue/[batchId]/page.tsx`

**Changes**:
- **No changes needed!** The existing "Remap CSV" button will work for both CSV and API imports
- The remap API will handle converting API data to virtual CSV automatically
- User experience is identical: click "Remap" → go to mapping page → adjust `amount_sign_convention` → save

### 2. Update: Mapping Page - Support Virtual CSV from API

**File**: `src/app/(dashboard)/import/map-columns/page.tsx`

**Changes**:
- **Minimal changes needed** - page already handles CSV data
- When remapping API imports:
  - Virtual CSV will have 3 columns: Date, Amount (signed), Description
  - User only needs to adjust `amount_sign_convention` (most important)
  - Other columns (date, description) are already correctly mapped
  - Show helpful message: "This is an API import. Adjust the amount sign convention below."

### 3. Update: Remap API Route - Auto-Detect and Convert

**File**: `src/app/api/import/queue/[batchId]/remap/route.ts`

**Changes**:
- Detect if batch has CSV data or needs virtual CSV conversion
- If no CSV data but has `original_data`, convert to virtual CSV
- Return same format as CSV remap (transparent to frontend)

**Logic**:
```typescript
// Check if CSV data exists
if (!queuedImport.csv_data && queuedImport.original_data) {
  // Convert API transactions to virtual CSV
  const { convertApiTransactionsToVirtualCSV } = await import('@/lib/automatic-imports/api-to-csv-converter');
  const virtualCSV = convertApiTransactionsToVirtualCSV(
    queuedImports.map(qi => ({
      transaction_date: qi.transaction_date,
      description: qi.description,
      amount: qi.amount,
      original_data: qi.original_data
    })),
    importSetup.source_type
  );
  
  // Use virtual CSV for remapping
  csvData = virtualCSV.csvData;
  // Analyze virtual CSV
  csvAnalysis = analyzeCSV(csvData);
}
```

### 4. Update: Apply Remap - Handle Virtual CSV

**File**: `src/app/api/import/queue/[batchId]/apply-remap/route.ts`

**Changes**:
- After remapping virtual CSV, re-process API transactions using new mapping
- Extract `original_data` from queued imports
- Re-run conversion with new `amountSignConvention`
- Queue corrected transactions

**Logic**:
```typescript
// After parsing CSV with new mapping...

// Check if this was originally an API import (has original_data)
if (queuedImport.original_data && !queuedImport.csv_file_name?.endsWith('.csv')) {
  // Re-process API transactions with new mapping
  const { convertTellerTransactionToParsed } = await import('@/lib/automatic-imports/providers/teller-service');
  
  const reprocessedTransactions = queuedImports.map(qi => {
    const originalTxn = typeof qi.original_data === 'string' 
      ? JSON.parse(qi.original_data) 
      : qi.original_data;
    
    // Re-convert with new mapping
    return convertTellerTransactionToParsed(
      originalTxn,
      qi.target_account_id || undefined,
      qi.target_credit_card_id || undefined,
      mapping // New mapping with corrected amountSignConvention
    );
  });
  
  // Use reprocessed transactions instead of CSV-parsed ones
  transactions = reprocessedTransactions;
}
```

## User Flow

### CSV-Based Automatic Import Remapping

1. User sees incorrect transactions in import queue
2. User clicks "Remap CSV" button
3. User is taken to mapping page with CSV data
4. User adjusts mapping (especially `amount_sign_convention`)
5. User saves mapping (optionally as template)
6. System applies remap:
   - Deletes old queued imports
   - Creates new queued imports with corrected mapping
   - Updates `automatic_import_setups.csv_mapping_template_id` if checkbox checked
7. Future imports from this setup use the new template

### API-Based Automatic Import Remapping (Teller)

1. User sees incorrect transactions in import queue (expenses marked as income)
2. User clicks "Remap CSV" button (same button as CSV imports!)
3. System automatically converts API transactions to virtual CSV format
4. User is taken to mapping page (`/import/map-columns`) with virtual CSV data
5. User adjusts `amount_sign_convention`:
   - Changes from "Positive amounts are income" to "Positive amounts are expenses"
   - (Other columns are already correctly mapped)
6. User saves mapping (optionally as template)
7. System applies remap:
   - Re-processes API transactions with new `amountSignConvention`
   - Deletes old queued imports
   - Creates new queued imports with corrected transaction types
   - Updates `automatic_import_setups.csv_mapping_template_id` if template saved
8. Future imports from this setup use the new template (with correct `amount_sign_convention`)

## Edge Cases & Considerations

### 1. Multi-Account Teller Setups
- Each account can have its own template
- Stored in `source_config.account_mappings[].csv_mapping_template_id`
- When remapping, user can choose:
  - Update this account only (saves template with account-specific fingerprint)
  - Update all accounts in this setup (updates global template)

### 2. Mixed Batches
- If batch contains transactions from multiple accounts (shouldn't happen, but handle gracefully)
- Show warning if remapping affects multiple accounts

### 3. Already Imported Transactions
- Remapping only affects queued imports
- Already imported transactions are not affected
- User can manually edit imported transactions if needed

### 4. Historical vs Current Transactions
- Remapping affects all transactions in the batch
- Future imports use the new rule
- Historical transactions already imported are not affected

### 5. Template Updates
- When remapping CSV imports, if user saves as template:
  - Update automatic import setup to use new template
  - Future imports automatically use this template

### 6. Backwards Compatibility
- Existing automatic import setups without templates use default behavior
- Default for Teller: `positive_is_expense` (current behavior) - matches existing code
- Default for CSV: Auto-detect (current behavior)
- When no template exists, system falls back to current hardcoded logic

## Testing Checklist

### CSV-Based Remapping
- [ ] Remap CSV import from email automatic import
- [ ] Verify automatic import setup template is updated
- [ ] Verify future imports use new template
- [ ] Verify remapping doesn't affect already imported transactions

### API-Based Remapping (Teller)
- [ ] Remap Teller import with incorrect transaction types
- [ ] Verify virtual CSV is created correctly
- [ ] Verify mapping page works with virtual CSV
- [ ] Verify transactions are re-processed correctly with new `amount_sign_convention`
- [ ] Verify automatic import setup template is updated
- [ ] Verify future imports use new template
- [ ] Test multi-account setup: remap one account vs all accounts
- [ ] Verify remapping doesn't affect already imported transactions

### Edge Cases
- [ ] Remap batch with mixed transaction types
- [ ] Remap batch with duplicates
- [ ] Remap batch with historical transactions
- [ ] Remap when user doesn't have edit permissions
- [ ] Remap when batch is being processed

## Implementation Order

1. **Database Migration**: Add `csv_mapping_template_id` to `automatic_import_setups`
2. **Backend - API to CSV Converter**: Create helper to convert API transactions to virtual CSV
3. **Backend - Remap API**: Update `/api/import/queue/[batchId]/remap` to auto-detect and convert API imports
4. **Backend - Apply Remap**: Update `/api/import/queue/[batchId]/apply-remap` to re-process API transactions
5. **Backend - Teller Service**: Update to use template's `amountSignConvention` instead of hardcoded logic
6. **Backend - Queue Manager**: Store virtual CSV data when queueing API transactions
7. **Backend - CSV Remap**: Update to also update automatic import setup template
8. **Frontend - Mapping Page**: Add helpful message for API imports (optional, minor UX improvement)
9. **Testing**: Test both CSV and API remapping flows
10. **Documentation**: Update user guides

## Future Enhancements

1. **Field-Based Rules**: Extend `amount_sign_convention` to support field-based detection (e.g., use `type` field: "credit" = income, "debit" = expense)
2. **Pattern Matching**: Support rules based on description patterns
3. **Machine Learning**: Auto-detect correct `amount_sign_convention` based on user corrections
4. **Bulk Remapping**: Allow remapping multiple batches at once
5. **Template Sharing**: Allow sharing templates across users/accounts
6. **Virtual CSV Enhancements**: Add more columns to virtual CSV (e.g., transaction type field if available in API)


