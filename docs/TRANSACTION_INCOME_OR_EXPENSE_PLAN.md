# Transaction Income or Expense Feature - Implementation Plan

## Overview

This document outlines the comprehensive plan to add income/expense classification to transactions. Currently, all transactions are treated as expenses (positive amounts reduce category balances). This feature will allow transactions to be marked as either income or expense, enabling proper handling of refunds, transfers, and other income sources.

## Goals

1. Add `transaction_type` field to transactions table (values: 'income' | 'expense')
2. Update CSV import system to handle different bank formats for income/expense
3. Migrate existing transaction data (negative amounts → income, positive amounts → expense)
4. Update UI to display amounts with color coding (red for expense, green for income)
5. Ensure category balance calculations respect transaction type
6. Maintain backward compatibility and data integrity

## Current State Analysis

### Database Schema
- `transactions` table: Contains `total_amount` (DECIMAL), always positive currently
- `transaction_splits` table: Contains `amount` (DECIMAL), always positive currently
- Category balances are updated by subtracting split amounts: `current_balance - split.amount`
- CSV import templates store column mappings but no transaction type mapping

### Current Behavior
- All transactions reduce category balances (expense behavior)
- Amounts are stored as positive numbers
- CSV imports handle debit/credit columns but don't distinguish income vs expense
- UI displays all amounts as positive numbers

### Key Files
- `migrations/001_initial_schema.sql` - Initial transaction schema
- `src/lib/types.ts` - TypeScript interfaces
- `src/lib/supabase-queries.ts` - Transaction CRUD operations
- `src/lib/csv-parser.ts` - CSV parsing logic
- `src/lib/csv-parser-helpers.ts` - CSV parsing helpers
- `src/lib/mapping-templates.ts` - Column mapping types
- `src/components/transactions/TransactionList.tsx` - Transaction display
- `migrations/011_csv_import_templates.sql` - Import template schema

## Implementation Plan

### Phase 1: Database Schema Changes

#### 1.1 Add transaction_type Column
**Migration File**: `migrations/037_add_transaction_type_to_transactions.sql`

```sql
-- Migration: 037_add_transaction_type_to_transactions.sql
-- Description: Add transaction_type column to transactions table
-- Date: [CURRENT_DATE]

-- Add transaction_type column with default 'expense' for backward compatibility
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'expense'
CHECK (transaction_type IN ('income', 'expense'));

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_type ON transactions(transaction_type);

-- Add comment for documentation
COMMENT ON COLUMN transactions.transaction_type IS 'Type of transaction: income adds to category balances, expense subtracts from category balances';
```

**Rationale**: 
- Default to 'expense' ensures existing queries continue to work
- CHECK constraint enforces valid values
- Index improves query performance for filtering by type

#### 1.2 Update Supabase Schema
Update `supabase-schema.sql` to include the new column in the transactions table definition.

#### 1.3 Data Migration Strategy
**Migration File**: `migrations/038_migrate_existing_transactions_to_type.sql`

**Critical Requirement**: This migration must NOT change category balances. We're only adding metadata.

```sql
-- Migration: 038_migrate_existing_transactions_to_type.sql
-- Description: Migrate existing transactions: negative amounts → income, positive → expense
-- Date: [CURRENT_DATE]
-- IMPORTANT: This migration does NOT recalculate category balances
-- It only adds the transaction_type metadata based on current amount signs

-- Strategy: 
-- 1. Transactions with negative total_amount → income (then make amount positive)
-- 2. Transactions with positive total_amount → expense (keep positive)
-- 3. Update transaction_splits amounts to be positive (absolute value)

BEGIN;

-- Step 1: Update transactions table
-- Mark negative amounts as income, positive as expense
UPDATE transactions
SET transaction_type = CASE 
  WHEN total_amount < 0 THEN 'income'
  ELSE 'expense'
END,
total_amount = ABS(total_amount)
WHERE transaction_type = 'expense'; -- Only update rows that haven't been migrated yet

-- Step 2: Update transaction_splits amounts to be positive
-- This ensures consistency: all amounts stored as positive, type determines behavior
UPDATE transaction_splits
SET amount = ABS(amount);

-- Verify: Check that all amounts are now positive
DO $$
DECLARE
  negative_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO negative_count
  FROM transactions
  WHERE total_amount < 0;
  
  IF negative_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: Found % transactions with negative amounts', negative_count;
  END IF;
END $$;

COMMIT;
```

