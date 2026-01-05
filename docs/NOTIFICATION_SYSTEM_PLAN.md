# Generic Notification System - Architecture Plan

## Overview

This document outlines a comprehensive, extensible notification system that can be used across all features of the budget app. The system supports multiple notification types, multiple delivery channels (email and in-app), and granular user preferences.

## Design Principles

1. **Extensibility**: Easy to add new notification types without schema changes
2. **Flexibility**: Users can control notifications per type and per channel
3. **Scalability**: Efficient querying and delivery mechanisms
4. **User Control**: Granular preferences for each notification type
5. **Multi-Channel**: Support email and in-app notifications independently
6. **Future-Proof**: Designed to accommodate push notifications, SMS, etc.

## Database Schema

### Core Tables

#### 1. Notification Types Registry

**Purpose**: Define all available notification types in the system. This is a reference table that doesn't change often.

```sql
CREATE TABLE notification_types (
  id TEXT PRIMARY KEY, -- e.g., 'recurring_transaction_upcoming', 'subscription_trial_ending'
  name TEXT NOT NULL, -- Human-readable name: "Recurring Transaction Upcoming"
  description TEXT, -- Description of when this notification is sent
  category TEXT NOT NULL, -- Grouping: 'recurring_transactions', 'subscriptions', 'budget_alerts', 'system'
  default_enabled BOOLEAN DEFAULT TRUE, -- Should this be enabled by default?
  default_email_enabled BOOLEAN DEFAULT TRUE, -- Default email preference
  default_in_app_enabled BOOLEAN DEFAULT TRUE, -- Default in-app preference
  requires_account_context BOOLEAN DEFAULT FALSE, -- Does this notification need account_id?
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data (inserted via migration)
INSERT INTO notification_types (id, name, description, category, default_enabled, default_email_enabled, default_in_app_enabled, requires_account_context) VALUES
-- Recurring Transactions
('recurring_transaction_upcoming', 'Upcoming Recurring Transaction', 'Alert before a recurring transaction is due', 'recurring_transactions', TRUE, TRUE, TRUE, TRUE),
('recurring_transaction_insufficient_funds', 'Insufficient Funds for Recurring Transaction', 'Alert when account balance is too low for upcoming recurring transaction', 'recurring_transactions', TRUE, TRUE, TRUE, TRUE),
('recurring_transaction_missed', 'Missed Recurring Transaction', 'Alert when expected recurring transaction did not occur', 'recurring_transactions', TRUE, FALSE, TRUE, TRUE),
('recurring_transaction_amount_changed', 'Recurring Transaction Amount Changed', 'Alert when recurring transaction amount changes significantly', 'recurring_transactions', TRUE, FALSE, TRUE, TRUE),

-- Subscriptions (future)
('subscription_trial_ending', 'Trial Ending Soon', 'Alert before subscription trial ends', 'subscriptions', TRUE, TRUE, TRUE, FALSE),
('subscription_payment_failed', 'Subscription Payment Failed', 'Alert when subscription payment fails', 'subscriptions', TRUE, TRUE, TRUE, FALSE),

-- Budget Alerts (future)
('budget_category_over_limit', 'Category Over Budget', 'Alert when spending exceeds category budget', 'budget_alerts', TRUE, FALSE, TRUE, TRUE),
('budget_low_balance', 'Low Account Balance', 'Alert when account balance falls below threshold', 'budget_alerts', TRUE, TRUE, TRUE, TRUE),

-- System (future)
('import_completed', 'Import Completed', 'Alert when transaction import finishes', 'system', TRUE, FALSE, TRUE, TRUE),
('collaborator_invited', 'Collaborator Invited', 'Alert when you are invited to collaborate', 'system', TRUE, TRUE, TRUE, TRUE);
```

**Design Decisions**:
- `id` is TEXT for readability and easy reference in code
- `category` groups related notifications for UI organization
- `default_*` fields provide sensible defaults but users can override
- `requires_account_context` helps with query optimization and UI display

#### 2. User Notification Preferences

**Purpose**: Store user preferences for each notification type and delivery channel.

