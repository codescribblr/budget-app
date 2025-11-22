# Variable Income Enhancements - Implementation Plan

## Executive Summary

### Problem Statement

The current budget application works well for users with regular, predictable income (salaried employees), but struggles to serve users with variable or irregular income patterns:

- **Self-employed individuals** with fluctuating monthly income
- **Commission-based workers** with base salary + variable commission
- **Hourly workers** with unpredictable hours each week/pay period
- **Contract workers** receiving large payments infrequently (quarterly, project-based)
- **Weekly/bi-weekly salary workers** who want to allocate funds as they receive them

Additionally, the current system treats all budget categories the same, which doesn't reflect the reality that some categories are meant to be spent monthly (groceries) while others accumulate funds for periodic expenses (annual insurance premiums).

### Solution Overview

This implementation plan introduces a comprehensive enhancement to the budget application that:

1. **Tracks monthly funding separately from current balance** - Prevents refunding already-allocated categories
2. **Introduces three category types** - Monthly Expense, Accumulation, and Target Balance
3. **Implements a priority system** - Ensures essential categories are funded first
4. **Provides smart allocation** - Automates fund allocation based on priorities and category types
5. **Adds an income buffer** - Smooths irregular income into regular monthly rhythm
6. **Enhances reporting** - Provides insights specific to each category type
7. **Makes features opt-in** - Keeps the app simple for basic users while empowering power users
8. **Includes comprehensive help system** - Guides users to make the best decisions for their situation

### Benefits by User Type

**Weekly/Bi-weekly Salary Users:**
- Allocate funds immediately upon receiving paycheck (no need to wait until month-end)
- Track funding progress throughout the month
- See exactly how much more funding is needed for each category

**Variable Income Users:**
- Priority-based allocation ensures essentials are funded first
- Smart allocation automates complex funding decisions
- Clear visibility into which categories are fully funded vs. partially funded

**Contract Workers (Large, Infrequent Payments):**
- Income buffer converts large chunks into regular monthly rhythm
- Reduces decision fatigue and financial stress
- Provides "months of runway" visibility

**All Users:**
- Better progress tracking for different category purposes
- More accurate reporting and insights
- Opt-in complexity - only enable features you need

---

## Core Concepts

### 1. Monthly Funding Tracking

**The Problem:**
Currently, when you allocate $1,000 to your mortgage category and then pay the mortgage, the category balance becomes $0. If you receive another paycheck and run allocation again, the system might try to refund the mortgage category because it's empty - even though the mortgage is already paid for this month.

**The Solution:**
Track **"funded this month"** separately from **"current balance"**:

- **Current Balance** = What's in the envelope right now (changes with spending)
- **Funded This Month** = How much you've allocated to this category this month (cumulative, doesn't decrease when you spend)

**Example:**
```
April 1: Allocate $1,000 to Mortgage
├─ Current Balance: $1,000
└─ Funded This Month: $1,000

April 5: Pay mortgage bill
├─ Current Balance: $0 (spent)
└─ Funded This Month: $1,000 (unchanged!)

April 15: Receive another paycheck, run allocation
├─ Mortgage is skipped (already funded $1,000 this month)
└─ Funds go to next priority categories
```

**Benefits:**
- ✅ Prevents refunding already-paid bills
- ✅ Enables incremental allocation throughout the month
- ✅ Provides accurate funding progress tracking
- ✅ Works for all income frequencies (weekly, bi-weekly, irregular)

---

### 2. Category Types

Not all budget categories serve the same purpose. We introduce three distinct types:

#### Type 1: Monthly Expense
**Purpose:** Regular monthly spending that varies little month-to-month

**Examples:** Groceries, Gas, Utilities, Dining Out, Phone Bill

**Behavior:**
- Spend approximately the same amount each month
- No catch-up if underfunded last month (last month is over)
- Progress shown as: Spending vs. monthly budget

**Fields:**
- `monthly_target`: $400 (monthly budget amount)

**Display:**
```
🛒 Groceries (Monthly Expense)
├─ Monthly Budget: $400
├─ Funded This Month: $400 ✓ (100%)
├─ Current Balance: $250
└─ Spent This Month: $150
```

---

#### Type 2: Accumulation
**Purpose:** Save monthly for known periodic or annual expenses

**Examples:** Car Insurance, Annual Subscriptions, Vacation Fund, Car Maintenance, Property Taxes

**Behavior:**
- Save a fixed amount each month toward an annual goal
- Catch-up if underfunded (to stay on track for annual goal)
- Progress shown as: YTD funded vs. annual target
- **Critical:** Progress is based on total funded over time, NOT current balance

**Fields:**
- `monthly_target`: $100 (monthly contribution)
- `annual_target`: $1,200 (annual goal)

**Example Scenario:**
```
Annual Target: $1,200 (for car insurance)
Monthly Contribution: $100
Bills: June ($400), October ($300), December ($500)

Timeline:
├─ Jan-May: Fund $100/month = $500 total funded, $500 balance
├─ June: Pay $400 bill → $500 total funded, $100 balance
├─ June-Sept: Fund $100/month = $900 total funded, $500 balance
├─ October: Pay $300 bill → $900 total funded, $200 balance
└─ Oct-Nov: Fund $100/month = $1,100 total funded, $400 balance
```

**Display:**
```
🚗 Car Insurance (Accumulation)
├─ Annual Target: $1,200
├─ Funded YTD: $900 (75% of annual goal) ← Based on total funded!
├─ Current Balance: $200 ← What's available now
├─ Monthly Contribution: $100
└─ Funded This Month: $100 ✓
```

**Why This Matters:**
If we showed "Balance: $200 of $1,200 (17%)" it would be misleading - the user has actually saved $900 toward their goal, they've just spent some of it on bills.

---

#### Type 3: Target Balance
**Purpose:** Build and maintain a buffer at a specific balance level

**Examples:** Emergency Fund, Medical Buffer, Car Repair Reserve, Home Maintenance Fund

**Behavior:**
- Build to a specific balance, then stop funding
- Resume funding if balance drops below target (due to spending)
- Progress shown as: Current balance vs. target balance
- **Critical:** Only cares about current balance, not total funded over time

**Fields:**
- `monthly_target`: $500 (monthly contribution toward target)
- `target_balance`: $10,000 (desired balance to maintain)

**Example Scenario:**
```
Target Balance: $10,000 (medical buffer)
Monthly Contribution: $500
No specific spending plan - just want a buffer

Timeline:
├─ Jan-May: Fund $500/month → Balance: $2,500
├─ June-Oct: Fund $500/month → Balance: $5,000
├─ Nov-Apr: Fund $500/month → Balance: $10,000 ✓ Target reached!
├─ May: No funding needed (target reached)
├─ June: Medical expense $2,000 → Balance: $8,000
└─ July: Resume funding $500/month → Balance: $8,500
```

**Display:**
```
🏥 Medical Buffer (Target Balance)
├─ Target Balance: $10,000
├─ Current Balance: $7,500 (75% of target)
├─ Remaining: $2,500
├─ Monthly Contribution: $500
└─ Funded This Month: $500 ✓
```

**Smart Allocation Logic:**
```javascript
if (category.type === 'target_balance') {
  const gap = Math.max(0, category.target_balance - category.current_balance);

  if (gap === 0) {
    // Target reached! No need to fund this month
    targetAmount = 0;
  } else {
    // Fund up to monthly_contribution, but don't exceed the gap
    targetAmount = Math.min(category.monthly_contribution, gap);
  }
}
```