**Safety Measures**:
- Use transaction (BEGIN/COMMIT) for atomicity
- Only update rows that haven't been migrated (WHERE transaction_type = 'expense')
- Verify no negative amounts remain
- Document that category balances are NOT recalculated

### Phase 2: TypeScript Type Updates

#### 2.1 Update Transaction Interface
**File**: `src/lib/types.ts`

```typescript
export interface Transaction {
  id: number;
  date: string;
  description: string;
  total_amount: number; // Always positive
  transaction_type: 'income' | 'expense'; // NEW FIELD
  merchant_group_id?: number | null;
  account_id?: number | null;
  credit_card_id?: number | null;
  is_historical: boolean;
  created_at: string;
  updated_at: string;
}
```

#### 2.2 Update Request Types
**File**: `src/lib/types.ts`

```typescript
export interface CreateTransactionRequest {
  date: string;
  description: string;
  transaction_type?: 'income' | 'expense'; // Optional, defaults to 'expense'
  is_historical?: boolean;
  account_id?: number | null;
  credit_card_id?: number | null;
  splits: {
    category_id: number;
    amount: number; // Always positive
  }[];
}

export interface UpdateTransactionRequest {
  date?: string;
  description?: string;
  transaction_type?: 'income' | 'expense'; // NEW FIELD
  merchant_group_id?: number | null;
  account_id?: number | null;
  credit_card_id?: number | null;
  splits?: {
    category_id: number;
    amount: number; // Always positive
  }[];
}
```

### Phase 3: CSV Import System Updates

#### 3.1 Add transaction_type Column to Import Templates
**Migration File**: `migrations/039_add_transaction_type_to_import_templates.sql`

```sql
-- Migration: 039_add_transaction_type_to_import_templates.sql
-- Description: Add transaction_type_column to csv_import_templates
-- Date: [CURRENT_DATE]

-- Add transaction_type_column to store which CSV column indicates income/expense
ALTER TABLE csv_import_templates 
ADD COLUMN IF NOT EXISTS transaction_type_column INTEGER;

-- Add amount_sign_convention to handle different bank formats
-- 'positive_is_expense': positive amounts are expenses (most common)
-- 'positive_is_income': positive amounts are income (less common)
-- 'separate_column': use transaction_type_column to determine type
-- 'separate_debit_credit': use debit_column and credit_column to determine type and amount
ALTER TABLE csv_import_templates 
ADD COLUMN IF NOT EXISTS amount_sign_convention TEXT 
CHECK (amount_sign_convention IN ('positive_is_expense', 'positive_is_income', 'separate_column', 'separate_debit_credit'))
DEFAULT 'positive_is_expense';

COMMENT ON COLUMN csv_import_templates.transaction_type_column IS 'Column index that contains transaction type (e.g., "DEBIT", "CREDIT", "INCOME", "EXPENSE"). Used when amount_sign_convention is "separate_column"';
COMMENT ON COLUMN csv_import_templates.amount_sign_convention IS 'How to interpret amount signs: positive_is_expense (default), positive_is_income, separate_column, or separate_debit_credit';
```

**Note**: The `separate_debit_credit` convention handles banks that provide separate debit and credit columns. When both `debitColumn` and `creditColumn` are mapped:
- If debit column has a value → expense transaction, use debit amount
- If credit column has a value → income transaction, use credit amount
- Only one column should have a value per row (mutually exclusive)

