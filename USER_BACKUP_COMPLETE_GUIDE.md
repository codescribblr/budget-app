# User Backup System - Complete Guide

## Overview

The user backup system (accessed from Settings page) allows users to create, manage, and restore complete backups of their budget data. This is different from the system-level SQL backups.

---

## What's Included in User Backups

### ✅ **Complete Data Backup (13 Tables)**

1. **`accounts`** - All bank accounts (checking, savings, cash)
2. **`categories`** - All budget envelopes with balances
3. **`credit_cards`** - All credit cards with limits and balances
4. **`transactions`** - All transactions (income, expenses, transfers)
5. **`transaction_splits`** - How transactions are split across categories
6. **`imported_transactions`** - Import history (prevents duplicate imports)
7. **`imported_transaction_links`** - Links between imports and transactions
8. **`merchant_groups`** - Merchant grouping/normalization data
9. **`merchant_mappings`** - Merchant pattern to group mappings
10. **`merchant_category_rules`** - Auto-categorization rules (learned from your categorization choices)
11. **`pending_checks`** - Outstanding checks
12. **`income_settings`** - Income configuration (salary, pay frequency)
13. **`pre_tax_deductions`** - Pre-tax deduction items
14. **`settings`** - User settings (pay frequency, annual income, etc.)

### ❌ **Not Included (Intentionally)**

- **`user_backups`** - The backups themselves (would be recursive)
- **`_migrations`** - System migration tracking table
- **Authentication data** - Managed by Supabase auth system

---

## How to Use

### **Create a Backup**

1. Go to **Settings** page
2. Scroll to **Data Management** section
3. Click **"Create Backup"** button
4. Backup is created instantly and stored in database
5. You can have up to **3 backups** at a time

### **Restore a Backup**

1. Go to **Settings** page
2. Find the backup you want to restore
3. Click **"Restore"** button
4. Type **"restore"** in the confirmation dialog
5. Click **"Restore Backup"**
6. ⚠️ **All current data will be deleted and replaced with backup data**

### **Delete a Backup**

1. Go to **Settings** page
2. Find the backup you want to delete
3. Click **"Delete"** button
4. Backup is permanently deleted

---

## Important Notes

### ⚠️ **Restore is Destructive**

When you restore a backup:
- ✅ All current data is **deleted**
- ✅ Backup data is **inserted**
- ✅ You cannot undo this operation
- ✅ Create a new backup before restoring if you want to preserve current state

### 🔄 **Backup Limit**

- Maximum **3 backups** per user
- Delete old backups to create new ones
- Backups are stored as JSON in the database
- Each backup is typically 50-500 KB depending on data size

### 📊 **What Gets Restored**

Everything! Including:
- All transactions and their category splits
- All import history (prevents re-importing same transactions)
- All merchant groupings and smart categorization mappings
- All auto-categorization rules (learned from your categorization choices)
- All settings (pay frequency, annual income, pre-tax deductions)
- All account balances and credit card limits
- All budget envelope balances

---

## Use Cases

### **1. Before Major Changes**

Create a backup before:
- Deleting lots of transactions
- Changing category structures
- Experimenting with new features
- Bulk data operations

### **2. Testing and Experimentation**

1. Create backup of current state
2. Make experimental changes
3. If you don't like the changes, restore backup
4. If you like the changes, delete the backup

### **3. Data Recovery**

If you accidentally:
- Delete important transactions
- Mess up category balances
- Break merchant mappings
- Lose import history

Just restore your most recent backup!

### **4. Migration Between Accounts**

1. Create backup in old account
2. Download backup JSON (from database)
3. Upload to new account
4. Restore backup

---

## Technical Details

### **Backup Format**

Backups are stored as JSON with this structure:

```json
{
  "version": "1.0",
  "created_at": "2025-11-14T14:51:50.123Z",
  "accounts": [...],
  "categories": [...],
  "credit_cards": [...],
  "transactions": [...],
  "transaction_splits": [...],
  "imported_transactions": [...],
  "imported_transaction_links": [...],
  "merchant_groups": [...],
  "merchant_mappings": [...],
  "pending_checks": [...],
  "income_settings": [...],
  "pre_tax_deductions": [...],
  "settings": [...]
}
```

### **Restore Process**

1. **Delete Phase** (in reverse dependency order):
   - Delete transaction_splits (depends on transactions)
   - Delete imported_transaction_links (depends on imported_transactions)
   - Delete transactions
   - Delete imported_transactions
   - Delete merchant_mappings
   - Delete merchant_groups
   - Delete pending_checks
   - Delete pre_tax_deductions
   - Delete income_settings
   - Delete settings
   - Delete credit_cards
   - Delete categories
   - Delete accounts

2. **Insert Phase** (in dependency order):
   - Insert accounts
   - Insert categories
   - Insert credit_cards
   - Insert income_settings
   - Insert pre_tax_deductions
   - Insert pending_checks
   - Insert merchant_groups
   - Insert merchant_mappings
   - Insert transactions
   - Insert transaction_splits
   - Insert imported_transactions
   - Insert imported_transaction_links
   - Insert settings

---

## Comparison: User Backups vs System Backups

| Feature | User Backups (Settings) | System Backups (SQL) |
|---------|------------------------|----------------------|
| **Location** | Settings page | Command line scripts |
| **Format** | JSON in database | SQL dump file |
| **Size** | 50-500 KB | 200-500 KB |
| **Limit** | 3 backups max | Unlimited |
| **Restore** | One-click in app | Run SQL script |
| **Includes** | User data only | Everything (schema + data) |
| **Use Case** | Quick restore, testing | Full system restore |

---

## Best Practices

1. **Create backups regularly** - Before major changes
2. **Keep at least 1 backup** - For emergency recovery
3. **Test restores occasionally** - Make sure backups work
4. **Delete old backups** - Keep only recent ones
5. **Combine with system backups** - Use both for maximum safety

---

## Files

- **`src/lib/backup-utils.ts`** - Backup/restore logic
- **`src/app/api/backups/route.ts`** - Create/list backups API
- **`src/app/api/backups/[id]/route.ts`** - Delete backup API
- **`src/app/api/backups/[id]/restore/route.ts`** - Restore backup API
- **`migrations/006_create_user_backups_table.sql`** - Database schema

