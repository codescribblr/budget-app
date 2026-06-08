# Recurring Transactions Feature - Implementation Plan

## Overview

This document outlines the comprehensive plan to add recurring transaction detection, tracking, and management to the budget app. This feature will help users understand their financial patterns, manage subscriptions, and receive proactive notifications about upcoming recurring expenses.

## Goals

1. **Automatic Detection**: Identify recurring transactions from historical data
2. **Recurring Transaction Management**: Allow users to view, edit, and manage detected recurring transactions
3. **Merchant Linking**: Link recurring transactions to merchants for easy subscription management
4. **Proactive Notifications**: Alert users about upcoming recurring transactions
5. **Account Balance Checking**: Verify if sufficient funds are available before recurring transactions
6. **Reporting & Analytics**: Provide insights into recurring spending patterns
7. **Subscription Management**: Help users identify and manage subscriptions

## Use Cases

### Primary Use Cases

1. **Subscription Tracking**
   - "I want to see all my monthly subscriptions in one place"
   - "Help me identify which subscriptions I'm paying for"
   - "Show me how much I spend on subscriptions each month"

2. **Upcoming Payment Alerts**
   - "Notify me 2 days before my mortgage payment is due"
   - "Tell me if I have enough money in my account for upcoming bills"
   - "Alert me if a recurring payment might fail due to insufficient funds"

3. **Financial Planning**
   - "Show me my recurring expenses for the next month"
   - "Help me understand my fixed vs variable expenses"
   - "Calculate my monthly recurring expense total"

4. **Merchant Management**
   - "Link my Netflix subscription to the merchant so I can easily cancel it"
   - "Show me all recurring transactions from a specific merchant"
   - "Help me unsubscribe from services I no longer use"

### Secondary Use Cases

1. **Budget Forecasting**
   - "Predict my expenses for next month based on recurring transactions"
   - "Show me how recurring expenses affect my budget categories"

2. **Spending Analysis**
   - "Compare my recurring expenses month-over-month"
   - "Identify which recurring expenses have increased"
   - "Find duplicate subscriptions I might be paying for"

3. **Account Management**
   - "Which account do my recurring transactions come from?"
   - "Should I move money between accounts for upcoming bills?"

## Current State Analysis

### Database Schema
- `transactions` table: Contains `date`, `description`, `total_amount`, `transaction_type`, `merchant_group_id`, `account_id`, `credit_card_id`
- `merchant_groups` table: Groups similar merchants together
- `accounts` table: Tracks account balances (`balance` field)
- `credit_cards` table: Tracks credit card balances
- `imported_transactions` table: Historical transaction data

### Existing Features
- Transaction import system (CSV and automatic imports)
- Merchant grouping and normalization
- Account balance tracking
- Email notification system (Resend)
- Scheduled jobs system (monthly rollover)
- Transaction filtering and search

### Detection Opportunities
- Transactions are linked to `merchant_group_id` - recurring patterns can be detected by merchant
- Transactions have `date` field - can analyze frequency patterns
- Transactions have `amount` field - can detect similar amounts
- `account_id` and `credit_card_id` - can track which account recurring transactions use

## Database Design

### Schema Design