#### 3.2 Update ColumnMapping Interface
**File**: `src/lib/mapping-templates.ts`

```typescript
export interface ColumnMapping {
  dateColumn: number | null;
  amountColumn: number | null;
  descriptionColumn: number | null;
  debitColumn: number | null;
  creditColumn: number | null;
  transactionTypeColumn: number | null; // NEW: Column with "INCOME", "EXPENSE", "DEBIT", "CREDIT", etc.
  amountSignConvention: 'positive_is_expense' | 'positive_is_income' | 'separate_column' | 'separate_debit_credit'; // NEW
  dateFormat: string | null;
  hasHeaders: boolean;
  skipRows?: number;
}
```

**Important**: When `amountSignConvention` is `'separate_debit_credit'`:
- `debitColumn` and `creditColumn` must both be mapped
- `amountColumn` is ignored (amount comes from debit or credit column)
- Each row should have a value in either debit OR credit column (not both)

#### 3.3 Update CSV Parser Logic
**File**: `src/lib/csv-parser-helpers.ts`

**Function**: `parseRowWithMapping`

Add logic to handle four different conventions:
1. **`positive_is_expense`**: Positive amounts are expenses, negative are income
2. **`positive_is_income`**: Positive amounts are income, negative are expenses
3. **`separate_column`**: Use transactionTypeColumn to determine type
4. **`separate_debit_credit`**: Use debitColumn and creditColumn (NEW)

**Key Logic**:
```typescript
function parseRowWithMapping(
  row: string[],
  mapping: ColumnMapping,
  fileName: string
): ParsedTransaction | null {
  // ... existing date/description parsing ...

  let amount = 0;
  let transaction_type: 'income' | 'expense' = 'expense';

  // Handle different amount conventions
  if (mapping.amountSignConvention === 'separate_debit_credit') {
    // NEW: Handle separate debit/credit columns
    if (mapping.debitColumn === null || mapping.creditColumn === null) {
      throw new Error('Both debit and credit columns must be mapped for separate_debit_credit convention');
    }

    const debitValue = parseAmount(row[mapping.debitColumn] || '0');
    const creditValue = parseAmount(row[mapping.creditColumn] || '0');

    if (debitValue > 0 && creditValue > 0) {
      console.warn(`Row has both debit and credit values, using debit. Row: ${row.join(',')}`);
      amount = debitValue;
      transaction_type = 'expense';
    } else if (debitValue > 0) {
      amount = debitValue;
      transaction_type = 'expense';
    } else if (creditValue > 0) {
      amount = creditValue;
      transaction_type = 'income';
    } else {
      // Both are zero or empty, skip this row
      return null;
    }
  } else if (mapping.amountSignConvention === 'separate_column') {
    // Use transaction type column
    const transactionTypeValue = mapping.transactionTypeColumn !== null
      ? row[mapping.transactionTypeColumn]?.trim() || null
      : null;

    // Get amount from amountColumn
    if (mapping.amountColumn === null) {
      throw new Error('Amount column must be mapped');
    }
    amount = parseAmount(row[mapping.amountColumn]);

    transaction_type = determineTransactionTypeFromColumn(transactionTypeValue, amount);
    amount = Math.abs(amount); // Normalize to positive
  } else {
    // Use amount column with sign convention
    if (mapping.amountColumn === null) {
      throw new Error('Amount column must be mapped');
    }
    amount = parseAmount(row[mapping.amountColumn]);

    if (mapping.amountSignConvention === 'positive_is_expense') {
      transaction_type = amount >= 0 ? 'expense' : 'income';
    } else { // positive_is_income
      transaction_type = amount >= 0 ? 'income' : 'expense';
    }
    amount = Math.abs(amount); // Normalize to positive
  }

  // ... rest of parsing logic ...
}

function determineTransactionTypeFromColumn(
  transactionTypeValue: string | null,
  fallbackAmount: number
): 'income' | 'expense' {
  if (transactionTypeValue) {
    const normalized = transactionTypeValue.toUpperCase().trim();
    if (['INCOME', 'CREDIT', 'CR', 'DEPOSIT', '+'].includes(normalized)) {
      return 'income';
    }
    if (['EXPENSE', 'DEBIT', 'DB', 'WITHDRAWAL', '-'].includes(normalized)) {
      return 'expense';
    }
  }
  
  // Fallback to amount sign if column value unclear
  return fallbackAmount >= 0 ? 'expense' : 'income';
}
```

