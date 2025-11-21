# Loans Feature - Complete Implementation Plan

## Overview
Add loan tracking to provide users with a complete financial picture including debts, enabling better financial planning, net worth calculations, and goal-based debt payoff strategies.

## User Experience Goals
1. **Complete Financial Picture**: Track all debts alongside assets (accounts) and credit cards
2. **Net Worth Calculation**: Include loans as liabilities in total net worth
3. **Goal Integration**: Link goals to loans for structured payoff plans (similar to credit cards)
4. **Debt Payoff Recommendations**: Use loan details (interest rate, minimum payment) to suggest optimal payoff strategies
5. **Simple Management**: Manage loans on Dashboard like accounts and credit cards (no standalone page needed)

## Important: Cash-Based vs Net Worth Calculations

**Loans are NOT cash-based assets** and should be treated differently from accounts, credit cards, and pending checks:

### Cash-Based Totals (UNCHANGED by loans):
- **Current Savings**: Sum of account balances only
- **Total Allocated**: Sum of envelope balances only
- **Unallocated**: Current Savings - Total Allocated
- **Pending Checks**: Outstanding checks to be deposited

These represent liquid cash flow and budgeting - loans don't affect these.

### Net Worth Calculations (INCLUDE loans):
- **Total Assets**: Accounts + Available Credit on Credit Cards
- **Total Liabilities**: Credit Card Balances + Loan Balances (where `include_in_net_worth = true`)
- **Net Worth**: Total Assets - Total Liabilities

This gives a complete financial picture including debts.

### Why the distinction?
- **Budgeting** is about managing cash flow (accounts, envelopes, pending checks)
- **Net Worth** is about overall financial health (assets minus all debts)
- Mixing them would confuse the envelope budgeting system

---

## Database Schema

### New Table: `loans`

```sql
CREATE TABLE loans (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                              -- Required: e.g., "Car Loan", "Student Loan"
  balance DECIMAL(10,2) NOT NULL DEFAULT 0,        -- Required: Current amount owed
  interest_rate DECIMAL(5,2),                      -- Optional: Annual percentage rate (e.g., 5.25)
  minimum_payment DECIMAL(10,2),                   -- Optional: Monthly minimum payment
  payment_due_date INTEGER,                        -- Optional: Day of month (1-31)
  open_date DATE,                                  -- Optional: When loan was opened
  starting_balance DECIMAL(10,2),                  -- Optional: Original loan amount
  institution TEXT,                                -- Optional: Bank/lender name
  include_in_net_worth BOOLEAN NOT NULL DEFAULT TRUE, -- Include in net worth calculations
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_loans_user_id ON loans(user_id);

-- RLS Policies
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own loans"
  ON loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans"
  ON loans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans"
  ON loans FOR DELETE
  USING (auth.uid() = user_id);
```

---

## TypeScript Types

### Add to `src/lib/types.ts`:

```typescript
export interface Loan {
  id: number;
  user_id: string;
  name: string;
  balance: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  payment_due_date: number | null;
  open_date: string | null;
  starting_balance: number | null;
  institution: string | null;
  include_in_net_worth: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLoanRequest {
  name: string;
  balance: number;
  interest_rate?: number;
  minimum_payment?: number;
  payment_due_date?: number;
  open_date?: string;
  starting_balance?: number;
  institution?: string;
  include_in_net_worth?: boolean;
}

export interface UpdateLoanRequest {
  balance?: number;
  interest_rate?: number;
  minimum_payment?: number;
  payment_due_date?: number;
  open_date?: string;
  starting_balance?: number;
  institution?: string;
  include_in_net_worth?: boolean;
}
```

---

## Backend Implementation

### 1. Database Queries (`src/lib/supabase-queries.ts`)

Add CRUD operations for loans:
- `getAllLoans()`: Fetch all user loans
- `getLoanById(id)`: Fetch single loan
- `createLoan(data)`: Create new loan
- `updateLoan(id, data)`: Update loan
- `deleteLoan(id)`: Delete loan

### 2. API Routes

**`src/app/api/loans/route.ts`**:
- `GET /api/loans`: List all loans
- `POST /api/loans`: Create new loan

**`src/app/api/loans/[id]/route.ts`**:
- `GET /api/loans/[id]`: Get single loan
- `PATCH /api/loans/[id]`: Update loan
- `DELETE /api/loans/[id]`: Delete loan

### 3. Dashboard Summary Updates

**NO CHANGES to `src/app/api/dashboard/route.ts`**:
- Do NOT add loan-related fields to the dashboard summary
- Keep existing fields unchanged (current_savings, total_allocated, unallocated, etc.)
- Loans are NOT included in cash-based totals
- Net worth calculations will be handled on a dedicated page in the future

---

## Frontend Implementation

### 1. Loan List Component (`src/components/dashboard/LoanList.tsx`)