#### Recurring Transactions Table
```sql
CREATE TABLE recurring_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE NOT NULL,
  
  -- Identification
  merchant_group_id BIGINT REFERENCES merchant_groups(id) ON DELETE SET NULL,
  merchant_name TEXT NOT NULL, -- Denormalized for display and search
  description_pattern TEXT, -- Pattern to match future transactions (e.g., "NETFLIX.COM")
  
  -- Recurrence Pattern
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'yearly', 'custom')),
  interval INTEGER DEFAULT 1, -- For custom frequencies (e.g., every 3 months)
  day_of_month INTEGER, -- For monthly: day of month (1-31, or NULL for "last day")
  day_of_week INTEGER, -- For weekly: 0=Sunday, 1=Monday, etc.
  week_of_month INTEGER, -- For monthly: 1=first week, 2=second week, etc. (for "first Monday" patterns)
  
  -- Amount Information
  expected_amount DECIMAL(10,2), -- Expected amount (NULL if variable)
  amount_variance DECIMAL(10,2) DEFAULT 0, -- Allowable variance (e.g., ±$5)
  is_amount_variable BOOLEAN DEFAULT FALSE, -- True if amount changes frequently
  
  -- Transaction Details
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL, -- Most common category
  account_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL, -- Bank account used
  credit_card_id BIGINT REFERENCES credit_cards(id) ON DELETE SET NULL, -- Credit card used
  
  -- Detection & Confidence
  detection_method TEXT DEFAULT 'automatic' CHECK (detection_method IN ('automatic', 'manual', 'user_confirmed')),
  confidence_score DECIMAL(3,2) DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 1.0), -- 0.0 to 1.0
  detection_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Status & Metadata
  is_active BOOLEAN DEFAULT TRUE, -- False if user cancelled or transaction stopped recurring
  is_confirmed BOOLEAN DEFAULT FALSE, -- True when user confirms this is recurring
  last_occurrence_date DATE, -- Date of most recent matching transaction
  next_expected_date DATE, -- Calculated next occurrence date
  occurrence_count INTEGER DEFAULT 0, -- Number of times this has occurred
  
  -- User Management
  notes TEXT, -- User notes about this recurring transaction
  reminder_days_before INTEGER DEFAULT 2, -- Days before to send reminder (default 2)
  reminder_enabled BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_transactions_account_id ON recurring_transactions(budget_account_id);
CREATE INDEX idx_recurring_transactions_merchant_group_id ON recurring_transactions(merchant_group_id);
CREATE INDEX idx_recurring_transactions_next_expected_date ON recurring_transactions(next_expected_date) WHERE is_active = TRUE;
CREATE INDEX idx_recurring_transactions_active ON recurring_transactions(is_active, is_confirmed) WHERE is_active = TRUE;
```

**Design Decisions**:
- Scoped to `budget_account_id` for multi-account support
- Stores `merchant_name` denormalized for faster queries and display
- Flexible frequency system supporting common patterns
- Confidence score (0.0-1.0) indicates detection reliability
- `is_confirmed` flag allows users to validate automatic detections
- `next_expected_date` enables efficient querying of upcoming transactions
- `reminder_days_before` allows user customization

#### Recurring Transaction Matches Table
```sql
CREATE TABLE recurring_transaction_matches (
  id BIGSERIAL PRIMARY KEY,
  recurring_transaction_id BIGINT REFERENCES recurring_transactions(id) ON DELETE CASCADE NOT NULL,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  match_confidence DECIMAL(3,2) DEFAULT 1.0, -- How well this transaction matched
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recurring_transaction_id, transaction_id)
);

CREATE INDEX idx_recurring_matches_recurring_id ON recurring_transaction_matches(recurring_transaction_id);
CREATE INDEX idx_recurring_matches_transaction_id ON recurring_transaction_matches(transaction_id);
```

**Purpose**: Links detected recurring transactions to actual transaction records, enabling:
- History tracking of which transactions matched
- Confidence scoring per match
- Easy lookup of all transactions for a recurring transaction

**Note**: Notifications for recurring transactions use the **generic notification system** (see `NOTIFICATION_SYSTEM_PLAN.md`). The following notification types are registered in the `notification_types` table:

- `recurring_transaction_upcoming` - Alert before a recurring transaction is due
- `recurring_transaction_insufficient_funds` - Alert when account balance is too low
- `recurring_transaction_missed` - Alert when expected transaction did not occur
- `recurring_transaction_amount_changed` - Alert when amount changes significantly

All notifications are stored in the `notifications` table with `notification_type_id` referencing these types. This allows users to control preferences per notification type and delivery channel (email/in-app) through the `user_notification_preferences` table.

## Detection Algorithm

### Phase 1: Basic Pattern Detection

**Goal**: Identify transactions that occur regularly with similar amounts from the same merchant.

**Algorithm**:
1. Group transactions by `merchant_group_id`
2. For each merchant group:
   - Filter to transactions within last 6-12 months
   - Group by similar amount (within ±5% or ±$5, whichever is larger)
   - Analyze date patterns:
     - **Monthly**: Transactions occur roughly every 28-31 days
     - **Biweekly**: Transactions occur roughly every 14 days
     - **Weekly**: Transactions occur roughly every 7 days
     - **Quarterly**: Transactions occur roughly every 90 days
     - **Yearly**: Transactions occur roughly every 365 days
   - Require minimum 3 occurrences for confidence
   - Calculate confidence score based on:
     - Number of occurrences (more = higher confidence)
     - Regularity of intervals (more regular = higher confidence)
     - Amount consistency (more consistent = higher confidence)
     - Time span (longer span = higher confidence)