**Important Notes**:
- When using `separate_debit_credit`, the amount comes from whichever column has a value
- Debit column → expense, Credit column → income
- Amount is always stored as positive, transaction_type determines behavior

#### 3.4 Update ParsedTransaction Interface
**File**: `src/lib/import-types.ts`

```typescript
export interface ParsedTransaction {
  id: string;
  date: string;
  description: string;
  merchant: string;
  amount: number; // Always positive
  transaction_type: 'income' | 'expense'; // NEW FIELD
  originalData: string;
  hash: string;
  suggestedCategory?: number;
  account_id?: number | null;
  credit_card_id?: number | null;
  isDuplicate: boolean;
  duplicateType?: 'database' | 'within-file' | null;
  duplicateOf?: number;
  status: 'pending' | 'confirmed' | 'excluded';
  splits: TransactionSplit[];
  forceImport?: boolean;
}
```

#### 3.5 Update Column Mapping UI
**File**: `src/app/(dashboard)/import/map-columns/page.tsx`

Add UI elements for:
1. Transaction Type Column dropdown (optional)
2. Amount Sign Convention radio buttons:
   - "Positive amounts are expenses" (default)
   - "Positive amounts are income"
   - "Use separate transaction type column"

**UI Flow**:
- If user selects "Use separate transaction type column", show Transaction Type Column dropdown
- Otherwise, hide it and use amount sign convention

### Phase 4: Transaction CRUD Operations

#### 4.1 Update createTransaction Function
**File**: `src/lib/supabase-queries.ts`

**Changes**:
1. Accept `transaction_type` parameter (default: 'expense')
2. Store `transaction_type` in database
3. Update category balance logic:
   - Income: `current_balance + split.amount`
   - Expense: `current_balance - split.amount`

**Key Logic**:
```typescript
// Update category balance based on transaction type
const balanceChange = transaction_type === 'income' 
  ? split.amount  // Income adds to balance
  : -split.amount; // Expense subtracts from balance

const { error: balanceError } = await supabase
  .from('categories')
  .update({
    current_balance: Number(category.current_balance) + balanceChange,
    updated_at: new Date().toISOString(),
  })
  .eq('id', split.category_id);
```

#### 4.2 Update updateTransaction Function
**File**: `src/lib/supabase-queries.ts`

**Changes**:
1. Handle `transaction_type` updates
2. When reversing old splits, use old transaction_type
3. When applying new splits, use new transaction_type
4. If transaction_type changes, recalculate balance impact

**Key Logic**:
```typescript
// Reverse old splits (using old transaction_type)
for (const split of existingTransaction.splits) {
  const oldBalanceChange = existingTransaction.transaction_type === 'income'
    ? -split.amount  // Reverse income: subtract
    : split.amount;   // Reverse expense: add back
  
  // Update balance
}

// Apply new splits (using new transaction_type)
for (const split of newSplits) {
  const newBalanceChange = newTransactionType === 'income'
    ? split.amount   // Income adds
    : -split.amount;  // Expense subtracts
  
  // Update balance
}
```

#### 4.3 Update deleteTransaction Function
**File**: `src/lib/supabase-queries.ts`

**Changes**:
1. Reverse balance changes based on transaction_type
2. Income transactions: subtract from balance
3. Expense transactions: add back to balance