**Use Cases:**
- Emergency fund (build to 3-6 months expenses, then stop)
- Medical buffer (unpredictable expenses, want cushion)
- Car repair reserve (don't know when, but want to be ready)
- Home maintenance fund (roof, HVAC, etc.)

---

### 3. Priority System

**Purpose:** Define the order in which categories should be funded when money is limited

**How It Works:**
- Each category has a priority from 1-10 (1 = highest priority)
- When allocating funds, categories are funded in priority order
- Within the same priority level, categories are funded in display order

**Example Priority Structure:**
```
Priority 1 - Essentials (Must Fund)
├─ Rent/Mortgage
├─ Utilities
└─ Groceries

Priority 2 - Important (Should Fund)
├─ Car Insurance
├─ Gas
└─ Phone

Priority 3 - Savings (Nice to Fund)
├─ Emergency Fund
├─ Vacation Fund
└─ Car Maintenance

Priority 4 - Discretionary (Fund if Possible)
├─ Dining Out
├─ Entertainment
└─ Hobbies
```

**Benefits:**
- ✅ Ensures essentials are always funded first
- ✅ Automates complex allocation decisions
- ✅ Reduces decision fatigue
- ✅ Critical for variable income users

---

### 4. Smart Allocation

**Purpose:** Automatically allocate available funds to categories based on priority, category type, and funding status

**Algorithm:**
```javascript
function smartAllocate(availableMoney, currentMonth) {
  const categories = getCategoriesSortedByPriority();
  let remaining = availableMoney;

  for (const category of categories) {
    if (remaining <= 0) break;

    // Calculate how much this category needs this month
    let targetAmount = 0;

    if (category.type === 'monthly_expense') {
      // Simple: just the monthly budget
      targetAmount = category.monthly_target;

    } else if (category.type === 'accumulation') {
      // Calculate expected YTD vs actual YTD, add catch-up
      const monthsElapsed = getMonthsElapsedThisYear(currentMonth);
      const expectedYTD = monthsElapsed * category.monthly_target;
      const actualYTD = getYTDFunded(category.id, currentMonth);
      const shortfall = Math.max(0, expectedYTD - actualYTD);

      // Don't exceed annual target
      const remainingAnnual = Math.max(0, category.annual_target - actualYTD);
      targetAmount = Math.min(
        category.monthly_target + shortfall,
        remainingAnnual
      );

    } else if (category.type === 'target_balance') {
      // Calculate gap to target, fund up to monthly contribution
      const gap = Math.max(0, category.target_balance - category.current_balance);
      targetAmount = Math.min(category.monthly_target, gap);
    }

    // How much have we already funded this month?
    const fundedThisMonth = getFundedThisMonth(category.id, currentMonth);
    const stillNeeded = Math.max(0, targetAmount - fundedThisMonth);

    if (stillNeeded > 0) {
      const allocate = Math.min(stillNeeded, remaining);

      // Update envelope balance
      updateCategoryBalance(category.id, category.current_balance + allocate);

      // Track funding for this month
      recordMonthlyFunding(category.id, currentMonth, allocate);

      remaining -= allocate;
    }
  }

  return remaining; // leftover money (suggest adding to buffer)
}
```

**Key Features:**
- ✅ Respects monthly funding tracking (doesn't refund already-funded categories)
- ✅ Handles catch-up for accumulation categories
- ✅ Calculates dynamic targets for target_balance categories
- ✅ Continues where it left off (incremental allocation)
- ✅ Works for weekly, bi-weekly, or irregular income

---

### 5. Income Buffer

**Purpose:** Smooth irregular income into a regular monthly rhythm

**How It Works:**

1. **User receives large payment** ($10,000)
2. **User chooses:**
   - "Allocate Now" → Runs smart allocation for current month
   - "Add to Buffer" → Moves money to Income Buffer category

3. **On 1st of each month** (if auto-fund enabled):
   ```
   💰 Income Buffer: $9,000

   Suggested Monthly Allocation for May:
   ├─ Priority 1 (Essentials): $1,600
   ├─ Priority 2 (Important): $800
   ├─ Priority 3 (Nice-to-have): $600
   ├─ Total: $3,000
   ├─ Remaining in buffer: $6,000

   [Apply Allocation] [Customize] [Skip This Month]
   ```

4. **User clicks "Apply Allocation"**
   - $3,000 moves from buffer to categories (by priority)
   - Buffer now has $6,000 for future months

**Benefits:**
- ✅ Converts irregular income into regular monthly rhythm
- ✅ Reduces decision fatigue
- ✅ Provides peace of mind (can see months of runway)
- ✅ User maintains control (can customize or skip)

**Use Cases:**
- Freelancers with project-based income
- Contract workers paid quarterly
- Commission-based workers with variable monthly income
- Anyone who wants to smooth income fluctuations

---

## Technical Architecture

### Database Schema Changes

#### 1. Categories Table Additions

```sql
-- Add new columns to existing categories table
ALTER TABLE categories ADD COLUMN category_type VARCHAR(20) DEFAULT 'monthly_expense';
  -- Options: 'monthly_expense', 'accumulation', 'target_balance'

ALTER TABLE categories ADD COLUMN priority INTEGER DEFAULT 5;
  -- 1-10, where 1 = highest priority

ALTER TABLE categories ADD COLUMN monthly_target DECIMAL(10,2);
  -- For all types: monthly budget or monthly contribution

ALTER TABLE categories ADD COLUMN annual_target DECIMAL(10,2);
  -- For accumulation only: annual goal

ALTER TABLE categories ADD COLUMN target_balance DECIMAL(10,2);
  -- For target_balance only: desired balance to maintain

ALTER TABLE categories ADD COLUMN notes TEXT;
  -- User notes explaining category purpose

-- Migrate existing data
UPDATE categories SET monthly_target = budget_amount WHERE monthly_target IS NULL;
```

**Field Usage by Category Type:**

| Field | Monthly Expense | Accumulation | Target Balance |
|-------|----------------|--------------|----------------|
| `monthly_target` | Monthly budget ($400) | Monthly contribution ($100) | Monthly contribution ($500) |
| `annual_target` | NULL | Annual goal ($1,200) | NULL |
| `target_balance` | NULL | NULL | Desired balance ($10,000) |

---

#### 2. New Table: category_monthly_funding

**Purpose:** Track how much has been allocated to each category each month

```sql
CREATE TABLE category_monthly_funding (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL, -- first day of month (e.g., '2024-04-01')
  target_amount DECIMAL(10,2), -- calculated target for this month
  funded_amount DECIMAL(10,2) DEFAULT 0, -- cumulative allocations this month
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category_id, month)
);

-- Indexes for performance
CREATE INDEX idx_category_monthly_funding_user_month ON category_monthly_funding(user_id, month);
CREATE INDEX idx_category_monthly_funding_category ON category_monthly_funding(category_id);
```

**How It's Used:**
- When user allocates $100 to Groceries, add $100 to `funded_amount` for current month
- When smart allocation runs, check `funded_amount` to see if category is already fully funded
- On month rollover, create new records with `funded_amount = 0` for new month

---

#### 3. New Table: user_feature_flags

**Purpose:** Track which optional features each user has enabled

```sql
CREATE TABLE user_feature_flags (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature_name VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT false,
  enabled_at TIMESTAMP,
  disabled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

-- Index for quick lookups
CREATE INDEX idx_user_feature_flags_user ON user_feature_flags(user_id);
```

**Available Features:**
- `monthly_funding_tracking` - Track funded amounts per month
- `category_types` - Enable monthly_expense, accumulation, target_balance types
- `priority_system` - Priority-based category ordering
- `smart_allocation` - Automated allocation by priority
- `income_buffer` - Income smoothing buffer category
- `advanced_reporting` - Enhanced reports and analytics

---

#### 4. Settings Table Additions

```sql
-- Add new columns to existing settings table
ALTER TABLE settings ADD COLUMN income_type VARCHAR(20) DEFAULT 'regular';
  -- Options: 'regular', 'variable'

ALTER TABLE settings ADD COLUMN auto_fund_from_buffer BOOLEAN DEFAULT false;
  -- Auto-suggest funding from income buffer on 1st of month

ALTER TABLE settings ADD COLUMN show_onboarding BOOLEAN DEFAULT true;
  -- Show onboarding tours for new features
```

---

#### 5. New Table: help_content (Optional - for dynamic help text)

```sql
CREATE TABLE help_content (
  id SERIAL PRIMARY KEY,
  feature_name VARCHAR(50) NOT NULL,
  content_type VARCHAR(20) NOT NULL, -- 'tooltip', 'panel', 'tour', 'article'
  title VARCHAR(200),
  content TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_help_content_feature ON help_content(feature_name, content_type);
```

**Note:** This table is optional. Help content can also be hardcoded in the frontend for simplicity.

---

### Scheduled Jobs System

**Purpose:** Track and monitor automated background jobs (cron jobs)

**Jobs:**

1. **monthly-funding-rollover** - Runs on 1st of each month at 00:00 UTC
   - Creates new `category_monthly_funding` records for the new month
   - Resets `funded_amount` to 0 for all categories
   - Copies `monthly_target` from categories table
   - Duration: ~1-5 seconds depending on user count

2. **income-buffer-auto-fund** - Runs on 1st of each month at 01:00 UTC
   - For users with `auto_fund_from_buffer` enabled
   - Suggests or auto-funds categories from income buffer
   - Sends notification to user
   - Duration: ~2-10 seconds depending on user count

**Job Monitoring:**
- Each job logs start time, end time, status, and errors to `scheduled_jobs` table
- Dashboard shows job health (last run, next run, failure count)
- Alerts sent if job fails or doesn't run on schedule
- Admin page shows full job history and logs
- Metrics tracked: run count, failure count, average duration

**Implementation Options:**
- **Supabase Edge Functions** with cron triggers (recommended for Supabase users)
- **Vercel Cron Jobs** (if deployed on Vercel)
- **node-cron** for self-hosted deployments
- **GitHub Actions** as fallback

**Job Execution Flow:**
```javascript
async function runScheduledJob(jobName, jobFunction) {
  const startTime = Date.now();

  try {
    // Mark job as running
    await updateJobStatus(jobName, 'running', null);

    // Execute the job
    await jobFunction();

    // Mark job as successful
    const duration = Date.now() - startTime;
    await updateJobStatus(jobName, 'success', duration);

  } catch (error) {
    // Mark job as failed
    const duration = Date.now() - startTime;
    await updateJobStatus(jobName, 'failed', duration, error.message);

    // Send alert to admins
    await sendJobFailureAlert(jobName, error);
  }
}
```

**Admin Monitoring API:**
- `GET /api/admin/scheduled-jobs` - List all jobs with status
- `GET /api/admin/scheduled-jobs/:jobName/history` - Get job execution history
- `POST /api/admin/scheduled-jobs/:jobName/run` - Manually trigger a job

---

### API Endpoints

#### Category Management

**GET /api/categories**
- Returns categories with all new fields
- Respects feature flags (hides fields if features disabled)

**PATCH /api/categories/:id**
- Updates category including new fields
- Validates category_type and related fields

**POST /api/categories/reorder**
- Updates display_order for drag-and-drop
- Also updates priority if priority_system enabled

---

#### Allocation

**POST /api/allocations/smart-allocate**
```json
{
  "amount": 2500.00,
  "month": "2024-04-01",
  "preview": true  // if true, returns preview without saving
}
```

**Response:**
```json
{
  "allocations": [
    {
      "category_id": 1,
      "category_name": "Rent",
      "priority": 1,
      "amount": 1000.00,
      "funded_before": 0,
      "funded_after": 1000.00,
      "target": 1000.00,
      "fully_funded": true
    },
    // ... more allocations
  ],
  "total_allocated": 2500.00,
  "remaining": 0
}
```

**POST /api/allocations/manual**
```json
{
  "category_id": 1,
  "amount": 100.00,
  "month": "2024-04-01"
}
```

---

#### Monthly Funding

**GET /api/monthly-funding/:month**
- Returns funding status for all categories for specified month
- Includes target_amount, funded_amount, remaining for each category

**GET /api/monthly-funding/ytd/:category_id**
- Returns year-to-date funded amount for accumulation categories

---

#### Feature Flags

**GET /api/features**
- Returns all available features and their enabled status for current user

**POST /api/features/:feature_name/toggle**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "feature_name": "monthly_funding_tracking",
  "enabled": true,
  "enabled_at": "2024-04-15T10:30:00Z",
  "requires_confirmation": false,
  "warning_message": null
}
```

---

### Frontend Components

#### New Components

**1. CategoryTypeSelector**
```tsx
<CategoryTypeSelector
  value={categoryType}
  onChange={setCategoryType}
  disabled={!featureEnabled('category_types')}
/>
```

**2. PrioritySelector**
```tsx
<PrioritySelector
  value={priority}
  onChange={setPriority}
  disabled={!featureEnabled('priority_system')}
/>
```

**3. SmartAllocationWizard**
```tsx
<SmartAllocationWizard
  availableAmount={2500}
  onAllocate={handleAllocate}
  onCancel={handleCancel}
/>
```

**4. FundingProgressIndicator**
```tsx
<FundingProgressIndicator
  category={category}
  month={currentMonth}
  showMonthlyFunding={featureEnabled('monthly_funding_tracking')}
/>
```

**5. FeatureToggle**
```tsx
<FeatureToggle
  feature={feature}
  enabled={isEnabled}
  onToggle={handleToggle}
/>
```

**6. HelpTooltip**
```tsx
<HelpTooltip content="Brief explanation of this feature">
  <InfoIcon className="h-4 w-4" />
</HelpTooltip>
```

**7. HelpPanel**
```tsx
<HelpPanel
  title="What is Smart Allocation?"
  content={<SmartAllocationHelp />}
  learnMoreUrl="/help/smart-allocation"
/>
```

---

## Feature Flag System

### Philosophy

**Progressive Disclosure:** Start simple, add complexity as needed.

The app should be immediately usable for basic envelope budgeting, with advanced features available as opt-in enhancements. This approach:
- ✅ Reduces initial learning curve
- ✅ Prevents overwhelming new users
- ✅ Allows users to grow into advanced features
- ✅ Keeps the app simple for those who don't need complexity

### Feature Levels

**Level 1: Basic User (Default)**
- Simple envelope budgeting
- Categories with balances
- Manual allocation
- Transaction tracking
- No complex features visible

**Level 2: Intermediate User (Opt-in)**
- + Monthly Funding Tracking
- + Category Types
- Better progress tracking
- Still manual allocation

**Level 3: Advanced User (Opt-in)**
- + Priority System
- + Smart Allocation
- Automated allocation suggestions
- Better for variable income

**Level 4: Power User (Opt-in)**
- + Income Buffer
- + Advanced Reporting
- Full feature set
- Maximum control and insights

### Feature Definitions

#### 1. Monthly Funding Tracking
**Status:** Foundation feature (Phase 1)

**Description:** Track how much you've allocated to each category this month, separate from the current balance.

**Benefits:**
- See funding progress throughout the month
- Prevent over-allocation
- Enable incremental allocation (allocate each paycheck as it arrives)
- Foundation for smart allocation

**Best For:**
- Weekly/bi-weekly salary workers
- Anyone who wants better visibility into funding status
- Users who allocate multiple times per month

**Dependencies:** None

**Data Impact:** Creates `category_monthly_funding` records. Disabling stops tracking new data but preserves historical data.

**Default State:** Disabled (users opt-in)

**Recommended For:** All users after 1 month of usage

---

#### 2. Category Types
**Status:** Core enhancement (Phase 2)

**Description:** Categorize your envelopes as Monthly Expenses (spend each month), Accumulation (save for periodic expenses), or Target Balance (build a buffer).

**Benefits:**
- Accurate progress tracking for different category purposes
- Better understanding of your budget structure
- Foundation for smart allocation catch-up logic
- Clearer reporting

**Best For:**
- Users with periodic expenses (annual insurance, quarterly taxes)
- Users building emergency funds or buffers
- Anyone who wants more accurate progress tracking

**Dependencies:** Recommended to enable Monthly Funding Tracking first

**Data Impact:** Adds fields to categories. Disabling hides fields but preserves data.

**Default State:** Disabled (users opt-in)

**Recommended For:** Users after 2 months of usage, or users with variable expenses

---

#### 3. Priority System
**Status:** Advanced feature (Phase 3)

**Description:** Assign priority levels (1-10) to categories to define funding order when money is limited.

**Benefits:**
- Ensures essentials are funded first
- Automates complex allocation decisions
- Reduces decision fatigue
- Critical for variable income

**Best For:**
- Variable income users
- Users who struggle with allocation decisions
- Users who want to ensure essentials are always covered

**Dependencies:** Requires Category Types

**Data Impact:** Adds priority field to categories. Disabling hides field but preserves data.

**Default State:** Disabled (users opt-in)

**Recommended For:** Variable income users, users with allocation anxiety

---

#### 4. Smart Allocation
**Status:** Advanced feature (Phase 3)

**Description:** Automatically allocate available funds to categories based on priority, category type, and funding status.

**Benefits:**
- Saves time (one-click allocation)
- Ensures optimal allocation by priority
- Handles catch-up for accumulation categories
- Respects monthly funding limits

**Best For:**
- Variable income users
- Users with many categories
- Users who allocate frequently
- Users who want to reduce decision fatigue

**Dependencies:** Requires Priority System and Category Types

**Data Impact:** No data stored (just performs allocations)

**Default State:** Disabled (users opt-in)

**Recommended For:** Users with Priority System enabled and 10+ categories

---

#### 5. Income Buffer
**Status:** Power user feature (Phase 4)

**Description:** Create a special buffer category to smooth irregular income into a regular monthly rhythm.

**Benefits:**
- Converts large, infrequent payments into regular monthly funding
- Provides "months of runway" visibility
- Reduces financial stress
- Automates monthly funding (optional)

**Best For:**
- Freelancers with project-based income
- Contract workers paid quarterly
- Commission-based workers
- Anyone with highly variable income

**Dependencies:** Requires Smart Allocation

**Data Impact:** Creates Income Buffer category. Disabling converts it to regular category.

**Default State:** Disabled (users opt-in)

**Recommended For:** Users with income variance > 50% month-to-month

---

#### 6. Advanced Reporting
**Status:** Power user feature (Phase 5)

**Description:** Detailed analytics including funding progress reports, accumulation tracking, income volatility analysis, and priority funding heatmaps.

**Benefits:**
- Deeper insights into budget performance
- Track trends over time
- Identify optimization opportunities
- Better forecasting

**Best For:**
- Data-driven users
- Users who want to optimize their budget
- Users tracking multiple goals

**Dependencies:** Requires Category Types

**Data Impact:** No data stored (just displays existing data differently)

**Default State:** Disabled (users opt-in)

**Recommended For:** Users after 3+ months of usage

---

### Feature Toggle UI

**Settings > Features Page:**

```
┌─────────────────────────────────────────────────────────────┐
│ Features                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Your Feature Level: Basic                                   │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 Monthly Funding Tracking          [Toggle] RECOMMENDED│ │
│ │                                                           │ │
│ │ Track how much you've allocated to each category this    │ │
│ │ month, separate from the current balance.                │ │
│ │                                                           │ │
│ │ ✓ See funding progress throughout the month              │ │
│ │ ✓ Prevent over-allocation                                │ │
│ │ ✓ Allocate each paycheck as it arrives                   │ │
│ │                                                           │ │
│ │ Best for: Weekly/bi-weekly salary workers, anyone who    │ │
│ │ allocates multiple times per month                       │ │
│ │                                                           │ │
│ │ [Learn More] [Enable Feature]                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏷️  Category Types                              [Toggle] │ │
│ │                                                           │ │
│ │ Categorize envelopes as Monthly Expenses, Accumulation,  │ │
│ │ or Target Balance for better progress tracking.          │ │
│ │                                                           │ │
│ │ Requires: Monthly Funding Tracking                       │ │
│ │                                                           │ │
│ │ [Learn More] [Enable Feature]                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎯 Priority System & Smart Allocation       [Toggle]     │ │
│ │                                                           │ │
│ │ Automatically allocate funds by priority to ensure       │ │
│ │ essentials are funded first.                             │ │
│ │                                                           │ │
│ │ Requires: Category Types                                 │ │
│ │ Best for: Variable income, multiple paychecks per month  │ │
│ │                                                           │ │
│ │ [Learn More] [Enable Feature]                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💰 Income Buffer                                [Toggle] │ │
│ │                                                           │ │
│ │ Smooth irregular income with a buffer category that      │ │
│ │ converts large payments into regular monthly funding.    │ │
│ │                                                           │ │
│ │ Requires: Smart Allocation                               │ │
│ │ Best for: Freelancers, contractors, commission-based     │ │
│ │                                                           │ │
│ │ [Learn More] [Enable Feature]                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📈 Advanced Reporting                           [Toggle] │ │
│ │                                                           │ │
│ │ Detailed analytics and insights including funding        │ │
│ │ progress, accumulation tracking, and income analysis.    │ │
│ │                                                           │ │
│ │ Requires: Category Types                                 │ │
│ │                                                           │ │
│ │ [Learn More] [Enable Feature]                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Feature Toggle Warnings

When disabling features that could impact data:

**Disabling Monthly Funding Tracking:**
```
⚠️ Disable Monthly Funding Tracking?

Disabling this feature will stop tracking monthly funding amounts.

Impact:
• Historical funding data will be preserved but hidden
• You will no longer see "Funded This Month" progress
• Smart Allocation will be disabled (requires this feature)

You can re-enable this feature at any time without losing data.

[Cancel] [Disable Feature]
```

**Disabling Priority System:**
```
⚠️ Disable Priority System?

Disabling this feature will hide category priorities.

Impact:
• Priority values will be preserved but hidden
• Smart Allocation will be disabled (requires this feature)
• Categories will be ordered by display order only

You can re-enable this feature at any time without losing data.

[Cancel] [Disable Feature]
```

---

## Help System

### Philosophy

**Just-in-Time Learning:** Provide help when and where users need it, without overwhelming them upfront.

Users should be able to:
- Understand what a feature does before enabling it
- Get contextual help while using a feature
- Access detailed documentation when needed
- Learn through guided tours for complex workflows

### Help Text Locations

#### 1. Inline Tooltips
**Purpose:** Brief explanations for UI elements

**Example:**
```tsx
<div className="flex items-center gap-2">
  <Label>Category Type</Label>
  <HelpTooltip content="Choose how this category should behave: Monthly Expense (spend each month), Accumulation (save for periodic expenses), or Target Balance (build a buffer)." />
</div>
```

**Locations:**
- Category type selector
- Priority field
- Monthly target vs annual target
- Target balance field
- Smart allocation button
- Income buffer toggle

---

#### 2. Help Panels
**Purpose:** Expandable sections with detailed explanations

**Example:**
```tsx
<Collapsible>
  <CollapsibleTrigger>
    <HelpCircle className="h-4 w-4" />
    What is Smart Allocation?
  </CollapsibleTrigger>
  <CollapsibleContent>
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>
        Smart Allocation automatically distributes your available funds
        to categories based on priority, ensuring essentials are funded first.
      </p>
      <ul className="list-disc pl-4 space-y-1">
        <li>Funds categories in priority order (1-10)</li>
        <li>Respects monthly funding limits (won't overfund)</li>
        <li>Handles catch-up for accumulation categories</li>
        <li>Stops funding target balance categories when target is reached</li>
      </ul>
      <Link href="/help/smart-allocation" className="text-primary">
        Learn more →
      </Link>
    </div>
  </CollapsibleContent>
</Collapsible>
```

**Locations:**
- Features settings page (each feature)
- Category edit dialog (category types explanation)
- Allocation page (smart allocation explanation)
- Dashboard (income buffer explanation)

---

#### 3. Guided Tours
**Purpose:** Step-by-step walkthroughs for complex workflows

**Example Tours:**

**Tour 1: Setting Up Category Types**
```javascript
const categoryTypesTour = [
  {
    target: '#category-list',
    title: 'Your Budget Categories',
    content: 'These are your budget categories. Let\'s set up category types to get better progress tracking.',
  },
  {
    target: '#edit-category-btn',
    title: 'Edit a Category',
    content: 'Click the edit button on any category to set its type.',
  },
  {
    target: '#category-type-selector',
    title: 'Choose Category Type',
    content: 'Select Monthly Expense for regular spending, Accumulation for periodic expenses, or Target Balance for buffers.',
  },
  {
    target: '#monthly-target-field',
    title: 'Set Monthly Target',
    content: 'Enter how much you want to budget or save for this category each month.',
  },
  {
    target: '#save-category-btn',
    title: 'Save Changes',
    content: 'Save your changes. Repeat for other categories to get the full benefit!',
  },
];
```

**Tour 2: Using Smart Allocation**
```javascript
const smartAllocationTour = [
  {
    target: '#allocate-btn',
    title: 'Allocate Funds',
    content: 'Click here to allocate your available funds to categories.',
  },
  {
    target: '#smart-allocate-option',
    title: 'Try Smart Allocation',
    content: 'Smart Allocation automatically distributes funds by priority. Let\'s try it!',
  },
  {
    target: '#allocation-preview',
    title: 'Preview Allocation',
    content: 'Review how funds will be distributed. You can customize before applying.',
  },
  {
    target: '#apply-allocation-btn',
    title: 'Apply Allocation',
    content: 'Click to apply the allocation. Your categories will be funded by priority!',
  },
];
```

**Trigger Conditions:**
- First time enabling a feature
- First time visiting a page with new features
- User can manually trigger from help menu

---

#### 4. Documentation Pages
**Purpose:** Comprehensive guides and reference material

**Pages to Create:**

**`/help/category-types`**
- What are category types?
- When to use each type
- Examples for each type
- How to set up category types
- FAQ

**`/help/smart-allocation`**
- What is smart allocation?
- How does it work?
- Setting up priorities
- Customizing allocation
- FAQ

**`/help/income-buffer`**
- What is the income buffer?
- Who should use it?
- How to set it up
- Best practices
- FAQ

**`/help/monthly-funding-tracking`**
- What is monthly funding tracking?
- Benefits
- How it works
- FAQ

**`/help/variable-income`**
- Budgeting with variable income
- Recommended features
- Setup guide
- Example workflows
- FAQ

---

### Help Text Examples

#### Category Types

**Tooltip:**
"Choose how this category should behave: Monthly Expense (spend each month), Accumulation (save for periodic expenses), or Target Balance (build a buffer)."

**Help Panel:**
```
What are Category Types?

Category types help you track progress more accurately by defining
how each category should behave.

Monthly Expense
• For regular monthly spending (groceries, gas, utilities)
• Progress shows: Spending vs. monthly budget
• No catch-up if underfunded last month

Accumulation
• For periodic expenses (annual insurance, vacation)
• Progress shows: Total funded YTD vs. annual goal
• Catches up if underfunded to stay on track

Target Balance
• For building buffers (emergency fund, medical reserve)
• Progress shows: Current balance vs. target balance
• Stops funding when target is reached

Learn more about category types →
```

---

#### Priority System

**Tooltip:**
"Priority determines funding order (1 = highest). Essentials should be priority 1-3, discretionary spending should be priority 7-10."

**Help Panel:**
```
What is the Priority System?

Priorities ensure your most important categories are funded first,
especially helpful when money is limited.

Recommended Priority Structure:

Priority 1-3: Essentials (Must Fund)
• Rent/Mortgage, Utilities, Groceries
• These should always be funded first

Priority 4-6: Important (Should Fund)
• Insurance, Transportation, Phone
• Fund after essentials are covered

Priority 7-8: Savings (Nice to Fund)
• Emergency Fund, Vacation, Car Maintenance
• Fund when you have extra money

Priority 9-10: Discretionary (Fund if Possible)
• Dining Out, Entertainment, Hobbies
• Only fund after everything else is covered

Learn more about priorities →
```

---

#### Smart Allocation

**Tooltip:**
"Automatically allocate funds by priority. Categories are funded in order until money runs out or all targets are met."

**Help Panel:**
```
What is Smart Allocation?

Smart Allocation automatically distributes your available funds to
categories based on priority, category type, and funding status.

How it works:
1. Sorts categories by priority (1 = highest)
2. For each category, calculates how much is needed this month
3. Allocates funds until category is fully funded or money runs out
4. Moves to next priority level
5. Returns any leftover money

Smart features:
✓ Won't refund already-funded categories (respects monthly funding)
✓ Handles catch-up for accumulation categories (if behind schedule)
✓ Stops at target for target balance categories (won't overfund)
✓ Shows preview before applying (you can customize)

Best for:
• Variable income users
• Users with many categories
• Anyone who wants to save time on allocation

Learn more about smart allocation →
```

---

#### Income Buffer

**Tooltip:**
"The Income Buffer smooths irregular income by storing large payments and releasing funds monthly."

**Help Panel:**
```
What is the Income Buffer?

The Income Buffer is a special category that helps you convert
irregular income into a regular monthly rhythm.

How it works:
1. When you receive a large payment, add it to the Income Buffer
2. On the 1st of each month, transfer funds from buffer to categories
3. This creates a predictable monthly funding pattern

Example:
• April 1: Receive $10,000 contract payment
• Add to Income Buffer: $10,000
• May 1: Transfer $3,000 from buffer to fund May categories
• June 1: Transfer $3,000 from buffer to fund June categories
• July 1: Transfer $3,000 from buffer to fund July categories
• Buffer remaining: $1,000

Benefits:
✓ Reduces financial stress (know you're covered for X months)
✓ Creates regular monthly rhythm despite irregular income
✓ Automates monthly funding (optional)
✓ Provides "months of runway" visibility

Best for:
• Freelancers with project-based income
• Contract workers paid quarterly
• Commission-based workers
• Anyone with highly variable income

Learn more about income buffer →
```

---

### Onboarding Flow

#### New User Onboarding

**Step 1: Welcome**
```
Welcome to Budget App!

Let's get you set up with envelope budgeting.

We'll start with the basics:
• Create your budget categories
• Add your accounts
• Start tracking transactions

Advanced features (like smart allocation and income buffer)
can be enabled later in Settings > Features.

[Get Started]
```

**Step 2: Create Categories**
```
Create Your Budget Categories

Add categories for your spending (Groceries, Rent, Gas, etc.)

For now, just add the category name and monthly budget.
You can set up category types and priorities later.

[Add Category]
```

**Step 3: Add Accounts**
```
Add Your Accounts

Connect your bank accounts or add them manually.

This helps you track your total available funds.

[Add Account]
```

**Step 4: First Allocation**
```
Allocate Your Funds

You have $2,500 available to allocate.

Click on a category and enter how much to allocate.
Try to allocate all your available funds to categories.

Tip: You can enable Smart Allocation later to automate this!

[Start Allocating]
```

---

#### Feature Onboarding

**When user enables Monthly Funding Tracking:**
```
✓ Monthly Funding Tracking Enabled!

You'll now see "Funded This Month" progress for each category.

This helps you:
• Track funding progress throughout the month
• Prevent over-allocation
• Allocate each paycheck as it arrives

Try it: Allocate some funds and watch the progress update!

[Got It]
```

**When user enables Category Types:**
```
✓ Category Types Enabled!

You can now set a type for each category:
• Monthly Expense - Regular monthly spending
• Accumulation - Save for periodic expenses
• Target Balance - Build a buffer

Let's set up your first category type.

[Set Up Category Types] [Do This Later]
```

**When user enables Smart Allocation:**
```
✓ Smart Allocation Enabled!

You can now automatically allocate funds by priority!

First, set priorities for your categories:
• Priority 1-3: Essentials (must fund)
• Priority 4-6: Important (should fund)
• Priority 7-10: Discretionary (nice to fund)

Then click "Smart Allocate" to automatically distribute funds.

[Set Up Priorities] [Take a Tour]
```

---

## Implementation Phases

### Phase 1: Foundation (3-4 weeks)
**Goal:** Establish monthly funding tracking and feature flag system

This phase benefits ALL users and provides the foundation for all future features.

#### Database Tasks
- [ ] Create `category_monthly_funding` table with indexes
- [ ] Create `user_feature_flags` table with indexes
- [ ] Add `income_type` and `auto_fund_from_buffer` to settings table
- [ ] Write migration scripts with rollback capability
- [ ] Test migrations on development database

#### Backend Tasks
- [ ] Create API endpoint: `GET /api/monthly-funding/:month`
- [ ] Create API endpoint: `POST /api/allocations/manual` (with monthly tracking)
- [ ] Create API endpoint: `GET /api/features`
- [ ] Create API endpoint: `POST /api/features/:feature_name/toggle`
- [ ] Update existing allocation logic to record monthly funding
- [ ] Create helper functions: `getFundedThisMonth()`, `recordMonthlyFunding()`
- [ ] Add feature flag middleware to check enabled features
- [ ] Write unit tests for monthly funding tracking
- [ ] Write unit tests for feature flag system

#### Frontend Tasks
- [ ] Create `FeatureContext` for managing feature flags
- [ ] Create `useFeature()` hook for checking if feature is enabled
- [ ] Create `HelpTooltip` component
- [ ] Create `HelpPanel` component
- [ ] Create `FeatureToggle` component
- [ ] Create Settings > Features page
- [ ] Add "Funded This Month" display to category cards (when feature enabled)
- [ ] Add funding progress bar to category cards (when feature enabled)
- [ ] Update allocation dialog to show monthly funding status
- [ ] Write component tests

#### Documentation Tasks
- [ ] Write help text for Monthly Funding Tracking feature
- [ ] Create `/help/monthly-funding-tracking` documentation page
- [ ] Add tooltips to relevant UI elements
- [ ] Create onboarding flow for enabling Monthly Funding Tracking

#### Testing Tasks
- [ ] Test enabling/disabling Monthly Funding Tracking
- [ ] Test allocation with monthly funding tracking enabled
- [ ] Test allocation with monthly funding tracking disabled
- [ ] Test month rollover (funded_amount resets)
- [ ] Test feature flag persistence
- [ ] User acceptance testing

**Deliverables:**
- ✅ Monthly funding tracking working for all users who enable it
- ✅ Feature flag system in place
- ✅ Settings > Features page functional
- ✅ Help system components created
- ✅ All tests passing

---

### Phase 2: Category Types (2-3 weeks)
**Goal:** Enable different category types with appropriate progress tracking

#### Database Tasks
- [ ] Add `category_type`, `monthly_target`, `annual_target`, `target_balance`, `notes` to categories table
- [ ] Migrate existing `budget_amount` to `monthly_target`
- [ ] Write migration scripts with rollback capability
- [ ] Test migrations on development database

#### Backend Tasks
- [ ] Update `GET /api/categories` to include new fields
- [ ] Update `PATCH /api/categories/:id` to validate category type fields
- [ ] Create helper function: `getYTDFunded(category_id, month)`
- [ ] Create helper function: `calculateMonthlyTarget(category, month)` (handles catch-up)
- [ ] Update category validation logic
- [ ] Write unit tests for category type logic
- [ ] Write unit tests for YTD calculation

#### Frontend Tasks
- [ ] Create `CategoryTypeSelector` component
- [ ] Update category edit dialog to include category type fields
- [ ] Create `FundingProgressIndicator` component (type-aware)
- [ ] Update category cards to show type-specific progress
- [ ] Add category type icons (💰 📈 🎯)
- [ ] Create category type filter/grouping option
- [ ] Write component tests

#### Documentation Tasks
- [ ] Write help text for Category Types feature
- [ ] Create `/help/category-types` documentation page
- [ ] Add tooltips for each category type
- [ ] Add help panel in category edit dialog
- [ ] Create guided tour for setting up category types
- [ ] Create onboarding flow for enabling Category Types

#### Testing Tasks
- [ ] Test creating categories with each type
- [ ] Test editing category types
- [ ] Test progress display for each type
- [ ] Test YTD calculation for accumulation categories
- [ ] Test target balance logic
- [ ] Test month rollover for each type
- [ ] User acceptance testing

**Deliverables:**
- ✅ Three category types working correctly
- ✅ Type-specific progress tracking
- ✅ YTD tracking for accumulation categories
- ✅ Target balance tracking
- ✅ Comprehensive help documentation
- ✅ All tests passing

---

### Phase 3: Priority System & Smart Allocation (3-4 weeks)
**Goal:** Enable automated allocation by priority

#### Database Tasks
- [ ] Add `priority` field to categories table (default 5)
- [ ] Write migration scripts with rollback capability
- [ ] Test migrations on development database

#### Backend Tasks
- [ ] Create API endpoint: `POST /api/allocations/smart-allocate`
- [ ] Implement smart allocation algorithm
- [ ] Add preview mode (returns allocation plan without saving)
- [ ] Create helper function: `getCategoriesSortedByPriority()`
- [ ] Create helper function: `calculateCategoryTarget(category, month)`
- [ ] Handle catch-up logic for accumulation categories
- [ ] Handle target balance logic
- [ ] Write unit tests for smart allocation algorithm
- [ ] Write unit tests for priority sorting
- [ ] Write unit tests for catch-up logic

#### Frontend Tasks
- [ ] Create `PrioritySelector` component
- [ ] Update category edit dialog to include priority field
- [ ] Create `SmartAllocationWizard` component
- [ ] Create allocation preview UI
- [ ] Add "Smart Allocate" button to allocation page
- [ ] Add priority badges to category cards
- [ ] Create priority-based category sorting option
- [ ] Add customization options to allocation preview
- [ ] Write component tests

#### Documentation Tasks
- [ ] Write help text for Priority System feature
- [ ] Write help text for Smart Allocation feature
- [ ] Create `/help/priority-system` documentation page
- [ ] Create `/help/smart-allocation` documentation page
- [ ] Add tooltips for priority field
- [ ] Add help panel in smart allocation wizard
- [ ] Create guided tour for setting up priorities
- [ ] Create guided tour for using smart allocation
- [ ] Create onboarding flow for enabling Priority System
- [ ] Create onboarding flow for enabling Smart Allocation

#### Testing Tasks
- [ ] Test priority sorting
- [ ] Test smart allocation with various scenarios
- [ ] Test allocation preview
- [ ] Test customizing allocation
- [ ] Test catch-up for accumulation categories
- [ ] Test target balance stopping at target
- [ ] Test with insufficient funds
- [ ] Test with excess funds
- [ ] User acceptance testing

**Deliverables:**
- ✅ Priority system working
- ✅ Smart allocation algorithm functional
- ✅ Allocation preview and customization
- ✅ Catch-up logic for accumulation categories
- ✅ Comprehensive help documentation
- ✅ All tests passing

---

### Phase 4: Income Buffer (2-3 weeks)
**Goal:** Enable income smoothing for variable income users

#### Database Tasks
- [ ] No new tables needed (uses existing categories table)
- [ ] Create seed data for Income Buffer category (optional)

#### Backend Tasks
- [ ] Create API endpoint: `POST /api/income-buffer/add`
- [ ] Create API endpoint: `POST /api/income-buffer/fund-month`
- [ ] Create helper function: `getIncomeBufferBalance()`
- [ ] Create helper function: `calculateMonthsOfRunway()`
- [ ] Add auto-fund suggestion logic (runs on 1st of month)
- [ ] Write unit tests for income buffer logic
- [ ] Write unit tests for runway calculation

#### Frontend Tasks
- [ ] Create Income Buffer category (special category type)
- [ ] Create "Add to Buffer" option in allocation flow
- [ ] Create monthly funding suggestion dialog (shows on 1st of month)
- [ ] Add "Months of Runway" display to dashboard
- [ ] Create Income Buffer management page
- [ ] Add auto-fund toggle to settings
- [ ] Write component tests

#### Documentation Tasks
- [ ] Write help text for Income Buffer feature
- [ ] Create `/help/income-buffer` documentation page
- [ ] Add tooltips for income buffer
- [ ] Add help panel in income buffer setup
- [ ] Create guided tour for setting up income buffer
- [ ] Create onboarding flow for enabling Income Buffer
- [ ] Create example workflows for different user types

#### Testing Tasks
- [ ] Test adding funds to buffer
- [ ] Test funding month from buffer
- [ ] Test auto-fund suggestion
- [ ] Test months of runway calculation
- [ ] Test with various income patterns
- [ ] User acceptance testing

**Deliverables:**
- ✅ Income buffer functional
- ✅ Auto-fund suggestions working
- ✅ Months of runway calculation
- ✅ Comprehensive help documentation
- ✅ All tests passing

---

### Phase 5: Advanced Reporting (3-4 weeks)
**Goal:** Provide detailed insights and analytics

#### Backend Tasks
- [ ] Create API endpoint: `GET /api/reports/funding-progress/:month`
- [ ] Create API endpoint: `GET /api/reports/accumulation-progress/:year`
- [ ] Create API endpoint: `GET /api/reports/target-balance-status`
- [ ] Create API endpoint: `GET /api/reports/income-volatility`
- [ ] Create API endpoint: `GET /api/reports/priority-funding-heatmap`
- [ ] Implement report generation logic
- [ ] Write unit tests for report calculations

#### Frontend Tasks
- [ ] Create Reports page (new top-level page)
- [ ] Create Funding Progress Report component
- [ ] Create Accumulation Progress Report component
- [ ] Create Target Balance Status Report component
- [ ] Create Income Volatility Report component
- [ ] Create Priority Funding Heatmap component
- [ ] Add date range selector for reports
- [ ] Add export functionality (CSV, PDF)
- [ ] Write component tests

#### Documentation Tasks
- [ ] Write help text for Advanced Reporting feature
- [ ] Create `/help/advanced-reporting` documentation page
- [ ] Add tooltips for each report type
- [ ] Add help panels in reports page
- [ ] Create onboarding flow for enabling Advanced Reporting

#### Testing Tasks
- [ ] Test each report type
- [ ] Test with various date ranges
- [ ] Test export functionality
- [ ] Test with edge cases (no data, partial data)
- [ ] User acceptance testing

**Deliverables:**
- ✅ Five report types functional
- ✅ Export functionality working
- ✅ Comprehensive help documentation
- ✅ All tests passing

---

## Testing Strategy

### Unit Tests

**Backend:**
- Monthly funding tracking functions
- Feature flag logic
- Category type validation
- Smart allocation algorithm
- YTD calculation
- Catch-up logic
- Target balance logic
- Income buffer functions
- Report calculations

**Frontend:**
- Feature context and hooks
- Category type selector
- Priority selector
- Smart allocation wizard
- Funding progress indicators
- Help components
- Feature toggle components

**Coverage Goal:** 80%+ code coverage

---

### Integration Tests

**API Integration:**
- Allocation flow with monthly funding tracking
- Smart allocation end-to-end
- Feature flag toggling
- Category CRUD with new fields
- Income buffer operations
- Report generation

**Database Integration:**
- Migration scripts (up and down)
- Data integrity constraints
- Cascade deletes
- Index performance

---

### User Acceptance Testing

**Test Scenarios:**

**Scenario 1: Weekly Salary User**
```
Given: User receives weekly paychecks
When: User enables Monthly Funding Tracking
Then: User can allocate each paycheck incrementally
And: Dashboard shows funding progress throughout month
And: Categories don't get refunded after spending
```

**Scenario 2: Variable Income User**
```
Given: User has irregular income
When: User enables Priority System and Smart Allocation
Then: User can set priorities for categories
And: Smart allocation funds essentials first
And: User can preview allocation before applying
```

**Scenario 3: Accumulation Category**
```
Given: User has annual insurance premium
When: User creates Accumulation category with $1,200 annual target
Then: Progress shows YTD funded vs annual target
And: System catches up if underfunded in previous months
And: Progress is based on total funded, not current balance
```

**Scenario 4: Target Balance Category**
```
Given: User wants to build $10,000 emergency fund
When: User creates Target Balance category
Then: Category funds until balance reaches $10,000
And: Funding stops when target is reached
And: Funding resumes if balance drops below target
```

**Scenario 5: Income Buffer**
```
Given: User receives $10,000 quarterly payment
When: User adds to Income Buffer
Then: User can fund each month from buffer
And: Dashboard shows months of runway
And: Auto-fund suggestion appears on 1st of month
```

---

### Performance Testing

**Load Testing:**
- Smart allocation with 100+ categories
- Report generation with 12+ months of data
- Dashboard rendering with all features enabled
- API response times under load

**Optimization Targets:**
- Smart allocation: < 500ms for 50 categories
- Report generation: < 2s for 12 months of data
- Dashboard load: < 1s with all features enabled
- API endpoints: < 200ms average response time

---

### Migration Testing

**Test Cases:**
- Migrate from basic to all features enabled
- Migrate with existing data (categories, transactions, allocations)
- Rollback migrations successfully
- Data integrity after migration
- Performance after migration

---

## Rollout Plan

### Phase 1: Internal Testing (1 week)
- Deploy to staging environment
- Internal team testing
- Fix critical bugs
- Performance optimization

### Phase 2: Beta Testing (2-3 weeks)
- Invite 10-20 beta users
- Collect feedback
- Monitor usage patterns
- Identify pain points
- Iterate on UX

### Phase 3: Gradual Rollout (4-6 weeks)
- Release to 10% of users
- Monitor metrics (adoption, engagement, errors)
- Release to 25% of users
- Release to 50% of users
- Release to 100% of users

### Phase 4: Feature Promotion (Ongoing)
- In-app notifications for recommended features
- Email campaigns explaining benefits
- Blog posts with use cases
- Video tutorials
- User success stories

---

## Success Metrics

### Adoption Metrics
- % of users who enable each feature
- Time from signup to first feature enabled
- Feature adoption by user cohort (new vs existing)
- Feature combinations (which features are enabled together)

### Engagement Metrics
- Frequency of smart allocation usage
- Number of categories with types set
- Number of categories with priorities set
- Income buffer usage rate
- Report views per user

### Outcome Metrics
- User retention (do users with features enabled stay longer?)
- User satisfaction (NPS score by feature usage)
- Support tickets (do features reduce or increase support load?)
- Financial outcomes (do users report better financial health?)

### Technical Metrics
- API response times
- Error rates
- Database query performance
- Frontend load times

---

## Appendices

### Appendix A: Database Migration Scripts

#### Migration 001: Add Monthly Funding Tracking

**Up:**
```sql
-- Create category_monthly_funding table
CREATE TABLE category_monthly_funding (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  target_amount DECIMAL(10,2),
  funded_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, category_id, month)
);

CREATE INDEX idx_category_monthly_funding_user_month
  ON category_monthly_funding(user_id, month);
CREATE INDEX idx_category_monthly_funding_category
  ON category_monthly_funding(category_id);

-- Create user_feature_flags table
CREATE TABLE user_feature_flags (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature_name VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT false,
  enabled_at TIMESTAMP,
  disabled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

CREATE INDEX idx_user_feature_flags_user
  ON user_feature_flags(user_id);

-- Create scheduled_jobs table for cron job monitoring
CREATE TABLE scheduled_jobs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL UNIQUE,
  last_run_at TIMESTAMP,
  last_run_status VARCHAR(20), -- 'success', 'failed', 'running'
  last_run_duration_ms INTEGER,
  last_error TEXT,
  next_run_at TIMESTAMP,
  run_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scheduled_jobs_name ON scheduled_jobs(job_name);
CREATE INDEX idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at);

-- Add settings columns
ALTER TABLE settings ADD COLUMN income_type VARCHAR(20) DEFAULT 'regular';
ALTER TABLE settings ADD COLUMN auto_fund_from_buffer BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN show_onboarding BOOLEAN DEFAULT true;
```

**Down:**
```sql
DROP TABLE IF EXISTS category_monthly_funding;
DROP TABLE IF EXISTS user_feature_flags;
DROP TABLE IF EXISTS scheduled_jobs;
ALTER TABLE settings DROP COLUMN IF EXISTS income_type;
ALTER TABLE settings DROP COLUMN IF EXISTS auto_fund_from_buffer;
ALTER TABLE settings DROP COLUMN IF EXISTS show_onboarding;
```

---

#### Migration 002: Add Category Types

**Up:**
```sql
-- Add new columns to categories table
ALTER TABLE categories ADD COLUMN category_type VARCHAR(20) DEFAULT 'monthly_expense';
ALTER TABLE categories ADD COLUMN priority INTEGER DEFAULT 5;
ALTER TABLE categories ADD COLUMN monthly_target DECIMAL(10,2);
ALTER TABLE categories ADD COLUMN annual_target DECIMAL(10,2);
ALTER TABLE categories ADD COLUMN target_balance DECIMAL(10,2);
ALTER TABLE categories ADD COLUMN notes TEXT;

-- Migrate existing budget_amount to monthly_target
UPDATE categories SET monthly_target = budget_amount WHERE monthly_target IS NULL;

-- Add check constraint for category_type
ALTER TABLE categories ADD CONSTRAINT check_category_type
  CHECK (category_type IN ('monthly_expense', 'accumulation', 'target_balance'));

-- Add check constraint for priority
ALTER TABLE categories ADD CONSTRAINT check_priority
  CHECK (priority >= 1 AND priority <= 10);
```

**Down:**
```sql
ALTER TABLE categories DROP CONSTRAINT IF EXISTS check_category_type;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS check_priority;
ALTER TABLE categories DROP COLUMN IF EXISTS category_type;
ALTER TABLE categories DROP COLUMN IF EXISTS priority;
ALTER TABLE categories DROP COLUMN IF EXISTS monthly_target;
ALTER TABLE categories DROP COLUMN IF EXISTS annual_target;
ALTER TABLE categories DROP COLUMN IF EXISTS target_balance;
ALTER TABLE categories DROP COLUMN IF EXISTS notes;
```

---

### Appendix B: API Specifications

#### POST /api/allocations/smart-allocate

**Request:**
```json
{
  "amount": 2500.00,
  "month": "2024-04-01",
  "preview": true
}
```

**Response (Preview):**
```json
{
  "preview": true,
  "allocations": [
    {
      "category_id": 1,
      "category_name": "Rent",
      "category_type": "monthly_expense",
      "priority": 1,
      "current_balance": 0,
      "funded_this_month": 0,
      "target_amount": 1000.00,
      "allocation_amount": 1000.00,
      "new_balance": 1000.00,
      "new_funded_amount": 1000.00,
      "fully_funded": true
    },
    {
      "category_id": 2,
      "category_name": "Groceries",
      "category_type": "monthly_expense",
      "priority": 2,
      "current_balance": 50,
      "funded_this_month": 200,
      "target_amount": 400.00,
      "allocation_amount": 200.00,
      "new_balance": 250.00,
      "new_funded_amount": 400.00,
      "fully_funded": true
    },
    {
      "category_id": 3,
      "category_name": "Car Insurance",
      "category_type": "accumulation",
      "priority": 3,
      "current_balance": 200,
      "funded_this_month": 0,
      "funded_ytd": 300,
      "annual_target": 1200.00,
      "target_amount": 120.00,
      "allocation_amount": 120.00,
      "new_balance": 320.00,
      "new_funded_amount": 120.00,
      "fully_funded": true,
      "catch_up_amount": 20.00
    }
  ],
  "summary": {
    "total_available": 2500.00,
    "total_allocated": 1320.00,
    "remaining": 1180.00,
    "categories_funded": 3,
    "categories_partial": 0,
    "categories_unfunded": 7
  }
}
```

**Response (Applied):**
```json
{
  "preview": false,
  "allocations": [ /* same as preview */ ],
  "summary": { /* same as preview */ },
  "success": true,
  "message": "Successfully allocated $1,320.00 to 3 categories"
}
```

---

#### GET /api/monthly-funding/:month

**Request:**
```
GET /api/monthly-funding/2024-04-01
```

**Response:**
```json
{
  "month": "2024-04-01",
  "categories": [
    {
      "category_id": 1,
      "category_name": "Rent",
      "category_type": "monthly_expense",
      "priority": 1,
      "target_amount": 1000.00,
      "funded_amount": 1000.00,
      "current_balance": 0,
      "funding_percentage": 100,
      "fully_funded": true
    },
    {
      "category_id": 2,
      "category_name": "Groceries",
      "category_type": "monthly_expense",
      "priority": 2,
      "target_amount": 400.00,
      "funded_amount": 400.00,
      "current_balance": 250.00,
      "funding_percentage": 100,
      "fully_funded": true
    }
  ],
  "summary": {
    "total_target": 3200.00,
    "total_funded": 2500.00,
    "total_remaining": 700.00,
    "funding_percentage": 78
  }
}
```

---

### Appendix C: UI Mockups (Text Descriptions)

#### Smart Allocation Wizard

```
┌─────────────────────────────────────────────────────────────┐
│ Smart Allocation                                        [X] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Available to Allocate: $2,500.00                            │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Allocation Preview                                      │ │
│ │                                                         │ │
│ │ Priority 1 - Essentials                                 │ │
│ │ ├─ Rent                    $1,000.00  ✓ Fully Funded   │ │
│ │ ├─ Utilities                 $200.00  ✓ Fully Funded   │ │
│ │ └─ Groceries                 $400.00  ✓ Fully Funded   │ │
│ │                                                         │ │
│ │ Priority 2 - Important                                  │ │
│ │ ├─ Car Insurance             $120.00  ✓ Fully Funded   │ │
│ │ │  (includes $20 catch-up)                             │ │
│ │ ├─ Gas                       $150.00  ✓ Fully Funded   │ │
│ │ └─ Phone                      $80.00  ✓ Fully Funded   │ │
│ │                                                         │ │
│ │ Priority 3 - Savings                                    │ │
│ │ ├─ Emergency Fund            $500.00  ⚠ Partial (50%)  │ │
│ │ ├─ Vacation Fund              $50.00  ⚠ Partial (10%)  │ │
│ │ └─ Car Maintenance             $0.00  ✗ Not Funded     │ │
│ │                                                         │ │
│ │ Total Allocated: $2,500.00                              │ │
│ │ Remaining: $0.00                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ [Customize] [Cancel] [Apply Allocation]                     │
└─────────────────────────────────────────────────────────────┘
```

---

#### Category Edit Dialog (with Category Types)

```
┌─────────────────────────────────────────────────────────────┐
│ Edit Category                                           [X] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Category Name                                                │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Car Insurance                                            ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Category Type (i)                                            │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ○ Monthly Expense  ● Accumulation  ○ Target Balance     ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ℹ️ Accumulation Categories                              │ │
│ │                                                         │ │
│ │ Use this for periodic expenses like annual insurance,  │ │
│ │ quarterly taxes, or vacation funds. You'll save a      │ │
│ │ fixed amount each month toward an annual goal.         │ │
│ │                                                         │ │
│ │ Progress will show total funded YTD vs annual target.  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Monthly Contribution (i)                                     │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ $100.00                                                  ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Annual Target (i)                                            │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ $1,200.00                                                ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Priority (i)                                                 │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]                ││
│ │  ↑ Highest        ↑ Medium        ↑ Lowest              ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Notes                                                        │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Annual car insurance premium paid in June                ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ [Cancel] [Save Category]                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### Appendix D: Example User Workflows

#### Workflow 1: Freelancer with Project-Based Income

**User Profile:**
- Sarah, freelance graphic designer
- Income: $2,000 - $8,000/month (highly variable)
- Expenses: ~$3,500/month

**Setup:**
1. Enable Monthly Funding Tracking
2. Enable Category Types
3. Set up categories:
   - Rent ($1,200) - Monthly Expense, Priority 1
   - Utilities ($200) - Monthly Expense, Priority 1
   - Groceries ($400) - Monthly Expense, Priority 1
   - Health Insurance ($500) - Monthly Expense, Priority 2
   - Car Payment ($300) - Monthly Expense, Priority 2
   - Gas ($150) - Monthly Expense, Priority 3
   - Phone ($80) - Monthly Expense, Priority 3
   - Emergency Fund ($10,000 target) - Target Balance, Priority 4
   - Vacation Fund ($2,400 annual) - Accumulation, Priority 5
4. Enable Priority System & Smart Allocation
5. Enable Income Buffer

**Monthly Workflow:**

**April 1: Receive $6,000 project payment**
- Add $6,000 to Income Buffer
- Buffer balance: $6,000
- Months of runway: 1.7 months

**April 1: Auto-fund suggestion appears**
- System suggests funding April categories: $2,830
- Sarah clicks "Apply Allocation"
- All Priority 1-3 categories fully funded
- Emergency Fund receives $670
- Buffer balance: $3,170

**May 1: No income this month**
- Auto-fund suggestion appears
- System suggests funding May categories from buffer: $2,830
- Sarah clicks "Apply Allocation"
- Buffer balance: $340
- Months of runway: 0.1 months (warning!)

**May 15: Receive $8,000 project payment**
- Add $8,000 to Income Buffer
- Buffer balance: $8,340
- Months of runway: 2.9 months (relief!)

**June 1: Auto-fund suggestion**
- System suggests funding June categories: $2,830
- Sarah clicks "Apply Allocation"
- Buffer balance: $5,510
- Months of runway: 1.9 months

**Benefits for Sarah:**
- ✅ Never worries about which bills to pay first (priorities handle it)
- ✅ Can see months of runway (reduces anxiety)
- ✅ Automated monthly funding (saves time)
- ✅ Building emergency fund when income is good
- ✅ Clear visibility into financial health

---

#### Workflow 2: Bi-weekly Salary Worker

**User Profile:**
- Mike, retail manager
- Income: $2,000 every 2 weeks ($4,000/month)
- Expenses: ~$3,800/month

**Setup:**
1. Enable Monthly Funding Tracking
2. Set up categories with monthly budgets
3. No need for Priority System (regular income)

**Monthly Workflow:**

**April 1: Paycheck $2,000**
- Manually allocate to categories
- Rent: $1,200
- Groceries: $400
- Utilities: $200
- Gas: $150
- Phone: $50
- Dashboard shows: "Funded $2,000 of $3,800 (53%)"

**April 15: Paycheck $2,000**
- Manually allocate to remaining categories
- Car Insurance: $100
- Dining Out: $200
- Entertainment: $100
- Savings: $1,600
- Dashboard shows: "Funded $4,000 of $3,800 (105%)" ✓

**Benefits for Mike:**
- ✅ Can allocate immediately (doesn't wait until month-end)
- ✅ Sees funding progress throughout month
- ✅ Knows exactly how much more funding is needed
- ✅ Simple workflow (no complex features needed)

---

## Conclusion

This implementation plan provides a comprehensive roadmap for enhancing the budget application to serve users with variable income while maintaining simplicity for basic users.

**Key Success Factors:**
1. **Progressive Disclosure** - Start simple, add complexity as needed
2. **Opt-in Features** - Users choose which features to enable
3. **Comprehensive Help** - Guide users to make the best decisions
4. **Solid Foundation** - Monthly funding tracking benefits all users
5. **Phased Rollout** - Deliver value incrementally, validate each phase

**Timeline:** 12-16 weeks for full implementation

**Next Steps:**
1. Review and approve this implementation plan
2. Set up project tracking (GitHub Projects or similar)
3. Begin Phase 1: Foundation (Monthly Funding Tracking + Feature Flags)
4. Conduct user research to validate assumptions
5. Iterate based on feedback

---

**Document Version:** 1.0
**Last Updated:** 2025-11-22
**Author:** Budget App Team
**Status:** Approved - Ready for Implementation


