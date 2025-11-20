# Goals Feature - Complete Implementation Plan

## Overview

The Goals feature allows users to create savings goals (e.g., "Hawaii Vacation", "Emergency Fund") with target amounts and optional timelines. Goals can work in two modes:
1. **Envelope-based**: Works like a budget envelope, manually adjustable balance, included in envelope totals
2. **Account-linked**: Linked to a dedicated account, balance tracked from account, excluded from totals

---

## Core Requirements

### Goal Properties
- **Name**: User-defined goal name (e.g., "Hawaii Vacation")
- **Target Amount**: Required target amount to reach
- **Target Date**: Optional date when goal should be reached
- **Type**: Either "envelope" or "account-linked"
- **Monthly Contribution**: Required monthly contribution amount (for envelope goals)
- **Linked Account ID**: Optional, only if type is "account-linked"
- **Current Balance**: Tracked from envelope or linked account
- **Status**: Active, Completed, Overdue, Paused

### Goal Types

#### 1. Envelope-Based Goals
- Works exactly like a budget category/envelope
- Balance can be manually adjusted (like other envelopes)
- Included in "Total Envelopes" calculation
- Has monthly contribution target
- Can receive allocations from "Allocate Income" page
- Balance stored in `categories` table (with `is_goal = true`)

#### 2. Account-Linked Goals
- Linked to a dedicated account
- Balance automatically synced from account balance
- Account must have `include_in_totals = false` (excluded from totals)
- No manual balance adjustments allowed
- No direct allocations (user transfers money to account instead)
- Shows reminder in "Allocate Income" page
- Balance tracked via account relationship

---

## Database Schema

### New Table: `goals`

```sql
CREATE TABLE goals (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL,
  target_date DATE, -- NULL if no target date
  goal_type TEXT NOT NULL CHECK(goal_type IN ('envelope', 'account-linked')),
  monthly_contribution DECIMAL(10,2) NOT NULL DEFAULT 0, -- Required for envelope goals
  linked_account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL, -- Only for account-linked
  linked_category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL, -- Only for envelope goals
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'overdue', 'paused')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT envelope_has_category CHECK (
    (goal_type = 'envelope' AND linked_category_id IS NOT NULL) OR
    (goal_type = 'account-linked' AND linked_category_id IS NULL)
  ),
  CONSTRAINT account_linked_has_account CHECK (
    (goal_type = 'account-linked' AND linked_account_id IS NOT NULL) OR
    (goal_type = 'envelope' AND linked_account_id IS NULL)
  )
);

-- Indexes
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(user_id, status);
CREATE INDEX idx_goals_linked_account ON goals(linked_account_id);
CREATE INDEX idx_goals_linked_category ON goals(linked_category_id);

-- RLS Policies
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);
```

### Modify `categories` Table

Add `is_goal` column to distinguish goal envelopes from regular categories:

```sql
ALTER TABLE categories ADD COLUMN is_goal BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_categories_is_goal ON categories(user_id, is_goal);
```

### Modify `accounts` Table

Add `linked_goal_id` to track which account is linked to a goal (for validation):

```sql
ALTER TABLE accounts ADD COLUMN linked_goal_id BIGINT REFERENCES goals(id) ON DELETE SET NULL;
CREATE INDEX idx_accounts_linked_goal ON accounts(linked_goal_id);
```

---

## TypeScript Types

### `src/lib/types.ts`

```typescript
export interface Goal {
  id: number;
  user_id: string;
  name: string;
  target_amount: number;
  target_date: string | null; // ISO date string or null
  goal_type: 'envelope' | 'account-linked';
  monthly_contribution: number;
  linked_account_id: number | null;
  linked_category_id: number | null;
  status: 'active' | 'completed' | 'overdue' | 'paused';
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Computed fields (not in DB)
  current_balance?: number;
  progress_percentage?: number;
  remaining_amount?: number;
  months_remaining?: number | null;
  required_monthly_contribution?: number;
  projected_completion_date?: string | null;
  is_on_track?: boolean;
}

export interface GoalWithDetails extends Goal {
  linked_account?: Account | null;
  linked_category?: Category | null;
}
```