**Key Logic**:
```typescript
// Reverse the transaction's impact on category balances
const balanceChange = transaction.transaction_type === 'income'
  ? -split.amount  // Reverse income: subtract
  : split.amount;   // Reverse expense: add back
```

#### 4.4 Update importTransactions Function
**File**: `src/lib/supabase-queries.ts`

**Changes**:
1. Include `transaction_type` when creating transactions
2. Update category balance calculation to respect transaction_type
3. Batch balance updates efficiently

**Key Logic**:
```typescript
// Accumulate balance updates by category and transaction type
const categoryBalanceUpdates = new Map<number, number>(); // categoryId -> net change

validTransactions.forEach((txn) => {
  txn.splits.forEach((split: any) => {
    const balanceChange = txn.transaction_type === 'income'
      ? split.amount
      : -split.amount;
    
    const currentTotal = categoryBalanceUpdates.get(split.categoryId) || 0;
    categoryBalanceUpdates.set(split.categoryId, currentTotal + balanceChange);
  });
});

// Batch update category balances
categoryBalanceUpdates.forEach((netChange, categoryId) => {
  // Update balance: current_balance + netChange
});
```

### Phase 5: API Endpoints

#### 5.1 Update Transaction API Routes
**Files**: 
- `src/app/api/transactions/route.ts` (POST)
- `src/app/api/transactions/[id]/route.ts` (PUT, DELETE)

**Changes**:
1. Accept `transaction_type` in request body
2. Validate transaction_type is 'income' or 'expense'
3. Pass transaction_type to database functions

#### 5.2 Update Import Template API
**File**: `src/app/api/import/templates/route.ts`

**Changes**:
1. Accept `transaction_type_column` and `amount_sign_convention` in request
2. Store in database
3. Return in response

### Phase 6: UI Updates

#### 6.1 Transaction List Display
**File**: `src/components/transactions/TransactionList.tsx`

**Changes**:
1. Display amounts with color coding:
   - Expense: Red text (`text-red-600` or similar)
   - Income: Green text (`text-green-600` or similar)
2. Always show positive numbers (amounts are already stored as positive)
3. No additional column needed (color indicates type)

**Implementation**:
```typescript
<TableCell className={`text-right font-semibold text-sm whitespace-nowrap ${
  transaction.transaction_type === 'income' 
    ? 'text-green-600' 
    : 'text-red-600'
}`}>
  {formatCurrency(transaction.total_amount)}
</TableCell>
```

#### 6.2 Transaction Edit Dialog
**File**: `src/components/transactions/EditTransactionDialog.tsx`

**Changes**:
1. Add transaction type selector (radio buttons or dropdown)
2. Default to existing transaction_type
3. Update form validation
4. Show preview of balance impact

#### 6.3 Transaction Create Dialog
**File**: `src/components/transactions/AddTransactionDialog.tsx` (or similar)

**Changes**:
1. Add transaction type selector
2. Default to 'expense'
3. Update form to handle transaction_type

#### 6.4 Import Preview
**File**: `src/components/import/TransactionPreview.tsx`

**Changes**:
1. Display transaction_type in preview table
2. Color code amounts (red/green)
3. Show transaction_type column if available
4. Allow editing transaction_type before import

#### 6.5 Column Mapping Page
**File**: `src/app/(dashboard)/import/map-columns/page.tsx`

**Changes**:
1. Add "Transaction Type Column" dropdown (optional)
2. Add "Amount Sign Convention" radio group:
   - "Positive amounts are expenses" (default)
   - "Positive amounts are income"
   - "Use separate transaction type column"
   - "Use separate debit and credit columns" (NEW)
3. Show/hide transaction type column dropdown based on convention selection
4. When "separate debit and credit columns" is selected:
   - Ensure both debitColumn and creditColumn are mapped
   - Show helpful message explaining the convention
   - Validate that both columns are mapped before proceeding