```sql
CREATE TABLE user_notification_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type_id TEXT REFERENCES notification_types(id) ON DELETE CASCADE NOT NULL,
  
  -- Channel Preferences
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Additional Settings (JSONB for flexibility)
  settings JSONB DEFAULT '{}', -- e.g., {"reminder_days_before": 2, "quiet_hours_start": "22:00", "quiet_hours_end": "08:00"}
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, notification_type_id)
);

CREATE INDEX idx_user_notification_prefs_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_user_notification_prefs_type_id ON user_notification_preferences(notification_type_id);
```

**Design Decisions**:
- Separate row per notification type for granular control
- `settings` JSONB allows type-specific configuration (e.g., reminder days)
- Defaults come from `notification_types` table
- Unique constraint prevents duplicate preferences

#### 3. Notifications Table

**Purpose**: Store all notifications sent to users (both email and in-app).

```sql
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_account_id BIGINT REFERENCES budget_accounts(id) ON DELETE SET NULL, -- NULL if not account-specific
  notification_type_id TEXT REFERENCES notification_types(id) ON DELETE CASCADE NOT NULL,
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- URL to relevant page (e.g., /recurring-transactions/123)
  action_label TEXT, -- e.g., "View Transaction", "Manage Subscription"
  
  -- Context Data (JSONB for flexibility)
  metadata JSONB DEFAULT '{}', -- Store type-specific data (e.g., {"recurring_transaction_id": 123, "expected_amount": 50.00})
  
  -- Delivery Status
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  email_error TEXT, -- Error message if email failed
  
  in_app_created BOOLEAN DEFAULT FALSE,
  in_app_created_at TIMESTAMPTZ,
  
  -- Read Status (for in-app)
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ, -- When notification should be sent (for future scheduling)
  sent_at TIMESTAMPTZ, -- When notification was actually sent
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_account_id ON notifications(budget_account_id) WHERE budget_account_id IS NOT NULL;
CREATE INDEX idx_notifications_type_id ON notifications(notification_type_id);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL AND sent_at IS NULL;
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);
```

**Design Decisions**:
- Single table for all notifications (email and in-app)
- `budget_account_id` is nullable (some notifications are user-level, not account-level)
- `metadata` JSONB allows storing type-specific data without schema changes
- Separate flags for email/in-app delivery status
- `scheduled_for` enables future-scheduled notifications
- Indexes optimized for common queries (unread, scheduled, recent)

#### 4. Notification Delivery Log (Optional - for debugging/auditing)

**Purpose**: Track delivery attempts and failures for debugging.

```sql
CREATE TABLE notification_delivery_log (
  id BIGSERIAL PRIMARY KEY,
  notification_id BIGINT REFERENCES notifications(id) ON DELETE CASCADE NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_notification_delivery_log_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX idx_notification_delivery_log_status ON notification_delivery_log(status, attempted_at);
```

**Design Decisions**:
- Separate table to avoid cluttering main notifications table
- Useful for debugging delivery issues
- Can be cleaned up periodically (old logs)

## RLS Policies

```sql
-- Notification Types: Public read (reference data)
ALTER TABLE notification_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view notification types"
  ON notification_types FOR SELECT
  USING (true);

-- User Notification Preferences: Users can only see/edit their own
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notification preferences"
  ON user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own notification preferences"
  ON user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notification preferences"
  ON user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notification preferences"
  ON user_notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Notifications: Users can only see their own
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications (mark as read)"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Delivery Log: Users can view logs for their notifications
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view delivery logs for their notifications"
  ON notification_delivery_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications
      WHERE notifications.id = notification_delivery_log.notification_id
      AND notifications.user_id = auth.uid()
    )
  );
```

## API Design

### Notification Preferences API

```
GET    /api/notifications/preferences
GET    /api/notifications/preferences/[type_id]
PATCH  /api/notifications/preferences/[type_id]
PATCH  /api/notifications/preferences/bulk
```

### Notifications API

```
GET    /api/notifications
GET    /api/notifications/[id]
PATCH  /api/notifications/[id]/read
PATCH  /api/notifications/bulk-read
DELETE /api/notifications/[id]
GET    /api/notifications/unread-count
```

### Internal Notification Service API

```
POST   /api/internal/notifications/create (internal use only)
POST   /api/internal/notifications/send-scheduled (cron job)
```

## Implementation Architecture

### Core Notification Service

**File**: `src/lib/notifications/notification-service.ts`

