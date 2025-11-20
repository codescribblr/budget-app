# Debt Paydown Goals Feature - Implementation Plan

## Overview

Extend the Goals feature to support debt paydown goals, allowing users to track progress toward paying off credit card debt. Unlike savings goals where balances increase toward a target, debt paydown goals track decreasing balances toward zero.

---

## Core Requirements

### New Goal Type: `debt-paydown`

**Key Characteristics:**
- Links to an existing credit card (no new card creation)
- Target amount is always **0** (implicit - pay off the debt)
- Tracks progress as debt decreases (inverse of savings goals)
- Optional target date (when user wants to pay it off by)
- Monthly contribution amount (how much user plans to pay per month)
- Starting balance captured when goal is created (for progress calculation)

### Goal Properties (Extended)

**New/Modified Fields:**
- **Goal Type**: Add `'debt-paydown'` to existing types (`'envelope' | 'account-linked' | 'debt-paydown'`)
- **Linked Credit Card ID**: New field, only for debt-paydown goals
- **Target Amount**: For debt-paydown, stores the starting debt amount (captured from credit card's current_balance at creation)
- **Current Balance**: Tracked from credit card's `current_balance` field (decreases as debt is paid)
- **Progress Calculation**: Inverted logic - progress increases as balance decreases toward 0

---

## Database Schema Changes

### Migration: Add `linked_credit_card_id` to `goals` table

```sql
-- Add column for linking credit cards to debt-paydown goals
ALTER TABLE goals 
ADD COLUMN linked_credit_card_id BIGINT REFERENCES credit_cards(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_goals_linked_credit_card ON goals(linked_credit_card_id);

-- Update goal_type constraint to include 'debt-paydown'
ALTER TABLE goals 
DROP CONSTRAINT IF EXISTS goals_goal_type_check;

ALTER TABLE goals 
ADD CONSTRAINT goals_goal_type_check 
CHECK (goal_type IN ('envelope', 'account-linked', 'debt-paydown'));

-- Update constraints to handle debt-paydown goals
-- Remove old constraints and add new ones that account for debt-paydown

-- For debt-paydown: must have linked_credit_card_id, no linked_account_id or linked_category_id
-- For envelope: must have linked_category_id, no linked_account_id or linked_credit_card_id
-- For account-linked: must have linked_account_id, no linked_category_id or linked_credit_card_id

ALTER TABLE goals 
DROP CONSTRAINT IF EXISTS envelope_has_category;

ALTER TABLE goals 
DROP CONSTRAINT IF EXISTS account_linked_has_account;

ALTER TABLE goals 
ADD CONSTRAINT goal_type_constraints CHECK (
  (goal_type = 'envelope' AND linked_category_id IS NOT NULL AND linked_account_id IS NULL AND linked_credit_card_id IS NULL) OR
  (goal_type = 'account-linked' AND linked_account_id IS NOT NULL AND linked_category_id IS NULL AND linked_credit_card_id IS NULL) OR
  (goal_type = 'debt-paydown' AND linked_credit_card_id IS NOT NULL AND linked_account_id IS NULL AND linked_category_id IS NULL)
);
```

**Note:** No new fields needed for starting balance. The `target_amount` field will store the starting debt amount for debt-paydown goals (captured from credit card's `current_balance` at creation time).

---

## TypeScript Types

### Update `src/lib/types.ts`

```typescript
export interface Goal {
  id: number;
  user_id: string;
  name: string;
  target_amount: number; // For debt-paydown: starting debt amount (from credit card balance at creation)
  target_date: string | null;
  goal_type: 'envelope' | 'account-linked' | 'debt-paydown';
  monthly_contribution: number;
  linked_account_id: number | null;
  linked_category_id: number | null;
  linked_credit_card_id: number | null; // NEW: For debt-paydown goals
  status: 'active' | 'completed' | 'overdue' | 'paused';
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Computed fields (not in DB)
  current_balance?: number; // For debt-paydown: credit card balance (decreases as debt is paid)
  progress_percentage?: number; // For debt-paydown: (target_amount - current_balance) / target_amount * 100
  remaining_amount?: number; // For debt-paydown: current_balance (how much debt is left to pay)
  months_remaining?: number | null;
  required_monthly_contribution?: number;
  projected_completion_date?: string | null;
  is_on_track?: boolean;
}

export interface GoalWithDetails extends Goal {
  linked_account?: Account | null;
  linked_category?: Category | null;
  linked_credit_card?: CreditCard | null; // NEW: For debt-paydown goals
}

export interface CreateGoalRequest {
  name: string;
  target_amount?: number; // For debt-paydown: captured automatically from credit card balance at creation
  target_date?: string | null;
  goal_type: 'envelope' | 'account-linked' | 'debt-paydown';
  monthly_contribution: number;
  linked_account_id?: number | null;
  linked_category_id?: number | null;
  linked_credit_card_id?: number | null; // NEW: Required for debt-paydown
  notes?: string | null;
  // Fields for creating a new account (for account-linked goals)
  new_account_name?: string;
  new_account_type?: 'checking' | 'savings' | 'cash';
  new_account_balance?: number;
}
```

---

## Business Logic & Calculations

### Progress Calculations for Debt Paydown

**Key Differences from Savings Goals:**
- **Target Amount**: Stores the starting debt amount (captured from credit card's `current_balance` at creation)
- **Current Balance**: Credit card's `current_balance` (debt amount, decreases as paid)
- **Progress**: `(target_amount - current_balance) / target_amount * 100`
  - Example: Started with $5,000 debt (target_amount), now $3,000 (current_balance) → Progress = 40%
- **Remaining Amount**: `current_balance` (how much debt is left to pay)
- **Completed**: When `current_balance <= 0` (debt is paid off)

**Updated Calculation Function:**

```typescript
function calculateGoalProgress(goal: Goal, currentBalance: number): {
  progress_percentage: number;
  remaining_amount: number;
  months_remaining: number | null;
  required_monthly_contribution: number;
  projected_completion_date: string | null;
  is_on_track: boolean;
} {
  if (goal.goal_type === 'debt-paydown') {
    // Debt paydown logic
    const targetAmount = goal.target_amount; // Starting debt amount
    const remaining_amount = Math.max(0, currentBalance); // How much debt is left
    const progress_percentage = targetAmount > 0 
      ? Math.min(100, ((targetAmount - currentBalance) / targetAmount) * 100)
      : 100; // Already paid off (or started with 0)
    
    let months_remaining: number | null = null;
    let required_monthly_contribution: number = goal.monthly_contribution;
    let projected_completion_date: string | null = null;
    let is_on_track = true;
    
    if (goal.target_date) {
      const targetDate = new Date(goal.target_date);
      const today = new Date();
      const monthsDiff = (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      months_remaining = Math.max(0, Math.ceil(monthsDiff));
      
      if (months_remaining > 0 && remaining_amount > 0) {
        required_monthly_contribution = remaining_amount / months_remaining;
        is_on_track = goal.monthly_contribution >= required_monthly_contribution;
      } else {
        months_remaining = 0;
        is_on_track = remaining_amount <= 0;
      }
    } else {
      // No target date - calculate projected completion
      if (goal.monthly_contribution > 0 && remaining_amount > 0) {
        const monthsNeeded = remaining_amount / goal.monthly_contribution;
        const completionDate = new Date();
        completionDate.setMonth(completionDate.getMonth() + monthsNeeded);
        projected_completion_date = completionDate.toISOString().split('T')[0];
      }
    }
    
    return {
      progress_percentage: Math.max(0, progress_percentage),
      remaining_amount,
      months_remaining,
      required_monthly_contribution,
      projected_completion_date,
      is_on_track,
    };
  } else {
    // Existing savings goal logic...
  }
}
```

### Status Updates for Debt Paydown

- **Active**: Default status, debt paydown in progress
- **Completed**: `current_balance <= 0` (debt is paid off)
- **Overdue**: `target_date` has passed and `current_balance > 0`
- **Paused**: User manually paused

---

## UI Components

### 1. Goal Creation Dialog (`src/components/goals/GoalDialog.tsx`)

**Add Debt Paydown Option:**

```typescript
// Add third radio option:
<div className="flex items-center space-x-2">
  <input
    type="radio"
    id="debt-paydown"
    name="goalType"
    value="debt-paydown"
    checked={goalType === 'debt-paydown'}
    onChange={(e) => setGoalType(e.target.value as 'envelope' | 'account-linked' | 'debt-paydown')}
    className="h-4 w-4"
  />
  <Label htmlFor="debt-paydown" className="cursor-pointer">
    Debt Paydown (pay off credit card debt)
  </Label>
</div>
```

**When Debt Paydown Selected:**
- Show credit card selector (dropdown of existing credit cards)
- Show current balance of selected credit card (read-only, this becomes the target_amount)
- Show monthly payment input
- Show optional target date picker
- Hide target amount input (automatically set to credit card's current balance)
- Show info: "Target amount will be set to the current balance of the selected credit card ($X)"
- Show warning: "This goal will track your progress toward paying off this credit card"

**Fields:**
- Goal Name: e.g., "Pay off Chase Freedom"
- Credit Card: Dropdown of existing credit cards
- Current Balance: Displayed (read-only, from selected card - becomes target_amount)
- Monthly Payment: Required input
- Target Date: Optional date picker
- Notes: Optional

### 2. Goal Progress Card (`src/components/goals/GoalProgressCard.tsx`)

**Display for Debt Paydown:**
- Progress bar showing percentage paid off
- "Paid Off: $X / $Y" (instead of "Saved: $X / $Y")
- "Remaining: $Z" (instead of "Remaining: $Z")
- Status badge (Active, Completed, Overdue, Paused)
- Monthly payment amount
- "On Track" indicator (green/yellow/red)
- Credit card name/link

**Visual Differences:**
- Use red/orange color scheme instead of green/blue
- Show debt amount decreasing (inverse progress)
- Emphasize "paying down" rather than "saving up"

### 3. Goals List Page (`src/app/goals/page.tsx`)

**Filtering:**
- Add filter option: "Savings Goals" vs "Debt Paydown Goals" vs "All"
- Or use existing status filter and add type filter

**Display:**
- Separate sections or unified list with type badges
- Different color schemes for savings vs debt paydown

### 4. Dashboard Widget (`src/components/dashboard/GoalsWidget.tsx`)

**Include Debt Paydown Goals:**
- Show both savings and debt paydown goals
- Use different visual styling (colors, icons)
- Show total debt being paid down
- Show next debt paydown deadline

### 5. Allocate Income Page (`src/components/money-movement/AllocateIncome.tsx`)

**Debt Paydown Goals Section:**
- Show active debt paydown goals
- Display monthly payment target
- Show reminder: "Make payment of $X to [Credit Card Name]"
- Read-only (no allocation input - payments are made outside the system)
- Link to credit card or payment page

**Consideration:** Should debt paydown goals appear here? They're not envelopes, so they don't receive allocations. But showing reminders might be useful.

**Recommendation:** Show as a separate "Debt Paydown Reminders" section (similar to account-linked goals reminders).

---

## API Endpoints

### Update `src/app/api/goals/route.ts`

**POST `/api/goals` - Create Goal:**
- Validate debt-paydown goal creation:
  - `linked_credit_card_id` is required
  - `target_amount` automatically set to credit card's `current_balance` at creation time
  - Credit card must exist and belong to user
  - Credit card cannot be linked to another active goal
  - Credit card should have balance > 0 (warn if 0)

**GET `/api/goals`:**
- Include `linked_credit_card` in response for debt-paydown goals
- Calculate progress using debt paydown logic

### Update `src/lib/supabase-queries.ts`

**`createGoal()` function:**
- Handle debt-paydown goal type
- Capture credit card's `current_balance` and set as `target_amount` (starting debt amount)
- Link credit card to goal
- Validate credit card exists and isn't already linked
- Warn if credit card balance is 0 (already paid off)

**`getAllGoals()` function:**
- Join with `credit_cards` table to include `linked_credit_card`
- Calculate progress for debt-paydown goals using inverted logic

**`getGoalById()` function:**
- Include credit card details for debt-paydown goals

---

## Validation & Business Rules

### Goal Creation
1. **Debt Paydown Goals:**
   - Name is required and unique per user
   - `linked_credit_card_id` is required
   - Credit card must exist and belong to user
   - Credit card cannot be linked to another active goal
   - Monthly contribution must be > 0
   - Target date must be in the future (if provided)
   - `target_amount` automatically set to credit card's `current_balance` at creation time
   - Warn user if credit card balance is 0 (already paid off)

2. **Credit Card Validation:**
   - Credit card must have a balance > 0 (or warn if balance is 0)
   - Credit card can be included or excluded from totals (user's choice)
   - No restrictions on `include_in_totals` setting

### Goal Updates
1. Cannot change goal type if balance has changed significantly
2. Cannot set target date in the past
3. Cannot link credit card that's already linked to another goal
4. Monthly contribution changes don't affect existing balance tracking

### Status Management
1. Auto-update status when balance reaches 0 (Completed)
2. Auto-update status when target date passes and balance > 0 (Overdue)
3. Completed goals can be reactivated if balance increases again

---

## User Experience Considerations

### Questions & Recommendations

1. **Starting Balance Tracking:**
   - **Decision**: Use `target_amount` field to store the starting debt amount
   - Captured automatically from credit card's `current_balance` at creation time
   - No separate `starting_balance` field needed

2. **Progress Display:**
   - **Option A**: Show "Paid Off: $X / $Y" (40% paid off)
   - **Option B**: Show "Remaining: $X" (60% remaining)
   - **Recommendation**: Option A - More positive framing, shows progress made

3. **Target Amount Storage:**
   - **Decision**: Store starting debt amount in `target_amount` field
   - Captured from credit card's `current_balance` at creation time
   - Goal is to pay down to 0 (implicit target)

4. **Credit Card Balance Increases:**
   - **Scenario**: User makes progress, then charges more to the card
   - **Option A**: Progress decreases (reflects new debt)
   - **Option B**: Progress stays at highest point (only decreases, never increases)
   - **Recommendation**: Option A - Reflect reality, but show warning if balance increases

5. **Multiple Goals on Same Card:**
   - **Current Plan**: One goal per credit card
   - **Future Consideration**: Allow multiple goals (e.g., "Pay off $2,000 by Dec" and "Pay off remaining by June")
   - **Recommendation**: Start with one goal per card, add multiple goals later if needed

6. **Allocation Integration:**
   - **Question**: Should debt paydown goals appear in "Allocate Income" page?
   - **Option A**: Yes, as reminders (read-only, like account-linked goals)
   - **Option B**: No, keep separate (payments are made outside the system)
   - **Recommendation**: Option A - Show reminders to help users stay on track

7. **Visual Differentiation:**
   - **Recommendation**: Use red/orange color scheme for debt paydown vs green/blue for savings
   - Use different icons (credit card icon vs target/savings icon)
   - Clear labels: "Debt Paydown" vs "Savings Goal"

8. **Completed Goals:**
   - **Question**: What happens when debt is paid off?
   - **Option A**: Goal auto-completes, stays visible
   - **Option B**: Goal auto-completes, can be archived/hidden
   - **Recommendation**: Option A - Keep visible for motivation, but mark as completed

9. **Balance Tracking:**
   - **Question**: How to handle balance updates?
   - **Answer**: Balance is always read from credit card's `current_balance` field
   - Progress recalculated automatically when credit card balance changes
   - No manual balance adjustments needed (unlike envelope goals)

10. **Credit Card Deletion:**
    - **Scenario**: User deletes credit card that has active goal
    - **Option A**: Prevent deletion (require goal deletion first)
    - **Option B**: Allow deletion, set goal's `linked_credit_card_id` to NULL, mark goal as paused/error
    - **Recommendation**: Option A - Prevent deletion, show warning with link to goal

---

## Implementation Phases

### Phase 1: Database & Types (Week 1)
1. Create migration to add `linked_credit_card_id` and `starting_balance` columns
2. Update goal_type constraint to include 'debt-paydown'
3. Update TypeScript types
4. Update database queries

### Phase 2: Backend Logic (Week 1-2)
1. Update `createGoal()` to handle debt-paydown goals
2. Update progress calculation functions
3. Update validation functions
4. Update API endpoints
5. Add credit card linking/unlinking logic

### Phase 3: UI Components (Week 2)
1. Update GoalDialog to include debt-paydown option
2. Add credit card selector
3. Update GoalProgressCard to display debt paydown goals
4. Update GoalsList page
5. Update Dashboard widget

### Phase 4: Integration & Polish (Week 2-3)
1. Add debt paydown reminders to Allocate Income page
2. Update status calculations
3. Add visual differentiation (colors, icons)
4. Testing and bug fixes

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── goals/
│   │       └── route.ts                    # Updated to handle debt-paydown
│   └── goals/
│       └── page.tsx                        # Updated to show debt-paydown goals
├── components/
│   ├── goals/
│   │   ├── GoalDialog.tsx                  # Updated with debt-paydown option
│   │   ├── GoalProgressCard.tsx            # Updated to display debt paydown
│   │   └── DebtPaydownCard.tsx             # NEW: Specialized card (optional)
│   └── money-movement/
│       └── AllocateIncome.tsx              # Updated with debt reminders
├── lib/
│   ├── goals/
│   │   ├── calculations.ts                 # Updated with debt paydown logic
│   │   └── validations.ts                  # Updated validation rules
│   └── supabase-queries.ts                 # Updated goal queries
└── migrations/
    └── 013_add_debt_paydown_goals.sql      # NEW: Migration script
```

---

## Testing Considerations

### Unit Tests
- Progress calculations for debt paydown
- Status updates (completed when balance = 0)
- Validation logic
- Credit card linking rules

### Integration Tests
- Goal creation with credit card linking
- Progress calculation with changing credit card balance
- Status updates when debt is paid off
- Credit card deletion prevention

### E2E Tests
- Create debt paydown goal
- View progress as balance decreases
- Complete goal when balance reaches 0
- Handle balance increases (new charges)

---

## Success Metrics

1. Users can create debt paydown goals successfully
2. Progress accurately reflects debt reduction
3. Goals complete automatically when debt is paid off
4. Visual differentiation makes debt vs savings goals clear
5. Reminders help users stay on track with payments
6. Credit card linking/unlinking works correctly

---

## Open Questions / Decisions Needed

1. ~~**Starting Balance Storage**:~~ ✅ **DECIDED**: Use `target_amount` to store starting debt amount (captured from credit card balance at creation)
2. **Progress Display**: Show "Paid Off" or "Remaining"? (Recommendation: "Paid Off" - more positive)
3. **Balance Increases**: Should progress decrease if user charges more? (Recommendation: Yes, reflect reality)
4. **Allocation Integration**: Show reminders in Allocate Income page? (Recommendation: Yes)
5. **Visual Design**: Color scheme and icons for debt vs savings? (Recommendation: Red/orange for debt, green/blue for savings)
6. **Multiple Goals**: Allow multiple goals per credit card? (Recommendation: Start with one, add later if needed)
7. **Credit Card Deletion**: Prevent or allow with goal update? (Recommendation: Prevent deletion)

---

## Next Steps

1. **Review and approve this plan**
2. **Make decisions on open questions**
3. **Create database migration**
4. **Implement Phase 1 (Database & Types)**
5. **Test with sample data**
6. **Continue with remaining phases**