5. Save these settings in template

**UI Flow**:
- If user selects "Use separate debit and credit columns":
  - Show validation that both debit and credit columns are mapped
  - Hide amount column requirement (amount comes from debit/credit columns)
  - Show info message: "Debit amounts = expenses, Credit amounts = income"
- If user selects "Use separate transaction type column":
  - Show Transaction Type Column dropdown
  - Require amount column mapping
- Otherwise:
  - Require amount column mapping
  - Hide transaction type column dropdown

### Phase 7: Reporting Updates

#### 7.1 Update Spending Reports
**Files**:
- `src/components/reports/SpendingByCategory.tsx`
- `src/components/reports/trends/MonthlySpendingTrend.tsx`
- `src/components/reports/trends/BudgetVsActualTrend.tsx`
- `src/components/reports/trends/SpendingVelocityTrend.tsx`

**Changes**: All spending calculations must account for transaction_type:
- **Expenses**: Add to spending totals
- **Income**: Subtract from spending totals (or exclude from spending reports)

**Key Logic**:
```typescript
// OLD: All amounts added together
transactions.forEach(transaction => {
  transaction.splits.forEach(split => {
    const current = categorySpending.get(split.category_id) || 0;
    categorySpending.set(split.category_id, current + split.amount);
  });
});

// NEW: Account for transaction_type
transactions.forEach(transaction => {
  transaction.splits.forEach(split => {
    const current = categorySpending.get(split.category_id) || 0;
    const amount = transaction.transaction_type === 'expense'
      ? split.amount      // Expenses add to spending
      : -split.amount;     // Income subtracts from spending
    categorySpending.set(split.category_id, current + amount);
  });
});
```

#### 7.2 Update Merchant Reports
**Files**:
- `src/components/reports/TransactionsByMerchant.tsx`
- `src/lib/db/merchant-groups.ts` (getMerchantGroupStats)

**Changes**: Merchant totals must account for transaction_type:
- Expenses add to merchant totals
- Income subtracts from merchant totals (or shown separately)

**Key Logic**:
```typescript
// OLD: All amounts added
merchantSpending.forEach(transaction => {
  const current = merchantSpending.get(transaction.description) || { count: 0, total: 0 };
  merchantSpending.set(transaction.description, {
    count: current.count + 1,
    total: current.total + transaction.total_amount,
  });
});

// NEW: Account for transaction_type
filteredTransactions.forEach(transaction => {
  const current = merchantSpending.get(transaction.description) || { count: 0, total: 0 };
  const amount = transaction.transaction_type === 'expense'
    ? transaction.total_amount
    : -transaction.total_amount;
  merchantSpending.set(transaction.description, {
    count: current.count + 1,
    total: current.total + amount,
  });
});
```

#### 7.3 Update Income Reports
**File**: `src/app/(dashboard)/income/page.tsx`

**Changes**: Income reports should:
- Only count income transactions
- Show income by category
- Exclude expenses from income totals

**Key Logic**:
```typescript
// Calculate income by category
const incomeByCategory = new Map<number, number>();
transactions
  .filter(t => t.transaction_type === 'income')
  .forEach(transaction => {
    transaction.splits.forEach(split => {
      const current = incomeByCategory.get(split.category_id) || 0;
      incomeByCategory.set(split.category_id, current + split.amount);
    });
  });
```

#### 7.4 Update Net Calculations
**Files**: Any reports showing net income/expense

**Changes**: Net calculations should:
- Income transactions: add to net
- Expense transactions: subtract from net

**Key Logic**:
```typescript
const netAmount = transactions.reduce((sum, transaction) => {
  const amount = transaction.transaction_type === 'income'
    ? transaction.total_amount
    : -transaction.total_amount;
  return sum + amount;
}, 0);
```