---

## API Endpoints

### `src/app/api/goals/route.ts`

**GET `/api/goals`**
- Returns all goals for authenticated user
- Includes computed fields (balance, progress, etc.)
- Filters by status if query param provided

**POST `/api/goals`**
- Creates a new goal
- Validates account linking (account must exist, not already linked)
- For envelope goals: creates category automatically
- For account-linked: sets account's `include_in_totals = false`

### `src/app/api/goals/[id]/route.ts`

**GET `/api/goals/[id]`**
- Returns single goal with full details

**PATCH `/api/goals/[id]`**
- Updates goal properties
- Validates account/category changes
- Updates status if target reached or date passed

**DELETE `/api/goals/[id]`**
- Deletes goal
- For envelope goals: deletes linked category
- For account-linked: resets account's `include_in_totals = true` (optional)

### `src/app/api/goals/[id]/progress/route.ts`

**GET `/api/goals/[id]/progress`**
- Returns detailed progress calculations
- Current balance, progress %, months remaining, required contribution, etc.

---

## Business Logic & Calculations

### Progress Calculations

```typescript
function calculateGoalProgress(goal: Goal, currentBalance: number): {
  progress_percentage: number;
  remaining_amount: number;
  months_remaining: number | null;
  required_monthly_contribution: number;
  projected_completion_date: string | null;
  is_on_track: boolean;
} {
  const remaining_amount = Math.max(0, goal.target_amount - currentBalance);
  const progress_percentage = (currentBalance / goal.target_amount) * 100;
  
  let months_remaining: number | null = null;
  let required_monthly_contribution: number = goal.monthly_contribution;
  let projected_completion_date: string | null = null;
  let is_on_track = true;
  
  if (goal.target_date) {
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    const monthsDiff = (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    months_remaining = Math.max(0, Math.ceil(monthsDiff));
    
    if (months_remaining > 0) {
      required_monthly_contribution = remaining_amount / months_remaining;
      is_on_track = goal.monthly_contribution >= required_monthly_contribution;
    } else {
      months_remaining = 0;
      is_on_track = currentBalance >= goal.target_amount;
    }
  } else {
    // No target date - calculate projected completion
    if (goal.monthly_contribution > 0) {
      const monthsNeeded = remaining_amount / goal.monthly_contribution;
      const completionDate = new Date();
      completionDate.setMonth(completionDate.getMonth() + monthsNeeded);
      projected_completion_date = completionDate.toISOString().split('T')[0];
    }
  }
  
  return {
    progress_percentage: Math.min(100, progress_percentage),
    remaining_amount,
    months_remaining,
    required_monthly_contribution,
    projected_completion_date,
    is_on_track,
  };
}
```

### Status Updates

- **Active**: Default status, goal in progress
- **Completed**: `current_balance >= target_amount`
- **Overdue**: `target_date` has passed and `current_balance < target_amount`
- **Paused**: User manually paused (no automatic updates)

---

## UI Components

### 1. Goals List Page (`src/app/goals/page.tsx`)

**Features:**
- List all goals with progress bars
- Filter by status (Active, Completed, Overdue, Paused)
- Sort by name, target date, progress
- Quick actions: Edit, Delete, Pause/Resume
- "Add Goal" button

**Display:**
- Goal name
- Progress bar with percentage
- Current balance / Target amount
- Status badge
- Target date (if set)
- Monthly contribution
- On-track indicator

### 2. Goal Detail/Edit Dialog (`src/components/goals/GoalDialog.tsx`)

**Create Mode:**
- Name input
- Target amount input
- Target date picker (optional)
- Goal type selector (Envelope vs Account-linked)
- If envelope:
  - Monthly contribution input
  - Starting balance input (optional)
- If account-linked:
  - Account selector (existing or create new)
  - Warning about account dedication
  - Monthly contribution (for tracking/reminders only)

**Edit Mode:**
- Same fields as create
- Can change goal type (with warnings)
- Can update target amount/date
- Can pause/resume goal