Similar structure to `AccountList.tsx` and `CreditCardList.tsx`:
- Table with columns: Name, Balance, Actions
- Inline balance editing (click to edit)
- Edit button (opens dialog with all fields)
- Delete button (with confirmation)
- Add Loan button
- **Total row showing sum of all loan balances** (displayed in table footer like accounts/credit cards)

### 2. Dashboard Integration

Update `src/components/dashboard/Dashboard.tsx`:
- Add `loans` state
- Fetch loans from `/api/loans`
- Add Loans card in right column (below Pending Checks, above Goals)
- Pass loans to `LoanList` component

### 3. Summary Cards - NO CHANGES NEEDED

**Do NOT add any loan/net worth cards to the dashboard summary**:
- Keep existing cards unchanged: Current Savings, Total Allocated, Unallocated
- Loans do NOT affect cash-based calculations
- Net worth tracking will be a dedicated page in the future
- The Loans card itself will show the total loan balance in its table footer

---

## Goals Integration

### 1. Update Goals Schema

Add `linked_loan_id` to goals table (similar to credit cards):

```sql
ALTER TABLE goals ADD COLUMN linked_loan_id BIGINT REFERENCES loans(id) ON DELETE SET NULL;
CREATE INDEX idx_goals_linked_loan ON goals(linked_loan_id);
```

### 2. Update Goal Types

Extend goal types to support loan payoff goals:
- Allow linking goals to loans
- Track progress based on loan balance reduction
- Calculate recommended monthly payments to meet goal date

---

## Backup Integration

### Update `src/lib/backup-utils.ts`:

1. Add `loans` to `UserBackupData` interface
2. Export loans in `exportUserData()`
3. Import loans in `importUserData()` (after accounts, before goals)
4. Delete loans in proper order during restore

---

## Transaction Tracking (Future Enhancement)

Add `loan_id` to transactions table (similar to `account_id` and `credit_card_id`):
- Track loan payments as transactions
- Auto-update loan balance when payments are recorded
- Mutually exclusive with account_id and credit_card_id

---

## Debt Payoff Recommendations (Future Enhancement)

Use loan data to provide recommendations:
- **Avalanche Method**: Pay off highest interest rate first
- **Snowball Method**: Pay off smallest balance first
- **Custom**: Based on user's goal priorities
- Show projected payoff dates and total interest saved

---

## Implementation Order

1. ✅ **Database Migration**: Create loans table with RLS policies
2. ✅ **TypeScript Types**: Add Loan interfaces to types.ts
3. ✅ **Backend Queries**: Add CRUD operations to supabase-queries.ts
4. ✅ **API Routes**: Create /api/loans endpoints
5. ✅ **Loan List Component**: Build LoanList.tsx component
6. ✅ **Dashboard Integration**: Add loans card to Dashboard.tsx (below Pending Checks, above Goals)
7. ✅ **Backup Integration**: Add loans to backup/restore functionality
8. ⏭️ **Goals Integration**: Link goals to loans (separate task)
9. ⏭️ **Transaction Tracking**: Add loan_id to transactions (separate task)
10. ⏭️ **Net Worth Page**: Dedicated page for net worth tracking (separate task)
11. ⏭️ **Debt Recommendations**: Build payoff strategy calculator (separate task)

---

## Testing Checklist

- [ ] Create loan with only required fields (name, balance)
- [ ] Create loan with all optional fields populated
- [ ] Edit loan balance inline
- [ ] Edit loan details via dialog
- [ ] Delete loan with confirmation
- [ ] Verify loans card appears on dashboard (below Pending Checks, above Goals)
- [ ] Verify loans do NOT affect dashboard summary cards (Current Savings, Allocated, Unallocated)
- [ ] Verify loans included in net worth calculation when include_in_net_worth is true
- [ ] Verify loans excluded from net worth when include_in_net_worth is false
- [ ] Backup includes loans
- [ ] Restore properly recreates loans
- [ ] RLS policies prevent cross-user access

---

## UI/UX Notes

- **Card Position**: Below Pending Checks, above Goals in right column of dashboard
- **Table Layout**: Name | Balance | Actions (same as accounts)
- **Total Row**: Shows sum of all loan balances in table footer
- **Inline Editing**: Click balance to edit (like accounts/credit cards)
- **Edit Dialog Fields**:
  - Name (read-only in edit dialog)
  - Balance
  - Interest Rate (%)
  - Minimum Payment ($)
  - Payment Due Date (day of month)
  - Open Date (date picker)
  - Starting Balance ($)
  - Institution
  - Include in Net Worth (checkbox with explanation tooltip)
- **Add Dialog**: All fields editable
- **Validation**: Only name and balance required
- **Formatting**: Currency for balance/payments, percentage for interest rate
- **Tooltip for Include in Net Worth**: "Uncheck if this loan doesn't affect your net worth (e.g., business loan, loan you're tracking for someone else)"