#### 7.5 Reporting Checklist
- [ ] Update SpendingByCategory to account for transaction_type
- [ ] Update MonthlySpendingTrend to account for transaction_type
- [ ] Update BudgetVsActualTrend to account for transaction_type
- [ ] Update SpendingVelocityTrend to account for transaction_type
- [ ] Update TransactionsByMerchant to account for transaction_type
- [ ] Update MerchantGroupStats to account for transaction_type
- [ ] Update Income page to only show income transactions
- [ ] Update any net income/expense calculations
- [ ] Test all reports with mixed income/expense transactions
- [ ] Verify report totals match expected values

### Phase 8: Data Backup and Rollback

#### 7.1 Pre-Migration Backup
**Script**: `scripts/backup-before-transaction-type-migration.sh`

Create backup of:
- `transactions` table
- `transaction_splits` table
- `categories` table (for balance verification)
- `csv_import_templates` table

#### 7.2 Rollback Plan
**Documentation**: `docs/TRANSACTION_TYPE_ROLLBACK_PLAN.md`

Steps to rollback:
1. Restore database from backup
2. Revert code changes
3. Redeploy previous version

### Phase 9: Testing Strategy

#### 9.1 Unit Tests
- Transaction type determination logic
- CSV parsing with different conventions
- Balance calculation (income vs expense)

#### 9.2 Integration Tests
- Create transaction (income and expense)
- Update transaction (change type)
- Delete transaction (verify balance reversal)
- CSV import with different formats

#### 9.3 Migration Tests
- Verify all existing transactions have correct type
- Verify no negative amounts remain
- Verify category balances unchanged (critical!)

#### 9.4 Manual Testing Checklist
- [ ] Create income transaction → verify balance increases
- [ ] Create expense transaction → verify balance decreases
- [ ] Edit transaction type → verify balance recalculates correctly
- [ ] Delete income transaction → verify balance decreases
- [ ] Delete expense transaction → verify balance increases
- [ ] CSV import with positive_is_expense convention
- [ ] CSV import with positive_is_income convention
- [ ] CSV import with separate transaction type column
- [ ] CSV import with separate debit/credit columns (NEW)
- [ ] Verify UI color coding (red/green)
- [ ] Verify amounts always display as positive
- [ ] Test spending reports with mixed income/expense transactions
- [ ] Test merchant reports with mixed income/expense transactions
- [ ] Test income reports only show income transactions
- [ ] Verify all report totals are correct

### Phase 10: Documentation Updates

#### 10.1 User Documentation
- Update CSV import guide with transaction type mapping
- Document how to handle different bank formats
- Explain income vs expense transactions

#### 10.2 Developer Documentation
- Update API documentation
- Document transaction_type field
- Document migration process

### Phase 11: Permissions and Security

#### 11.1 RLS Policies
No changes needed - transaction_type is just another column, existing RLS policies apply.

#### 11.2 Validation
- Ensure transaction_type is always 'income' or 'expense'
- Validate amounts are always positive
- Ensure splits match transaction total_amount

## Implementation Checklist

### Database
- [ ] Create migration 037: Add transaction_type column
- [ ] Create migration 038: Migrate existing transactions
- [ ] Create migration 039: Add transaction_type_column to templates
- [ ] Update supabase-schema.sql
- [ ] Test migrations on staging database

### Backend
- [ ] Update Transaction interface in types.ts
- [ ] Update CreateTransactionRequest interface
- [ ] Update UpdateTransactionRequest interface
- [ ] Update ColumnMapping interface (add separate_debit_credit)
- [ ] Update ParsedTransaction interface
- [ ] Update createTransaction function
- [ ] Update updateTransaction function
- [ ] Update deleteTransaction function
- [ ] Update importTransactions function
- [ ] Update CSV parser logic (handle separate_debit_credit)
- [ ] Update transaction type determination logic
- [ ] Update API routes