### 3. Goals Dashboard Widget (`src/components/dashboard/GoalsWidget.tsx`)

**Display:**
- Summary card showing:
  - Total active goals
  - Total amount being saved toward goals
  - Next goal deadline
- List of active goals with progress bars
- Link to full goals page

### 4. Goals Section in Allocate Income (`src/components/money-movement/AllocateIncome.tsx`)

**For Envelope Goals:**
- Separate section: "Goals"
- List all active envelope goals
- Show monthly contribution target
- Allow allocation input (like regular envelopes)
- Include in "Use Monthly Amounts" calculation
- Include in total allocation

**For Account-Linked Goals:**
- Separate section: "Account-Linked Goals"
- List all active account-linked goals
- Show: "Transfer $X to [Account Name] to stay on track"
- No allocation input (read-only reminder)
- Link to account page

### 5. Goal Progress Card (`src/components/goals/GoalProgressCard.tsx`)

**Display:**
- Circular or linear progress bar
- Current balance / Target amount
- Progress percentage
- Remaining amount
- Months remaining (if target date set)
- Required monthly contribution
- On-track indicator (green/yellow/red)
- Projected completion date (if no target date)

---

## Integration Points

### 1. Categories Query Updates

**Modify `getAllCategories()`:**
- Filter out goal categories when fetching regular categories for transactions
- Add separate query for goal categories if needed
- Ensure goal categories are included in envelope totals calculation

### 2. Dashboard Summary Updates

**Modify `getDashboardSummary()`:**
- Include goal categories in "Total Envelopes" calculation
- Exclude account-linked goal accounts from "Total Monies"
- Add goals summary to dashboard response

### 3. Transaction Category Dropdown

**Modify category dropdowns:**
- Filter out goal categories (`is_goal = true`)
- Goals should NOT appear in transaction category selection

### 4. Account Management

**When linking account to goal:**
- Set `include_in_totals = false` automatically
- Set `linked_goal_id` on account
- Warn user if account has existing transactions
- Prevent account deletion if linked to active goal

**When unlinking account:**
- Reset `include_in_totals = true` (or ask user)
- Clear `linked_goal_id`

### 5. Category Management

**When creating envelope goal:**
- Create category automatically with `is_goal = true`
- Set `monthly_amount = goal.monthly_contribution`
- Link goal to category

**When deleting envelope goal:**
- Option to delete linked category or keep it as regular category

---

## Validation & Business Rules

### Goal Creation
1. Name is required and unique per user
2. Target amount must be > 0
3. Target date must be in the future (if provided)
4. Monthly contribution must be > 0 for envelope goals
5. Account must exist and not be linked to another goal
6. Account must not have transactions (or warn user)

### Goal Updates
1. Cannot change goal type if balance > 0 (or require confirmation)
2. Cannot set target date in the past
3. Cannot link account that's already linked to another goal
4. Monthly contribution changes don't affect existing balance

### Account Linking
1. Account must be dedicated (no other transactions)
2. Account's `include_in_totals` automatically set to false
3. Account cannot be deleted while linked to active goal
4. Warn user when linking account with existing balance

### Status Management
1. Auto-update status on balance/date changes
2. Completed goals can be reactivated if target increased
3. Overdue goals can be updated with new target date

---

## Additional Features to Consider

### 1. Goal Contributions History
- Track monthly contributions
- Show contribution trends
- Compare planned vs actual contributions

### 2. Goal Milestones
- Set intermediate milestones (e.g., 25%, 50%, 75%)
- Celebrate when milestones reached
- Visual progress indicators

### 3. Goal Templates
- Pre-defined goal templates (Emergency Fund, Vacation, etc.)
- Quick creation from templates
- Customizable templates

### 4. Goal Sharing/Export
- Export goal progress to PDF
- Share goal progress (future feature)
- Goal completion certificates

### 5. Goal Notifications
- Reminders when behind schedule
- Celebrations when milestones reached
- Monthly contribution reminders

### 6. Goal Analytics
- Average time to complete goals
- Success rate
- Most common goal types
- Contribution patterns

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. Database migration for `goals` table
2. TypeScript types and interfaces
3. Basic API endpoints (CRUD)
4. Database queries and helpers

