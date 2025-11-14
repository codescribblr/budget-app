# Historical Transaction Import Feature

## Overview

This feature allows you to import historical transactions for reporting and trend analysis **without affecting your current envelope balances**. This is perfect for importing past transactions to build a complete financial history while keeping your current budget intact.

## How It Works

### The Problem
Previously, importing transactions would always deduct the transaction amounts from your envelope balances. This made it impossible to import historical data because:
- Old transactions would incorrectly reduce your current envelope balances
- You couldn't build a complete transaction history for trends and reports
- Historical imports would mess up your current budget tracking

### The Solution
Transactions now have an `is_historical` flag that determines whether they affect envelope balances:
- **Regular transactions** (`is_historical = false`): Deduct from envelope balances (default behavior)
- **Historical transactions** (`is_historical = true`): Don't affect envelope balances, but appear in all reports and trends

## Using the Feature

### Importing Historical Transactions

1. Go to the **Import** page
2. Upload your CSV file or screenshot
3. Review and categorize transactions as usual
4. **Check the "Import as historical" checkbox** at the bottom of the preview
5. Click "Import X Transactions"

The transactions will be imported and categorized, but won't affect your current envelope balances.

### What Gets Imported

Historical transactions:
- ✅ **Are categorized** - You can assign them to budget categories
- ✅ **Appear in reports** - Show up in spending reports and trends
- ✅ **Are searchable** - Can be found on the transactions page
- ✅ **Learn patterns** - Still contribute to smart categorization learning
- ✅ **Link to merchants** - Get assigned to merchant groups
- ❌ **Don't affect balances** - Won't deduct from envelope balances

## Use Cases

### 1. Building Historical Data
Import the last 6-12 months of transactions to see spending trends without affecting your current budget.

### 2. Year-End Analysis
Import all transactions from previous years to analyze annual spending patterns.

### 3. Migration from Other Systems
Import your complete transaction history from another budgeting app or spreadsheet.

### 4. Retroactive Categorization
Import old transactions and categorize them to improve your merchant learning and reporting accuracy.

## Technical Details

### Database Schema
```sql
-- Added to transactions table
ALTER TABLE transactions 
ADD COLUMN is_historical BOOLEAN NOT NULL DEFAULT FALSE;
```

### API Changes
- `POST /api/import/transactions` now accepts `isHistorical` parameter
- `createTransaction()` function accepts `is_historical` option
- `importTransactions()` function accepts `isHistorical` parameter

### Balance Update Logic
```typescript
// Only update balances for non-historical transactions
if (!isHistorical) {
  // Update category balance
  await supabase
    .from('categories')
    .update({
      current_balance: Number(category.current_balance) - split.amount,
    })
    .eq('id', split.category_id);
}
```

## Migration

To add the `is_historical` column to your database:

```bash
# Set your database URL
export SUPABASE_DB_URL='postgresql://postgres:your-password@db.xxx.supabase.co:5432/postgres'

# Run migrations
./scripts/run-migrations.sh
```

The migration file is: `migrations/005_add_is_historical_to_transactions.sql`

## Best Practices

1. **Use for old data only** - Only mark transactions as historical if they're from before you started using the app
2. **Be consistent** - Don't mix historical and current transactions from the same time period
3. **Categorize accurately** - Even though they don't affect balances, accurate categorization helps with trends
4. **Import chronologically** - Import older transactions first to build a complete timeline

## Example Workflow

**Scenario:** You're starting to use the budget app on January 1, 2025, but want to see your 2024 spending trends.

1. **Import 2024 transactions as historical:**
   - Upload your 2024 bank statements
   - Check "Import as historical"
   - Import all transactions

2. **Import 2025 transactions normally:**
   - Upload your January 2025 statements
   - Leave "Import as historical" unchecked
   - Import transactions (these will affect balances)

3. **View trends:**
   - Go to Reports → Trends
   - See spending patterns from all of 2024 and 2025
   - Your envelope balances only reflect 2025 transactions

## Notes

- Historical transactions are **permanent** - you can't convert them to regular transactions later
- All existing transactions are marked as `is_historical = false` by default
- The feature is completely optional - you can continue importing normally without using it