**Confidence Score Formula**:
```
confidence = (
  (occurrence_count / 10) * 0.3 +  // Max 0.3 for 10+ occurrences
  (regularity_score) * 0.3 +      // 0.0-1.0 based on date variance
  (amount_consistency) * 0.2 +    // 0.0-1.0 based on amount variance
  (time_span_months / 12) * 0.2   // Max 0.2 for 12+ months
)
```

### Phase 2: Advanced Pattern Detection

**Enhancements**:
- Detect "first Monday of month" patterns
- Detect "last day of month" patterns
- Handle variable amounts (e.g., utility bills)
- Detect seasonal patterns
- Handle skipped occurrences (e.g., subscription paused)

### Phase 3: Machine Learning (Future)

- Use ML to improve detection accuracy
- Learn from user confirmations/rejections
- Detect complex patterns humans might miss

## Detection Implementation Strategy

### Option 1: Background Job (Recommended)

**Approach**: Run detection as a scheduled job (daily or weekly)

**Pros**:
- Doesn't slow down transaction imports
- Can process all users efficiently
- Can run during off-peak hours
- Can batch process for better performance

**Cons**:
- Slight delay in detection (not immediate)
- Requires job scheduling infrastructure

**Implementation**:
- Create `/api/cron/detect-recurring-transactions` endpoint
- Add to `vercel.json` cron jobs (run daily at 2 AM)
- Process users in batches
- Only analyze transactions from last 90 days (incremental updates)

### Option 2: On Transaction Import

**Approach**: Check for recurring patterns after each import

**Pros**:
- Immediate detection
- No separate job needed

**Cons**:
- Slows down import process
- May detect false positives with limited data
- Inefficient for large imports

**Recommendation**: Use Option 1 (background job) as primary, with Option 2 as optional quick-check for high-confidence patterns.

## User Interface

### 1. Recurring Transactions List Page

**Route**: `/recurring-transactions`

**Features**:
- List all detected recurring transactions
- Filter by:
  - Status (Active, Inactive, Unconfirmed)
  - Frequency (Monthly, Weekly, etc.)
  - Transaction Type (Income, Expense)
  - Merchant
- Sort by:
  - Next Due Date
  - Amount
  - Merchant Name
  - Confidence Score
- Show:
  - Merchant name
  - Expected amount
  - Frequency
  - Next expected date
  - Confidence indicator (badge)
  - Last occurrence date
  - Total occurrences

**Actions**:
- Confirm recurring transaction (if unconfirmed)
- Edit recurring transaction details
- Mark as inactive/cancelled
- Delete recurring transaction
- View transaction history
- Manage subscription (if merchant linked)

### 2. Recurring Transaction Detail Page

**Route**: `/recurring-transactions/[id]`

**Features**:
- Show full details:
  - Merchant information
  - Recurrence pattern
  - Expected amount and variance
  - Associated category
  - Account/credit card used
  - Detection confidence
  - User notes
- Transaction history (all matched transactions)
- Upcoming occurrences (next 3-6 months)
- Notification settings
- Edit form

### 3. Dashboard Widget

**Location**: Main dashboard

**Features**:
- "Upcoming Recurring Transactions" section
- Show next 5-7 days of recurring transactions
- Color-coded by:
  - Green: Sufficient funds available
  - Yellow: Close to insufficient funds
  - Red: Insufficient funds
- Quick actions:
  - View all recurring transactions
  - Dismiss notification

### 4. Transaction Detail Integration

**Enhancement**: When viewing a transaction, show:
- "This appears to be a recurring transaction" badge (if detected)
- Link to recurring transaction detail
- "Mark as recurring" action (manual creation)

### 5. Import Flow Enhancement

**Enhancement**: After import, show:
- "We detected X new recurring transactions" notification
- Link to review and confirm

## Notification System

**Note**: Recurring transactions use the **generic notification system** (see `NOTIFICATION_SYSTEM_PLAN.md` for full architecture). This section describes how recurring transactions integrate with that system.

### Notification Types

The following notification types are registered in the `notification_types` table:

1. **`recurring_transaction_upcoming`** (Default: 2 days before)
   - Title: "Upcoming: [Merchant] payment"
   - Message: "Your [Merchant] payment of $X.XX is due in 2 days."
   - Metadata: `{ recurring_transaction_id, expected_amount, due_date, days_until_due }`
   - User preference: `reminder_days_before` (default: 2)