### Phase 2: Envelope Goals (Week 2)
1. Goal creation dialog (envelope type)
2. Category creation for envelope goals
3. Goals list page
4. Goal progress calculations
5. Integration with Allocate Income page

### Phase 3: Account-Linked Goals (Week 3)
1. Account linking functionality
2. Account validation and warnings
3. Account balance syncing
4. Account-linked goals in Allocate Income

### Phase 4: Dashboard & UI Polish (Week 4)
1. Goals widget on dashboard
2. Goal progress cards
3. Status management (auto-updates)
4. Goal detail/edit dialogs
5. Filtering and sorting

### Phase 5: Advanced Features (Future)
1. Goal contributions history
2. Milestones
3. Notifications
4. Analytics

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── goals/
│   │       ├── route.ts                    # GET all, POST create
│   │       ├── [id]/
│   │       │   ├── route.ts                # GET one, PATCH update, DELETE
│   │       │   └── progress/
│   │       │       └── route.ts            # GET progress calculations
│   │       └── [id]/
│   │           └── status/
│   │               └── route.ts             # PATCH status (pause/resume)
│   └── goals/
│       └── page.tsx                        # Goals list page
├── components/
│   ├── goals/
│   │   ├── GoalDialog.tsx                  # Create/Edit dialog
│   │   ├── GoalProgressCard.tsx            # Progress display card
│   │   ├── GoalsList.tsx                   # Goals list component
│   │   ├── GoalStatusBadge.tsx              # Status badge
│   │   └── AccountLinkWarning.tsx          # Account linking warnings
│   └── dashboard/
│       └── GoalsWidget.tsx                 # Dashboard widget
└── lib/
    ├── goals/
    │   ├── calculations.ts                 # Progress calculations
    │   └── validations.ts                  # Validation helpers
    ├── supabase-queries.ts                 # Add goal queries
    └── types.ts                            # Add Goal types
```

---

## Testing Considerations

### Unit Tests
- Progress calculations
- Status updates
- Validation logic
- Account linking rules

### Integration Tests
- Goal creation with category creation
- Account linking and unlinking
- Balance syncing
- Dashboard calculations

### E2E Tests
- Create envelope goal
- Create account-linked goal
- Allocate to goal
- Complete goal
- Delete goal

---

## Migration Strategy

### Database Migration
1. Create `goals` table
2. Add `is_goal` to `categories`
3. Add `linked_goal_id` to `accounts`
4. Create indexes
5. Set up RLS policies

### Data Migration
- No existing data to migrate
- Users start fresh with goals

### Rollback Plan
- Keep migration reversible
- Can drop `goals` table if needed
- Categories with `is_goal = true` can be converted back

---

## Success Metrics

1. Users can create and manage goals successfully
2. Envelope goals integrate seamlessly with existing envelope system
3. Account-linked goals track accurately
4. Progress calculations are accurate
5. Goals don't interfere with existing transaction/category workflows
6. Dashboard shows meaningful goal information
7. Allocate Income page handles goals correctly

---

## Open Questions / Decisions Needed

1. **Goal Categories in Transactions**: Should goal categories ever appear in transaction dropdowns? (Decision: NO - as specified)

2. **Account Unlinking**: When unlinking account, should `include_in_totals` reset to true automatically or ask user? (Recommendation: Ask user)

3. **Goal Deletion**: When deleting envelope goal, should linked category be deleted or kept? (Recommendation: Ask user)

4. **Completed Goals**: Should completed goals be archived or kept visible? (Recommendation: Keep visible, filterable)

5. **Goal Type Change**: Allow changing goal type after creation? (Recommendation: Only if balance is 0, otherwise require confirmation)

6. **Monthly Contribution Changes**: Should changing monthly contribution affect existing balance? (Decision: NO - only affects future allocations)

---

## Next Steps

1. Review and approve this plan
2. Create database migration
3. Implement Phase 1 (Core Infrastructure)
4. Test with sample data
5. Iterate based on feedback
6. Continue with remaining phases