```typescript
interface NotificationData {
  userId: string;
  budgetAccountId?: number | null;
  notificationTypeId: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
}

interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  settings?: Record<string, any>;
}

class NotificationService {
  /**
   * Create and send a notification
   * Checks user preferences and sends via enabled channels
   */
  async createNotification(data: NotificationData): Promise<number> {
    // 1. Get user preferences for this notification type
    // 2. Create notification record
    // 3. Send via enabled channels (email, in-app)
    // 4. Update delivery status
    // 5. Return notification ID
  }

  /**
   * Get user preferences for a notification type
   * Returns defaults from notification_types if user hasn't set preferences
   */
  async getUserPreferences(
    userId: string,
    notificationTypeId: string
  ): Promise<NotificationPreferences> {
    // Check user_notification_preferences first
    // Fall back to notification_types defaults
  }

  /**
   * Send scheduled notifications (called by cron job)
   */
  async sendScheduledNotifications(): Promise<void> {
    // Query notifications where scheduled_for <= now AND sent_at IS NULL
    // Send each notification
  }

  /**
   * Send email notification
   */
  private async sendEmail(notificationId: number): Promise<void> {
    // Load notification
    // Render email template
    // Send via Resend
    // Update email_sent, email_sent_at
    // Log delivery
  }

  /**
   * Create in-app notification
   */
  private async createInAppNotification(notificationId: number): Promise<void> {
    // Update in_app_created, in_app_created_at
    // Notification already exists in DB, just mark as created
  }
}
```

### Helper Functions

**File**: `src/lib/notifications/helpers.ts`

```typescript
/**
 * Check if user has notification type enabled for a channel
 */
export async function isNotificationEnabled(
  userId: string,
  notificationTypeId: string,
  channel: 'email' | 'in_app'
): Promise<boolean>;

/**
 * Get user's preference for a specific setting
 */
export async function getNotificationSetting(
  userId: string,
  notificationTypeId: string,
  settingKey: string
): Promise<any>;

/**
 * Create notification with type-specific helpers
 */
export async function createRecurringTransactionNotification(
  userId: string,
  budgetAccountId: number,
  recurringTransactionId: number,
  type: 'upcoming' | 'insufficient_funds' | 'missed' | 'amount_changed',
  data: Record<string, any>
): Promise<number>;
```

### Scheduled Job

**File**: `src/lib/notifications/scheduled-jobs.ts`

```typescript
/**
 * Cron job: Send scheduled notifications
 * Runs every hour (or more frequently if needed)
 */
export async function sendScheduledNotifications(): Promise<void> {
  const service = new NotificationService();
  await service.sendScheduledNotifications();
}
```

**Cron Endpoint**: `/api/cron/send-notifications`

## Usage Examples

### Example 1: Recurring Transaction Upcoming

```typescript
import { NotificationService } from '@/lib/notifications/notification-service';

const service = new NotificationService();

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
  scheduledFor: new Date(Date.now() + days * 24 * 60 * 60 * 1000), // Schedule for X days before
});
```

### Example 2: Subscription Trial Ending (Future)

```typescript
await service.createNotification({
  userId: user.id,
  notificationTypeId: 'subscription_trial_ending',
  title: 'Your Premium trial ends in 7 days',
  message: 'Your 60-day Premium trial will end on [date]. Upgrade now to continue enjoying premium features.',
  actionUrl: '/settings/subscription',
  actionLabel: 'Manage Subscription',
  metadata: {
    trial_end_date: trialEndDate,
    days_remaining: 7,
  },
});
```

### Example 3: Budget Alert (Future)