2. **`recurring_transaction_insufficient_funds`** (Sent when balance check fails)
   - Title: "⚠️ Insufficient funds for upcoming [Merchant] payment"
   - Message: "Your [Merchant] payment of $X.XX is due soon, but your account balance is only $Y.YY."
   - Metadata: `{ recurring_transaction_id, expected_amount, current_balance, shortfall }`

3. **`recurring_transaction_missed`** (Sent 3 days after expected date if not found)
   - Title: "We didn't see your expected [Merchant] transaction"
   - Message: "Your expected [Merchant] payment of $X.XX was due on [date] but hasn't appeared yet."
   - Metadata: `{ recurring_transaction_id, expected_amount, expected_date }`

4. **`recurring_transaction_amount_changed`** (When detected amount differs significantly)
   - Title: "Your [Merchant] payment amount changed"
   - Message: "Your [Merchant] payment changed from $X.XX to $Y.YY."
   - Metadata: `{ recurring_transaction_id, old_amount, new_amount }`

### Notification Preferences

Users can control notifications through `/settings/notifications`:
- Enable/disable each notification type
- Choose delivery channels (email, in-app, both, neither)
- Set custom `reminder_days_before` for upcoming notifications (stored in `settings` JSONB)
- Set quiet hours (stored in `settings` JSONB)

### Notification Implementation

**Scheduled Job**: `/api/cron/check-recurring-transactions`

