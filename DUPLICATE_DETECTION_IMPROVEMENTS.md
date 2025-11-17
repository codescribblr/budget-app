# Duplicate Detection Improvements

## Problem Statement

The previous duplicate detection system treated all duplicates the same way:
- **Within-file duplicates** (two identical transactions in the same CSV) were marked as "Duplicate"
- **Database duplicates** (already imported transactions) were also marked as "Duplicate"
- Both showed the same yellow highlighting and "Duplicate" badge
- Users couldn't distinguish between "already imported" vs "appears twice in this file"
- Users couldn't force import of duplicates even when they knew they were legitimate

## Solution

Implemented a **three-tier duplicate detection system** with visual distinction and force-import capability.

---

## Three Types of Transactions

### 1. **Database Duplicates** (Already Imported)
- **Color**: Yellow background (`bg-yellow-50`)
- **Badge**: "Duplicate" (yellow)
- **Meaning**: This transaction was already imported in a previous batch
- **Behavior**: Auto-excluded by default
- **Force Import**: Click "Include" to modify description and import anyway

### 2. **Potential Duplicates** (Within Same File)
- **Color**: Orange background (`bg-orange-50`)
- **Badge**: "Potential Duplicate" (orange)
- **Meaning**: This transaction appears multiple times in the current CSV file
- **Behavior**: Auto-excluded by default (only first occurrence is kept)
- **Force Import**: Click "Include" to modify description and import all instances

### 3. **Normal Transactions**
- **Color**: Normal (white/transparent)
- **Badge**: "Ready" (green) or "Uncategorized" (orange)
- **Behavior**: Imported normally if categorized

---

## Force Import Mechanism

When a user clicks "Include" on a duplicate transaction:

1. **Description is modified** - A unique timestamp suffix is appended: `[1234567890]`
2. **Hash is recalculated** - New hash based on modified description
3. **Duplicate flag cleared** - Transaction is no longer marked as duplicate
4. **Status changed to pending** - Transaction will be imported
5. **Force import flag set** - `forceImport: true` indicates user explicitly requested this

### Example:
```
Original: "WALMART SUPERCENTER #1244"
Modified: "WALMART SUPERCENTER #1244 [1705432100000]"
```

---

## Visual Indicators

### Summary Bar
```
Categorized: 45
Uncategorized: 3
Duplicates: 2              ← Yellow (database duplicates)
Potential Duplicates: 1    ← Orange (within-file duplicates)
Excluded: 6
```

### Confirmation Dialog
```
Transactions to Exclude: 6
  • Uncategorized: 3
  • Duplicates (already imported): 2
  • Potential duplicates (within file): 1
```

---

## Technical Implementation

### Type Changes

**`ParsedTransaction` interface** (`import-types.ts`):
```typescript
export interface ParsedTransaction {
  // ... existing fields
  duplicateType?: 'database' | 'within-file' | null;
  forceImport?: boolean;
}
```

### Detection Logic

**`FileUpload.tsx`** - Separate tracking:
```typescript
const duplicateType = isDatabaseDuplicate 
  ? 'database' as const
  : isWithinFileDuplicate 
  ? 'within-file' as const
  : null;
```

### Force Import Logic

**`TransactionPreview.tsx`** - Modify description on include:
```typescript
if (newStatus === 'pending' && item.isDuplicate) {
  const uniqueSuffix = ` [${Date.now()}]`;
  const newDescription = item.description + uniqueSuffix;
  const newHash = generateTransactionHash(item.date, newDescription, item.amount, item.originalData);
  
  return {
    ...item,
    description: newDescription,
    hash: newHash,
    forceImport: true,
    isDuplicate: false,
    duplicateType: null,
  };
}
```

---

## User Workflow

### Scenario 1: Database Duplicate (Already Imported)
1. User uploads CSV with transaction already in database
2. Transaction shows **yellow background** with "Duplicate" badge
3. User clicks "Include" if they know it's a legitimate duplicate
4. Description is modified with timestamp suffix
5. Transaction imports successfully as a new transaction

### Scenario 2: Within-File Duplicate (Appears Twice in CSV)
1. User uploads CSV with two identical Amazon purchases on same day
2. Second occurrence shows **orange background** with "Potential Duplicate" badge
3. User clicks "Include" on second occurrence if both are legitimate
4. Description is modified with timestamp suffix
5. Both transactions import successfully

### Scenario 3: Normal Transaction
1. User uploads CSV with new transaction
2. Transaction shows normal background with "Ready" badge
3. Transaction imports normally

---

## Benefits

✅ **Clear Visual Distinction** - Users can immediately see the difference between duplicate types
✅ **Better Decision Making** - Users understand why a transaction is marked as duplicate
✅ **Force Import Capability** - Users can override duplicate detection when needed
✅ **Automatic Hash Modification** - System handles making duplicates unique
✅ **Preserves Original Behavior** - Auto-exclusion still works for both types
✅ **Detailed Reporting** - Summary shows breakdown of duplicate types

---

## Files Modified

1. `src/lib/import-types.ts` - Added `duplicateType` and `forceImport` fields
2. `src/components/import/FileUpload.tsx` - Track duplicate types separately
3. `src/components/import/TransactionPreview.tsx` - Different colors, badges, force import logic
4. `src/components/import/ImportConfirmationDialog.tsx` - Show breakdown of duplicate types

