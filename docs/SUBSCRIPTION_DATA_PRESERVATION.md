# Subscription Data Preservation

## Overview

When a user's premium subscription expires (trial ends or payment fails), **all user data is preserved**. Only feature access is disabled - no data is deleted.

## What Happens When Premium Access is Disabled

### Feature Flags Disabled
- All premium feature flags in `user_feature_flags` are set to `enabled: false`
- Feature flags are preserved with `disabled_at` timestamp
- Users can no longer access premium features through the UI

### Data Preserved
The following data remains intact and is **never deleted**:

- ✅ **Goals** - All goals remain in the `goals` table
- ✅ **Loans** - All loans remain in the `loans` table  
- ✅ **Monthly Funding Tracking** - All `category_monthly_funding` records preserved
- ✅ **Category Types** - Categories keep their types (monthly_expense, accumulation, target_balance)
- ✅ **Priorities** - Category priorities remain unchanged
- ✅ **Income Buffer** - Income Buffer category is converted to regular category (balance preserved)
- ✅ **AI Conversations** - All AI chat history preserved
- ✅ **Automatic Import Setups** - Import configurations preserved (but inactive)
- ✅ **Advanced Reports** - Report data and history preserved
- ✅ **All Transactions** - No transactions are deleted
- ✅ **All Categories** - No categories are deleted
- ✅ **All Accounts** - No accounts are deleted

### Subscription Status Updated
- Subscription status is updated to `'canceled'` when trial ends
- Subscription record remains in database for historical tracking

## Re-subscription Behavior

When a user re-subscribes:
1. Premium features are automatically re-enabled
2. **All previously created data is immediately accessible again**
3. Goals, loans, and other premium data appear exactly as they were left
4. No data recovery or restoration needed

## Implementation Details

### `disablePremiumAccess()` Function
Located in: `src/lib/subscription-access-control.ts`

**What it does:**
- Updates subscription status if trial has ended
- Sets all premium feature flags to `enabled: false`
- Uses `upsert` to ensure feature flags exist

**What it does NOT do:**
- ❌ Delete any goals
- ❌ Delete any loans
- ❌ Delete monthly funding records
- ❌ Delete categories
- ❌ Delete transactions
- ❌ Delete any user data

### Feature Gating
Premium features are gated at multiple levels:

1. **Subscription Status Check** (`isPremiumUser()`)
   - Checks if subscription tier is 'premium' AND status is 'active' or 'trialing'

2. **Feature Flag Check** (`isFeatureEnabled()`)
   - Checks if feature flag is enabled in `user_feature_flags`

3. **Component-Level Gates** (`PremiumFeatureGate`)
   - Shows upgrade prompt if user doesn't have premium
   - Shows feature disabled message if premium but feature flag is off

4. **API-Level Gates** (`requirePremiumSubscription()`)
   - Throws `PremiumRequiredError` if premium not active
   - Returns 403 Forbidden response

## Testing Data Preservation

To verify data is preserved:

1. Create premium account with trial
2. Create goals, loans, and other premium data
3. Wait for trial to end (or manually disable premium)
4. Verify:
   - Goals still exist in database
   - Loans still exist in database
   - Monthly funding records still exist
   - Feature flags are disabled
5. Re-subscribe
6. Verify all data is immediately accessible again

## Data Deletion

Data is **only** deleted when:
- User explicitly chooses to delete their account (`/api/user/delete-account`)
- User explicitly chooses to clear all data (`/api/user/clear-data`)

These actions require explicit user confirmation and cannot be triggered automatically.