### Frontend
- [ ] Update TransactionList component (color coding)
- [ ] Update EditTransactionDialog component
- [ ] Update AddTransactionDialog component
- [ ] Update TransactionPreview component
- [ ] Update Column Mapping page (add separate_debit_credit option)
- [ ] Update import flow

### Reporting
- [ ] Update SpendingByCategory component
- [ ] Update MonthlySpendingTrend component
- [ ] Update BudgetVsActualTrend component
- [ ] Update SpendingVelocityTrend component
- [ ] Update TransactionsByMerchant component
- [ ] Update MerchantGroupStats function
- [ ] Update Income page
- [ ] Test all reports with mixed income/expense data

### Testing
- [ ] Write unit tests for transaction type logic
- [ ] Write integration tests for CRUD operations
- [ ] Test migration on copy of production data
- [ ] Manual testing checklist
- [ ] Test CSV imports with various formats (including separate debit/credit)
- [ ] Test all reports with mixed income/expense transactions

### Documentation
- [ ] Update user documentation
- [ ] Update developer documentation
- [ ] Create rollback plan document
- [ ] Update API documentation

### Deployment
- [ ] Create backup script
- [ ] Test backup/restore process
- [ ] Schedule migration window
- [ ] Deploy code changes
- [ ] Run migrations
- [ ] Verify data integrity
- [ ] Monitor for issues

## Risk Assessment

### High Risk Areas
1. **Category Balance Migration**: Must NOT change balances during migration
2. **Balance Calculations**: Income vs expense logic must be correct everywhere
3. **CSV Import**: Complex logic for different bank formats

### Mitigation Strategies
1. **Migration Safety**: Use transactions, verify no balance changes
2. **Code Review**: Thorough review of balance calculation logic
3. **Testing**: Comprehensive testing with various CSV formats
4. **Backup**: Full backup before migration
5. **Rollback Plan**: Documented and tested rollback procedure

## Timeline Estimate

- **Phase 1-2** (Database & Types): 2-3 days
- **Phase 3** (CSV Import): 4-5 days (includes separate_debit_credit support)
- **Phase 4** (CRUD Operations): 2-3 days
- **Phase 5** (API): 1 day
- **Phase 6** (UI): 3-4 days
- **Phase 7** (Reporting Updates): 3-4 days (NEW)
- **Phase 8** (Backup/Rollback): 1 day
- **Phase 9** (Testing): 3-4 days (includes report testing)
- **Phase 10** (Documentation): 1 day
- **Phase 11** (Permissions): 0.5 days

**Total Estimate**: 20-26 days

## Success Criteria

1. ✅ All transactions have transaction_type ('income' or 'expense')
2. ✅ Category balances calculate correctly for income and expense
3. ✅ CSV imports handle different bank formats correctly (including separate debit/credit columns)
4. ✅ UI displays amounts with appropriate color coding
5. ✅ Migration does not change existing category balances
6. ✅ All existing functionality continues to work
7. ✅ Users can create/edit transactions with correct type
8. ✅ Import templates save and load transaction type mappings
9. ✅ All reports correctly account for transaction_type
10. ✅ Spending reports only count expenses (or subtract income)
11. ✅ Income reports only count income transactions
12. ✅ Net calculations correctly add income and subtract expenses

## Notes

- Amounts are always stored as positive numbers
- Transaction type determines whether amount adds or subtracts from category balance
- Migration is metadata-only (doesn't recalculate balances)
- UI uses color coding instead of additional column to save space
- CSV import supports four conventions for maximum flexibility:
  1. Positive amounts are expenses (most common)
  2. Positive amounts are income
  3. Separate transaction type column
  4. Separate debit and credit columns (for banks with both columns)
- **Reporting Impact**: All reports must be updated to account for transaction_type:
  - Spending reports: Expenses add, income subtracts
  - Income reports: Only count income transactions
  - Net calculations: Income adds, expenses subtract
  - Merchant reports: Account for transaction_type in totals

