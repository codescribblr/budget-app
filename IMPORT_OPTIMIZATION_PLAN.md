# Transaction Import Optimization Plan

## Problem

The transaction importer is timing out on Vercel because it's too slow. The connection closes before the import completes, even though the import actually succeeds on the server side.

### Root Cause

The `importTransactions` function has severe performance issues:

1. **Sequential Processing** - Processes one transaction at a time in a loop
2. **N+1 Query Problem** - Makes 4-6 database calls per transaction:
   - Insert imported_transaction
   - Get/create merchant group
   - Insert transaction
   - Insert split (for each split)
   - Get category (for each split)
   - Update category balance (for each split)
   - Insert link record

3. **Example:** 100 transactions with 2 splits each = **600+ database queries**

### Vercel Timeout Limits

- **Free Tier:** 10 seconds
- **Pro Tier:** 60 seconds
- **Enterprise:** 300 seconds

## Solution Options

### Option 1: Optimize with Batch Operations ⭐ **RECOMMENDED**

**Pros:**
- Fastest solution
- Works within existing timeout limits
- No infrastructure changes needed
- Better user experience (instant feedback)

**Cons:**
- Requires refactoring the import function
- More complex code

**Implementation:**
1. Batch insert all `imported_transactions` in one query
2. Batch insert all `transactions` in one query
3. Batch insert all `transaction_splits` in one query
4. Batch update category balances using a single UPDATE with CASE statement
5. Batch insert all links in one query

**Expected Performance:**
- Current: 600+ queries for 100 transactions
- Optimized: 5-10 queries for 100 transactions
- **60-100x faster**

---

### Option 2: Increase Vercel Timeout

**Pros:**
- No code changes needed
- Simple configuration

**Cons:**
- Requires Vercel Pro plan ($20/month)
- Only extends timeout to 60 seconds
- Doesn't solve the underlying performance problem
- Still might timeout with very large imports

**Implementation:**
Create `vercel.json`:
```json
{
  "functions": {
    "src/app/api/import/transactions/route.ts": {
      "maxDuration": 60
    }
  }
}
```

---

### Option 3: Background Processing with Job Queue

**Pros:**
- Can handle unlimited import sizes
- User can leave the page
- Professional solution

**Cons:**
- Most complex to implement
- Requires additional infrastructure (Redis/database for queue)
- Requires polling or websockets for status updates
- Overkill for current use case

**Implementation:**
1. Create job queue table in database
2. API endpoint creates job and returns job ID
3. Separate API endpoint processes jobs
4. Client polls for job status
5. Show progress indicator

---

## Recommendation

**Implement Option 1 (Batch Operations)** because:

1. ✅ Solves the root cause (performance)
2. ✅ Works on free tier
3. ✅ Provides instant feedback
4. ✅ Handles reasonable import sizes (1000+ transactions)
5. ✅ No additional infrastructure needed

If imports grow beyond 1000+ transactions regularly, then consider Option 3.

## Implementation Details for Option 1

### Current Flow (Slow)
```
for each transaction:
  - INSERT imported_transaction (1 query)
  - Get/create merchant group (1-2 queries)
  - INSERT transaction (1 query)
  - for each split:
    - INSERT split (1 query)
    - SELECT category (1 query)
    - UPDATE category balance (1 query)
  - INSERT link (1 query)
```

### Optimized Flow (Fast)
```
1. Batch INSERT all imported_transactions (1 query)
2. Batch get/create merchant groups (1-2 queries)
3. Batch INSERT all transactions (1 query)
4. Batch INSERT all splits (1 query)
5. Batch UPDATE category balances (1 query using CASE)
6. Batch INSERT all links (1 query)
```

### Key Changes

1. **Use `.insert()` with arrays** instead of loops
2. **Aggregate category balance updates** into a single query
3. **Pre-fetch merchant groups** in batch
4. **Use PostgreSQL CASE statements** for conditional updates

### Estimated Time Savings

- **Current:** 100 transactions = ~30-60 seconds
- **Optimized:** 100 transactions = ~1-3 seconds
- **Improvement:** 10-20x faster

## Next Steps

1. Refactor `importTransactions` function to use batch operations
2. Test with various import sizes (10, 100, 500 transactions)
3. Add progress indicator to UI (optional)
4. Monitor Vercel logs to confirm performance improvement

