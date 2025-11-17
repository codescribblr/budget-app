# Duplicate Detection System - How It Works

## Overview

The transaction import system has a **two-layer duplicate detection** system that gives users full visibility and control over potential duplicates.

---

## How Transaction Hashes Are Generated

### Hash Formula
```typescript
hash = hash_function(date + description + amount + originalCSVRow)
```

### What's Included

1. **Date** - Transaction date (YYYY-MM-DD format, no time)
2. **Description** - Full transaction description
3. **Amount** - Transaction amount
4. **Original CSV Row** - The entire CSV row as JSON

### Example

**CSV Row:**
```
10/15/2024,09:30 AM,John Doe,$25.50,Points,Balance,Cleared,Purchase,Starbucks,Coffee
```

**Hash Input:**
```
2024-10-15|Coffee|25.50|["10/15/2024","09:30 AM","John Doe","$25.50",...]
```

---

## Why This Approach?

### ✅ **Advantages**

1. **Includes Time (if available)** - Citi Rewards CSVs include time, making each transaction unique
2. **Includes All CSV Fields** - Transaction IDs, reference numbers, etc. make duplicates unlikely
3. **Prevents Accidental Re-imports** - Same file imported twice won't create duplicates

### ⚠️ **Limitations**

1. **No Time in Some Formats** - Chase, Wells Fargo CSVs don't include time
2. **Legitimate Duplicates Possible** - Two coffees at Starbucks on the same day for $5.50 each
3. **Date-Only Matching** - Can't distinguish transactions that occur minutes apart

---

## Two-Layer Duplicate Detection

### Layer 1: Frontend Detection (User-Facing)

**When:** During file upload, before user sees the preview

**How:**
1. Parse CSV file and generate hashes for all transactions
2. Call `/api/import/check-duplicates` to check which hashes exist in database
3. Mark matching transactions as `isDuplicate: true`
4. Auto-exclude duplicates but show them in the UI

**User Experience:**
- ✅ Sees all transactions including duplicates
- ✅ Duplicates highlighted in yellow
- ✅ Duplicates marked with "Duplicate" badge
- ✅ Can click "Include" to import anyway
- ✅ Sees duplicate count in summary

**Code Location:** `src/components/import/FileUpload.tsx` (lines 119-166)

---

### Layer 2: Backend Protection (Database-Level)

**When:** During actual import, after user clicks "Import"

**How:**
1. Attempt to batch insert all transactions into `imported_transactions` table
2. If duplicate hash error (23505), query database for existing hashes
3. Filter out duplicates and retry with only new transactions
4. Continue import process with non-duplicates

**User Experience:**
- ✅ Duplicates are gracefully skipped (no error shown)
- ✅ Only new transactions are imported
- ✅ Import succeeds even if some transactions are duplicates

**Code Location:** `src/lib/supabase-queries.ts` (lines 1104-1153)

---

## User Workflow

### Scenario 1: Importing New Transactions

```
1. User uploads CSV with 100 transactions
2. Frontend checks database - finds 0 duplicates
3. All 100 shown as "Ready" (green)
4. User clicks "Import 100 Transactions"
5. Backend imports all 100 successfully
```

### Scenario 2: Re-importing Same File

```
1. User uploads same CSV again (100 transactions)
2. Frontend checks database - finds 100 duplicates
3. All 100 shown as "Duplicate" (yellow) and auto-excluded
4. User sees "Import 0 Transactions" button (disabled)
5. User can click "Include" on specific transactions if desired
```

### Scenario 3: Partial Duplicates

```
1. User uploads CSV with 100 transactions
2. Frontend checks database - finds 25 duplicates
3. 75 shown as "Ready" (green)
4. 25 shown as "Duplicate" (yellow) and auto-excluded
5. User clicks "Import 75 Transactions"
6. Backend imports 75 new transactions
```

### Scenario 4: User Includes a Duplicate

```
1. User uploads CSV with 100 transactions
2. Frontend finds 10 duplicates, auto-excludes them
3. User clicks "Include" on 2 of the duplicates
4. User clicks "Import 92 Transactions" (90 new + 2 duplicates)
5. Backend attempts to import all 92
6. Backend detects 2 are duplicates, skips them
7. Backend imports 90 new transactions
8. User sees "Successfully imported 90 transactions"
```

---

## Handling Legitimate Duplicates

### Problem

Two legitimate transactions might have the same hash:
- Two $5.50 Starbucks purchases on the same day
- Two $100 Amazon orders on the same day

### Current Solution

**User must manually differentiate them:**

1. **Edit the date** - Change one by 1 day
2. **Edit the amount** - Change one by $0.01
3. **Edit the description** - Add a note like "Morning" or "Evening"

This recalculates the hash and makes them unique.

### Why Not Auto-Import Duplicates?

**Reasons:**
1. **Prevents Accidental Duplicates** - Most duplicates are mistakes
2. **User Control** - User explicitly chooses to import
3. **Data Integrity** - Hash system is designed to prevent duplicates
4. **Audit Trail** - `imported_transactions` table tracks what was imported

---

## Database Schema

### `imported_transactions` Table

```sql
CREATE TABLE imported_transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  hash TEXT NOT NULL,
  import_date TIMESTAMP NOT NULL,
  transaction_date DATE NOT NULL,
  merchant TEXT,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  
  UNIQUE (user_id, hash)  -- Prevents duplicate imports
);
```

The `UNIQUE (user_id, hash)` constraint is what prevents duplicates at the database level.

---

## Future Improvements

### Potential Enhancements

1. **Better Hash Algorithm**
   - Include transaction ID from CSV if available
   - Use cryptographic hash (SHA-256) instead of simple hash
   - Add row number as tiebreaker for identical transactions

2. **Smart Duplicate Detection**
   - Fuzzy matching on description
   - Amount tolerance (±$0.01)
   - Date range (±1 day)
   - Show "Possible Duplicate" vs "Exact Duplicate"

3. **User Preferences**
   - Allow users to choose duplicate handling strategy
   - Option to auto-import duplicates with confirmation
   - Option to always skip duplicates silently

4. **Better Messaging**
   - Show which specific transactions were skipped
   - Explain why they were considered duplicates
   - Suggest how to import them if desired

---

## Summary

✅ **Current System:**
- Two-layer duplicate detection (frontend + backend)
- User sees all duplicates and can choose to include/exclude
- Backend gracefully skips duplicates that are already imported
- Hash includes date, description, amount, and full CSV row

✅ **User Benefits:**
- Full visibility into what's being imported
- Control over duplicate handling
- Protection against accidental re-imports
- Fast, optimized batch import process

⚠️ **Limitations:**
- Legitimate duplicates might be flagged
- User must manually edit to differentiate
- Hash might not be unique enough for some CSV formats

---

## Related Files

- `src/lib/csv-parser.ts` - Hash generation logic
- `src/components/import/FileUpload.tsx` - Frontend duplicate detection
- `src/components/import/TransactionPreview.tsx` - Duplicate UI display
- `src/lib/supabase-queries.ts` - Backend duplicate handling
- `src/app/api/import/check-duplicates/route.ts` - Duplicate check API

