-- Migration: 083_add_subscription_billing_info.sql
-- Description: Add billing amount and interval to user_subscriptions table
-- Date: 2025-01-31

BEGIN;

-- Add billing information columns
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS billing_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS billing_interval TEXT CHECK (billing_interval IN ('month', 'year', 'day', 'week')),
ADD COLUMN IF NOT EXISTS billing_currency VARCHAR(3) DEFAULT 'usd';

-- Add comment explaining these fields
COMMENT ON COLUMN user_subscriptions.billing_amount IS 'Billing amount in dollars (e.g., 100.00 for $100/year)';
COMMENT ON COLUMN user_subscriptions.billing_interval IS 'Billing interval: month, year, day, or week';
COMMENT ON COLUMN user_subscriptions.billing_currency IS 'Currency code (e.g., usd)';

COMMIT;