**Runs**: Daily at 8 AM (user's timezone)

**Process**:
1. Query all active recurring transactions with `next_expected_date` within reminder window
2. For each recurring transaction:
   - Get user preferences for notification type
   - Check if notification already sent (query `notifications` table)
   - Calculate reminder date based on user preference (`reminder_days_before`)
   - If reminder date is today or past:
     - Check account balance (if account_id specified)
     - Create notification using `NotificationService.createNotification()`
     - Service handles email/in-app delivery based on preferences
   - Update `next_expected_date` for next occurrence

**Account Balance Checking**:
```typescript
async function checkAccountBalance(
  accountId: number | null,
  creditCardId: number | null,
  expectedAmount: number
): Promise<{
  hasSufficientFunds: boolean;
  currentBalance: number;
  shortfall: number | null;
}> {
  if (creditCardId) {
    // Check credit card available credit
    const creditCard = await getCreditCard(creditCardId);
    const availableCredit = creditCard.credit_limit - creditCard.current_balance;
    return {
      hasSufficientFunds: availableCredit >= expectedAmount,
      currentBalance: availableCredit,
      shortfall: availableCredit < expectedAmount ? expectedAmount - availableCredit : null,
    };
  }
  
  if (accountId) {
    // Check account balance
    const account = await getAccount(accountId);
    return {
      hasSufficientFunds: account.balance >= expectedAmount,
      currentBalance: account.balance,
      shortfall: account.balance < expectedAmount ? expectedAmount - account.balance : null,
    };
  }
  
  // No account specified - can't check balance
  return {
    hasSufficientFunds: true, // Assume OK if no account linked
    currentBalance: 0,
    shortfall: null,
  };
}
```

**Creating Notifications**:
```typescript
import { NotificationService } from '@/lib/notifications/notification-service';

const service = new NotificationService();

// Upcoming transaction notification
await service.createNotification({
  userId: user.id,
  budgetAccountId: accountId,
  notificationTypeId: 'recurring_transaction_upcoming',
  title: `Upcoming: ${merchantName} payment`,
  message: `Your ${merchantName} payment of $${amount} is due in ${days} days.`,
  actionUrl: `/recurring-transactions/${recurringTransactionId}`,
  actionLabel: 'View Transaction',
  metadata: {
    recurring_transaction_id: recurringTransactionId,
    expected_amount: amount,
    due_date: dueDate,
    days_until_due: days,
  },
});

// Insufficient funds notification
if (!balanceCheck.hasSufficientFunds) {
  await service.createNotification({
    userId: user.id,
    budgetAccountId: accountId,
    notificationTypeId: 'recurring_transaction_insufficient_funds',
    title: `⚠️ Insufficient funds for ${merchantName}`,
    message: `Your ${merchantName} payment of $${amount} is due soon, but your account balance is only $${balanceCheck.currentBalance}.`,
    actionUrl: `/recurring-transactions/${recurringTransactionId}`,
    actionLabel: 'View Transaction',
    metadata: {
      recurring_transaction_id: recurringTransactionId,
      expected_amount: amount,
      current_balance: balanceCheck.currentBalance,
      shortfall: balanceCheck.shortfall,
    },
  });
}
```

## Reporting & Analytics

### 1. Recurring Expenses Report

**Route**: `/reports/recurring-expenses`

**Metrics**:
- Total monthly recurring expenses
- Breakdown by category
- Breakdown by merchant
- Comparison month-over-month
- Projected annual cost
- Percentage of total spending

**Visualizations**:
- Pie chart: Recurring vs one-time expenses
- Bar chart: Top recurring expenses by amount
- Trend line: Recurring expenses over time
- Category breakdown

### 2. Subscription Management Report

**Route**: `/reports/subscriptions`

**Features**:
- List all subscription-like recurring transactions
- Total monthly subscription cost
- Yearly projection
- Identify potential duplicates (same merchant, different amounts)
- Cancellation tracking (mark as cancelled, track savings)

### 3. Upcoming Expenses Calendar

**Route**: `/reports/upcoming-expenses`

**Features**:
- Calendar view of upcoming recurring transactions
- Month view with daily totals
- Filter by category or merchant
- Export to calendar (iCal format)

## Merchant Linking & Subscription Management

### Merchant Group Enhancement

**Enhancement**: Add fields to `merchant_groups` table:
```sql
ALTER TABLE merchant_groups ADD COLUMN IF NOT EXISTS 
  subscription_url TEXT, -- URL to manage/cancel subscription
  subscription_phone TEXT, -- Phone number for subscription management
  is_subscription BOOLEAN DEFAULT FALSE, -- User-marked as subscription
  cancellation_instructions TEXT; -- User notes on how to cancel
```

### Subscription Management UI

**Features**:
- "Manage Subscription" button on recurring transaction detail
- Opens modal with:
  - Subscription URL (if available)
  - Phone number (if available)
  - Cancellation instructions (if available)
  - Link to merchant website
  - "Mark as Cancelled" action
- Allow users to add/edit subscription management info

## API Endpoints

### Detection & Management

```
GET    /api/recurring-transactions
POST   /api/recurring-transactions
GET    /api/recurring-transactions/[id]
PATCH  /api/recurring-transactions/[id]
DELETE /api/recurring-transactions/[id]
POST   /api/recurring-transactions/[id]/confirm
POST   /api/recurring-transactions/[id]/matches
GET    /api/recurring-transactions/[id]/upcoming
POST   /api/recurring-transactions/detect (admin/manual trigger)
```

### Notifications

**Note**: Notifications use the generic notification system API (see `NOTIFICATION_SYSTEM_PLAN.md`):

```
GET    /api/notifications?type=recurring_transaction_upcoming
GET    /api/notifications?type=recurring_transaction_insufficient_funds
GET    /api/notifications?type=recurring_transaction_missed
GET    /api/notifications?type=recurring_transaction_amount_changed
GET    /api/recurring-transactions/upcoming (returns upcoming transactions, not notifications)
```

### Reports

```
GET    /api/recurring-transactions/reports/summary
GET    /api/recurring-transactions/reports/monthly-breakdown
GET    /api/recurring-transactions/reports/upcoming-calendar
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database migrations (recurring_transactions, matches, notifications tables)
- [ ] Basic detection algorithm (monthly patterns only)
- [ ] API endpoints for CRUD operations
- [ ] Basic list page UI
- [ ] RLS policies and security

### Phase 2: Detection Enhancement (Week 3)
- [ ] Expand detection to weekly, biweekly, quarterly patterns
- [ ] Confidence scoring system
- [ ] Background job for detection
- [ ] Transaction matching system
- [ ] Manual "mark as recurring" feature

### Phase 3: Notifications (Week 4)
- [ ] Implement generic notification system (see `NOTIFICATION_SYSTEM_PLAN.md`)
- [ ] Register recurring transaction notification types
- [ ] Account balance checking integration
- [ ] Email notification templates for recurring transactions
- [ ] Notification scheduling for recurring transactions
- [ ] Integration with notification preferences UI

### Phase 4: UI & UX (Week 5)
- [ ] Recurring transaction detail page
- [ ] Dashboard widget
- [ ] Transaction detail integration
- [ ] Edit/update flows
- [ ] Confirmation workflow

### Phase 5: Reporting (Week 6)
- [ ] Recurring expenses report
- [ ] Subscription management report
- [ ] Upcoming expenses calendar
- [ ] Analytics visualizations

### Phase 6: Advanced Features (Week 7+)
- [ ] Merchant linking and subscription management
- [ ] Advanced pattern detection (first Monday, last day, etc.)
- [ ] Variable amount handling
- [ ] Export to calendar
- [ ] Mobile optimizations

## Technical Considerations

### Performance

1. **Detection Job Optimization**:
   - Process users in batches
   - Only analyze recent transactions (last 90 days)
   - Use database indexes efficiently
   - Cache merchant group lookups

2. **Query Optimization**:
   - Index `next_expected_date` for upcoming queries
   - Index `merchant_group_id` for merchant-based queries
   - Use materialized views for reports (if needed)

3. **Notification Job**:
   - Batch process notifications
   - Use queue system for email sending
   - Rate limit to avoid email provider limits

### Data Privacy

- All recurring transaction data is user-scoped via RLS
- Detection runs per-user, no cross-user data access
- Notifications only sent to transaction owner

### Error Handling

- Handle edge cases:
  - Merchant group deleted
  - Account deleted
  - Category deleted
  - Invalid date calculations (e.g., Feb 30)
- Graceful degradation:
  - If detection fails, allow manual creation
  - If notification fails, log and retry
  - If balance check fails, show "unable to verify" message

### Testing Strategy

1. **Unit Tests**:
   - Detection algorithm with various patterns
   - Date calculation functions
   - Confidence scoring
   - Balance checking logic

2. **Integration Tests**:
   - API endpoints
   - Detection job
   - Notification job
   - Transaction matching

3. **E2E Tests**:
   - User confirms recurring transaction
   - User receives notification
   - User edits recurring transaction
   - User marks as cancelled

## Future Enhancements

1. **Machine Learning**:
   - Improve detection accuracy over time
   - Learn from user behavior
   - Detect complex patterns

2. **Bank Integration**:
   - Link to bank account for automatic balance checking
   - Real-time balance updates
   - Automatic transaction matching

3. **Bill Pay Integration**:
   - Schedule payments automatically
   - Track payment status
   - Handle payment failures

4. **Budget Integration**:
   - Auto-create budget categories for recurring expenses
   - Suggest budget amounts based on recurring transactions
   - Alert when recurring expenses exceed budget

5. **Social Features**:
   - Compare recurring expenses (anonymized)
   - Share subscription recommendations
   - Community-driven merchant data

6. **Mobile App**:
   - Push notifications for upcoming transactions
   - Quick actions (confirm, dismiss)
   - Mobile-optimized subscription management

## Success Metrics

1. **Adoption**:
   - % of users with at least one detected recurring transaction
   - % of users who confirm detected transactions
   - % of users who enable notifications

2. **Accuracy**:
   - False positive rate (detected but not recurring)
   - False negative rate (recurring but not detected)
   - User confirmation rate

3. **Engagement**:
   - Users viewing recurring transactions page
   - Users interacting with notifications
   - Users using subscription management features

4. **Value**:
   - Reduction in missed payments
   - Users who cancel subscriptions after seeing them
   - Time saved in financial planning

## Open Questions

1. **Detection Frequency**: How often should we re-run detection? Daily? Weekly?
2. **Confidence Threshold**: What confidence score should we require before showing to user?
3. **Notification Timing**: Should we allow users to set custom reminder times per transaction?
4. **Amount Variance**: How much variance should we allow before flagging as "amount changed"?
5. **Historical Data**: How far back should we analyze? 6 months? 12 months?
6. **Manual Override**: Should users be able to manually create recurring transactions without detection?
7. **Multi-Account**: How should we handle recurring transactions that switch accounts?

## References

- Existing scheduled jobs: `/src/lib/scheduled-jobs.ts`
- Email system: `/src/lib/email-utils.ts`
- Transaction import: `/src/lib/supabase-queries.ts` (importTransactions)
- Merchant groups: `merchant_groups` table
- Account balance: `accounts.balance` field
- **Generic Notification System**: `docs/NOTIFICATION_SYSTEM_PLAN.md` (must be implemented first)

---

**Document Status**: Draft - Ready for Review
**Last Updated**: 2025-01-XX
**Author**: Feature Planning Session
**Branch**: `feature/recurring-transactions`
**Dependencies**: Generic Notification System (`NOTIFICATION_SYSTEM_PLAN.md`)