```typescript
await service.createNotification({
  userId: user.id,
  budgetAccountId: accountId,
  notificationTypeId: 'budget_category_over_limit',
  title: `Category "${categoryName}" is over budget`,
  message: `You've spent $${spent} of your $${budget} budget for ${categoryName}.`,
  actionUrl: `/budgets?category=${categoryId}`,
  actionLabel: 'View Budget',
  metadata: {
    category_id: categoryId,
    spent_amount: spent,
    budget_amount: budget,
    overage: spent - budget,
  },
});
```

## User Interface

### Settings Page: Notification Preferences

**Route**: `/settings/notifications`

**Features**:
- Group notifications by category
- Toggle per notification type:
  - Enable/disable notification
  - Email on/off
  - In-app on/off
  - Additional settings (e.g., "Remind me X days before")
- Bulk actions (enable all, disable all)
- Preview notification examples

### In-App Notifications Center

**Component**: Notification bell icon in header

**Features**:
- Badge showing unread count
- Dropdown showing recent notifications
- Mark as read
- Click to navigate to relevant page
- "Mark all as read" action
- Link to full notifications page

**Full Page**: `/notifications`

**Features**:
- List all notifications (paginated)
- Filter by type, read/unread, date range
- Bulk actions (mark as read, delete)
- Group by date
- Show notification metadata

## Email Templates

**Location**: `email-templates/notifications/`

**Structure**:
- `notification-base.html` - Base template with header/footer
- `recurring-transaction-upcoming.html`
- `recurring-transaction-insufficient-funds.html`
- `subscription-trial-ending.html`
- etc.

**Template Variables**:
- `{{ .Title }}`
- `{{ .Message }}`
- `{{ .ActionURL }}`
- `{{ .ActionLabel }}`
- `{{ .UnsubscribeURL }}`
- Type-specific variables from metadata

## Migration Strategy

### Phase 1: Core Infrastructure
1. Create `notification_types` table and seed data
2. Create `user_notification_preferences` table
3. Create `notifications` table
4. Create RLS policies
5. Create core `NotificationService` class
6. Create API endpoints

### Phase 2: Integration
1. Integrate with recurring transactions feature
2. Create email templates
3. Create in-app notification UI
4. Add settings page

### Phase 3: Expansion
1. Add subscription notifications
2. Add budget alert notifications
3. Add system notifications
4. Add push notifications (future)

## Future Enhancements

1. **Push Notifications**: Add `push_enabled` channel
2. **SMS Notifications**: Add `sms_enabled` channel
3. **Notification Digest**: Daily/weekly digest emails
4. **Smart Filtering**: ML-based notification prioritization
5. **Notification Templates**: User-customizable templates
6. **Webhooks**: Allow external systems to create notifications
7. **Notification Analytics**: Track open rates, click rates

## Benefits of This Design

1. **Extensibility**: Add new notification types by inserting into `notification_types`
2. **Flexibility**: Users have granular control over each notification type
3. **Maintainability**: Single codebase for all notification logic
4. **Performance**: Efficient queries with proper indexes
5. **User Experience**: Consistent notification experience across features
6. **Future-Proof**: Easy to add new channels (push, SMS) without schema changes
7. **Reusability**: One system serves all features (recurring transactions, subscriptions, budget alerts, etc.)

## Integration with Features

### Recurring Transactions
- Uses notification types: `recurring_transaction_upcoming`, `recurring_transaction_insufficient_funds`, `recurring_transaction_missed`, `recurring_transaction_amount_changed`
- Stores `recurring_transaction_id` in notification `metadata`
- Links to `/recurring-transactions/[id]` via `action_url`
- See `RECURRING_TRANSACTIONS_PLAN.md` for implementation details

### Subscriptions (Future)
- Uses notification types: `subscription_trial_ending`, `subscription_payment_failed`, `subscription_renewal_reminder`
- Stores subscription details in `metadata`
- Links to `/settings/subscription` via `action_url`

### Budget Alerts (Future)
- Uses notification types: `budget_category_over_limit`, `budget_low_balance`, `budget_goal_reached`
- Stores category/account details in `metadata`
- Links to relevant budget pages via `action_url`

### System Notifications (Future)
- Uses notification types: `import_completed`, `collaborator_invited`, `backup_completed`
- System-level notifications (no account context)
- Links to relevant pages or actions

## Implementation Order

1. **Phase 1**: Core notification system infrastructure
   - Database tables and RLS policies
   - `NotificationService` class
   - Basic API endpoints
   - Seed notification types

2. **Phase 2**: Recurring transactions integration
   - Register recurring transaction notification types
   - Create email templates
   - Implement notification creation logic
   - Add to scheduled job

3. **Phase 3**: User interface
   - Settings page for notification preferences
   - In-app notification center
   - Notification list page

4. **Phase 4**: Additional features
   - Subscription notifications
   - Budget alert notifications
   - System notifications

---

**Document Status**: Architecture Plan - Ready for Implementation
**Last Updated**: 2025-01-XX
**Related Documents**: `RECURRING_TRANSACTIONS_PLAN.md`




