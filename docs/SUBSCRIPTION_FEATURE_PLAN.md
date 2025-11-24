# Subscription Feature Implementation Plan

## Overview
Add a subscription-based monetization model to the budget app with two tiers: **Free** and **Premium**. Users can try Premium features for 60 days with a credit card on file before being charged.

---

## 🎯 Business Model

### Free Tier (Core Features)
**Target Users:** Basic budgeting needs, getting started with envelope budgeting

**Included Features:**
- ✅ Unlimited accounts (checking, savings, cash)
- ✅ Unlimited credit cards
- ✅ Unlimited categories/envelopes
- ✅ Unlimited transactions
- ✅ Basic transaction management (add, edit, delete, split)
- ✅ CSV import with auto-categorization
- ✅ Merchant grouping and normalization
- ✅ Pending checks tracking
- ✅ Basic dashboard with account summaries
- ✅ Basic reports (spending by category)
- ✅ Data backup and restore
- ✅ Mobile-responsive interface

### Premium Tier ($9.99/month)
**Target Users:** Power users who want advanced budgeting features and insights

**All Free Features PLUS:**
- ⭐ **Monthly Funding Tracking** - Track funded amounts separately from balances
- ⭐ **Category Types** - Monthly Expense, Accumulation, Target Balance categories
- ⭐ **Priority System** - Prioritize categories for smart allocation
- ⭐ **Smart Allocation** - Auto-allocate funds by priority
- ⭐ **Income Buffer** - Smooth irregular income with buffer category
- ⭐ **Advanced Reporting** - Detailed analytics and trends
- ⭐ **Goals System** - Savings goals with progress tracking
- ⭐ **Debt Paydown Goals** - Track loan payoff progress
- ⭐ **Loans Tracking** - Manage debts and liabilities
- ⭐ **Net Worth Tracking** - Complete financial picture
- ⭐ **Custom CSV Templates** - Save import configurations
- ⭐ **Priority Support** - Faster response times
- ⭐ **Early Access** - New features before general release

### Trial Period
- **Duration:** 60 days from subscription start
- **Requirement:** Credit card required to start trial
- **Reminders:** Email notifications at 7 days, 3 days, and 1 day before trial ends
- **Cancellation:** Can cancel anytime during trial with no charge
- **Post-Trial:** Automatically charged monthly unless cancelled

---

## 🏗️ Technical Architecture

### Stripe Integration

#### Why Stripe?
- Industry-leading payment processing
- Built-in subscription management
- Automatic billing and retry logic
- Customer portal for self-service
- Webhook support for real-time updates
- PCI compliance handled by Stripe
- Excellent documentation and SDKs

#### Stripe Components Needed
1. **Stripe Account** - Create account at stripe.com
2. **Products & Prices** - Define Premium subscription product
3. **Customer Portal** - Pre-built UI for subscription management
4. **Webhooks** - Listen for subscription events
5. **Stripe SDK** - `@stripe/stripe-js` (client) and `stripe` (server)

---

## 📊 Database Schema Changes

### New Table: `user_subscriptions`
```sql
CREATE TABLE user_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Subscription tier
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  
  -- Stripe data
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  
  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Billing dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_stripe_subscription ON user_subscriptions(stripe_subscription_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- RLS Policies
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);
```

### Update `user_feature_flags` Table
Add subscription tier requirement to features:
```sql
ALTER TABLE user_feature_flags 
  ADD COLUMN requires_premium BOOLEAN DEFAULT false;

-- Mark premium features
UPDATE user_feature_flags 
SET requires_premium = true 
WHERE feature_name IN (
  'monthly_funding_tracking',
  'category_types',
  'priority_system',
  'smart_allocation',
  'income_buffer',
  'advanced_reporting'
);
```

---

## 🔐 Environment Variables

Add to `.env.local` and Vercel:
```bash
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Product IDs
STRIPE_PREMIUM_PRICE_ID=price_...
```

---

## 🎨 User Interface Components

### 1. Account Settings - Subscription Section
**Location:** `/settings/subscription` (new page)

**Components:**
- **Current Plan Card**
  - Display current tier (Free or Premium)
  - Show subscription status (Active, Trialing, Canceled, etc.)
  - If trialing: Show days remaining in trial
  - If premium: Show next billing date and amount
  - If canceled: Show when access ends

- **Plan Comparison Table**
  - Side-by-side comparison of Free vs Premium
  - Highlight premium-only features
  - Clear pricing display
  - "Current Plan" badge on active tier

- **Action Buttons**
  - Free users: "Start 60-Day Trial" (primary CTA)
  - Premium users: "Manage Subscription" (opens Stripe Customer Portal)
  - Trialing users: "Cancel Trial" option

- **Billing History** (Premium only)
  - List of past invoices
  - Download invoice PDFs
  - Payment method on file

### 2. Feature Upgrade Prompts
**Location:** Throughout app when accessing premium features

**Design:**
- Modal dialog with feature explanation
- Benefits of upgrading
- "Start Free Trial" CTA
- "Learn More" link to subscription page
- Dismissible (but shows again on next premium feature access)

### 3. Navigation Updates
**Location:** Settings sidebar

**Changes:**
- Add "Subscription" menu item with crown icon
- Badge showing "Premium" or "Free" tier
- Trial countdown badge if in trial period

### 4. Dashboard Badge
**Location:** User menu dropdown

**Display:**
- Small badge next to user email showing tier
- "Premium" in gold/yellow
- "Free" in neutral color
- Trial countdown if applicable

---

## 🔄 User Flows

### Flow 1: Free User Starts Trial

1. **Discovery**
   - User clicks on premium feature (e.g., "Goals")
   - Modal appears: "This is a Premium Feature"
   - Shows feature benefits and trial offer

2. **Trial Signup**
   - User clicks "Start 60-Day Free Trial"
   - Redirects to `/settings/subscription`
   - Shows plan comparison
   - Clicks "Start Trial" button

3. **Stripe Checkout**
   - Redirects to Stripe Checkout
   - User enters credit card details
   - Stripe creates customer and subscription (in trial mode)
   - Redirects back to app with success

4. **Post-Signup**
   - Subscription status updated to "trialing"
   - All premium features immediately unlocked
   - Welcome email sent with trial details
   - Dashboard shows trial countdown

### Flow 2: Trial User Cancels Before Billing

1. **Cancellation**
   - User goes to `/settings/subscription`
   - Clicks "Manage Subscription"
   - Opens Stripe Customer Portal
   - Clicks "Cancel Subscription"

2. **Confirmation**
   - Stripe confirms cancellation
   - Webhook updates subscription status
   - User retains access until trial end date
   - Email confirmation sent

3. **Trial End**
   - On trial end date, subscription status → "canceled"
   - Premium features disabled
   - User reverts to Free tier
   - Data preserved (no deletion)

### Flow 3: Trial Converts to Paid

1. **Trial Ending Reminders**
   - 7 days before: Email reminder
   - 3 days before: Email reminder
   - 1 day before: Email reminder + in-app notification

2. **Automatic Conversion**
   - On trial end date, Stripe charges card
   - If successful: status → "active", tier → "premium"
   - If failed: status → "past_due", retry logic begins
   - Email receipt sent

3. **Ongoing Billing**
   - Monthly charge on subscription anniversary
   - Automatic invoice generation
   - Email receipts
   - Retry logic for failed payments

### Flow 4: Premium User Cancels

1. **Cancellation**
   - User opens Stripe Customer Portal
   - Selects "Cancel Subscription"
   - Chooses immediate or end-of-period cancellation

2. **End of Period Cancellation** (recommended)
   - `cancel_at_period_end` = true
   - User retains access until period ends
   - No refund (already paid for period)
   - Email confirmation

3. **Period End**
   - Subscription status → "canceled"
   - Premium features disabled
   - User reverts to Free tier
   - Data preserved

### Flow 5: Premium User Reactivates

1. **Reactivation**
   - User goes to `/settings/subscription`
   - Sees "Reactivate Premium" button
   - Clicks to reactivate

2. **Stripe Processing**
   - If card on file: Immediate reactivation
   - If no card: Redirect to Stripe Checkout
   - Creates new subscription
   - Email confirmation

3. **Access Restored**
   - Premium features immediately unlocked
   - Billing resumes on monthly cycle

---

## 🔌 API Endpoints

### Subscription Management

#### `POST /api/subscription/create-checkout-session`
**Purpose:** Create Stripe Checkout session for trial signup

**Request:**
```json
{
  "priceId": "price_xxx",
  "successUrl": "/settings/subscription?success=true",
  "cancelUrl": "/settings/subscription?canceled=true"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/..."
}
```

**Logic:**
1. Get authenticated user
2. Check if user already has subscription
3. Create Stripe customer if doesn't exist
4. Create checkout session with trial period
5. Return session URL

#### `POST /api/subscription/create-portal-session`
**Purpose:** Create Stripe Customer Portal session for subscription management

**Request:**
```json
{
  "returnUrl": "/settings/subscription"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

**Logic:**
1. Get authenticated user
2. Get user's Stripe customer ID
3. Create portal session
4. Return portal URL

#### `GET /api/subscription/status`
**Purpose:** Get current user's subscription status

**Response:**
```json
{
  "tier": "premium",
  "status": "trialing",
  "trialEnd": "2025-03-24T00:00:00Z",
  "currentPeriodEnd": "2025-03-24T00:00:00Z",
  "cancelAtPeriodEnd": false,
  "stripeCustomerId": "cus_xxx"
}
```

**Logic:**
1. Get authenticated user
2. Query `user_subscriptions` table
3. Return subscription details

#### `POST /api/webhooks/stripe`
**Purpose:** Handle Stripe webhook events

**Events to Handle:**
- `checkout.session.completed` - Trial started
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription canceled
- `invoice.paid` - Payment successful
- `invoice.payment_failed` - Payment failed

**Logic:**
1. Verify webhook signature
2. Parse event type
3. Update `user_subscriptions` table
4. Send user notifications if needed
5. Return 200 OK

---

## 🔒 Access Control & Feature Gating

### Middleware Approach

Create subscription middleware to check access:

```typescript
// lib/subscription-utils.ts

export async function getUserSubscription(userId: string) {
  const { data } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  return data;
}

export function hasActiveSubscription(subscription: any): boolean {
  if (!subscription) return false;

  const activeStatuses = ['active', 'trialing'];
  return activeStatuses.includes(subscription.status);
}

export function isPremiumUser(subscription: any): boolean {
  return subscription?.tier === 'premium' && hasActiveSubscription(subscription);
}

export async function requiresPremium(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  return isPremiumUser(subscription);
}
```

### Feature Flag Integration

Update existing feature flag system:

```typescript
// contexts/FeatureContext.tsx

// Add subscription check to isFeatureEnabled
const isFeatureEnabled = useCallback((featureName: FeatureName) => {
  const feature = features.find(f => f.key === featureName);
  if (!feature) return false;

  // Check if feature requires premium
  if (feature.requiresPremium && !isPremiumUser(subscription)) {
    return false;
  }

  return feature.enabled;
}, [features, subscription]);
```

### Component-Level Gating

```typescript
// components/PremiumFeatureGate.tsx

export function PremiumFeatureGate({
  children,
  fallback,
  featureName
}: Props) {
  const { subscription } = useSubscription();
  const isPremium = isPremiumUser(subscription);

  if (!isPremium) {
    return fallback || <UpgradePrompt featureName={featureName} />;
  }

  return <>{children}</>;
}
```

### API Route Protection

```typescript
// lib/api-guards.ts

export async function requirePremiumSubscription(userId: string) {
  const subscription = await getUserSubscription(userId);

  if (!isPremiumUser(subscription)) {
    throw new Error('Premium subscription required');
  }

  return subscription;
}

// Usage in API routes
export async function GET() {
  const { user } = await getAuthenticatedUser();
  await requirePremiumSubscription(user.id);

  // Premium feature logic...
}
```

---

## 📧 Email Notifications

### Trial Started
**Trigger:** Checkout session completed
**Subject:** Welcome to Your 60-Day Premium Trial!

**Content:**
- Thank you for starting trial
- Trial end date
- What's included in Premium
- How to cancel if needed
- Support contact

### Trial Ending Soon (7 days)
**Trigger:** Scheduled job
**Subject:** Your Premium Trial Ends in 7 Days

**Content:**
- Trial end date
- Billing amount and date
- How to cancel
- Premium features you've been using

### Trial Ending Soon (3 days)
**Trigger:** Scheduled job
**Subject:** 3 Days Left in Your Premium Trial

**Content:**
- Final reminder
- Billing details
- Cancellation instructions
- Customer support

### Trial Ending Soon (1 day)
**Trigger:** Scheduled job
**Subject:** Last Day of Your Premium Trial

**Content:**
- Tomorrow you'll be charged
- Amount and payment method
- Cancel now link
- Thank you message

### Trial Converted to Paid
**Trigger:** First successful payment
**Subject:** Welcome to Premium! Your First Payment Processed

**Content:**
- Thank you for subscribing
- Receipt details
- Next billing date
- Manage subscription link

### Payment Successful
**Trigger:** Monthly invoice paid
**Subject:** Payment Receipt - Budget App Premium

**Content:**
- Receipt/invoice
- Amount charged
- Next billing date
- Download PDF invoice

### Payment Failed
**Trigger:** Invoice payment failed
**Subject:** Payment Failed - Action Required

**Content:**
- Payment failure notice
- Update payment method link
- Retry schedule
- Grace period details
- Support contact

### Subscription Canceled
**Trigger:** User cancels subscription
**Subject:** Your Premium Subscription Has Been Canceled

**Content:**
- Confirmation of cancellation
- Access end date
- What happens to data
- Reactivation option
- Feedback request

---

## 🛠️ Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal:** Set up Stripe and database infrastructure

**Tasks:**
1. ✅ Create Stripe account
2. ✅ Set up Stripe products and pricing
3. ✅ Install Stripe SDK: `npm install stripe @stripe/stripe-js`
4. ✅ Create database migration for `user_subscriptions` table
5. ✅ Add environment variables
6. ✅ Create subscription utility functions
7. ✅ Test Stripe API connection

**Deliverables:**
- Stripe account configured
- Database schema deployed
- Basic API connection working

### Phase 2: Subscription Management (Week 2)
**Goal:** Implement core subscription flows

**Tasks:**
1. ✅ Create `/api/subscription/create-checkout-session` endpoint
2. ✅ Create `/api/subscription/create-portal-session` endpoint
3. ✅ Create `/api/subscription/status` endpoint
4. ✅ Create `/api/webhooks/stripe` endpoint
5. ✅ Implement webhook event handlers
6. ✅ Test trial signup flow
7. ✅ Test cancellation flow
8. ✅ Test payment flow

**Deliverables:**
- All API endpoints functional
- Webhook processing working
- Subscription lifecycle tested

### Phase 3: UI Components (Week 3)
**Goal:** Build user-facing subscription interface

**Tasks:**
1. ✅ Create `/settings/subscription` page
2. ✅ Build plan comparison component
3. ✅ Build current plan card
4. ✅ Build upgrade prompt modal
5. ✅ Add subscription badge to user menu
6. ✅ Update settings navigation
7. ✅ Create billing history view
8. ✅ Test all UI flows

**Deliverables:**
- Complete subscription settings page
- Upgrade prompts throughout app
- User menu shows subscription status

### Phase 4: Feature Gating (Week 4)
**Goal:** Restrict premium features to paid users

**Tasks:**
1. ✅ Update feature flag system with premium requirements
2. ✅ Create `PremiumFeatureGate` component
3. ✅ Add API route guards
4. ✅ Gate all premium features
5. ✅ Test feature access for free users
6. ✅ Test feature access for premium users
7. ✅ Handle edge cases (expired trials, failed payments)

**Deliverables:**
- All premium features properly gated
- Free users see upgrade prompts
- Premium users have full access

### Phase 5: Email Notifications (Week 5)
**Goal:** Set up automated email communications

**Tasks:**
1. ✅ Choose email service (Resend, SendGrid, or Supabase Auth emails)
2. ✅ Create email templates
3. ✅ Implement trial reminder scheduler
4. ✅ Implement webhook-triggered emails
5. ✅ Test all email flows
6. ✅ Set up email monitoring

**Deliverables:**
- All email templates created
- Automated reminders working
- Email delivery confirmed

### Phase 6: Testing & Polish (Week 6)
**Goal:** Comprehensive testing and refinement

**Tasks:**
1. ✅ End-to-end testing of all flows
2. ✅ Test edge cases (failed payments, cancellations, reactivations)
3. ✅ Performance testing
4. ✅ Security audit
5. ✅ UI/UX polish
6. ✅ Documentation updates
7. ✅ Create admin dashboard for monitoring

**Deliverables:**
- All flows tested and working
- Documentation complete
- Ready for production

---

## 🎓 Stripe Integration Guide

### Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up for account
3. Complete business verification
4. Enable test mode for development

### Step 2: Create Product & Price

1. **Dashboard → Products → Add Product**
   - Name: "Budget App Premium"
   - Description: "Access to all premium budgeting features"
   - Pricing model: Recurring
   - Price: $9.99 USD
   - Billing period: Monthly
   - Free trial: 60 days

2. **Copy Price ID**
   - Format: `price_xxxxxxxxxxxxx`
   - Add to environment variables

### Step 3: Configure Customer Portal

1. **Dashboard → Settings → Customer Portal**
2. **Enable features:**
   - ✅ Update payment method
   - ✅ View invoice history
   - ✅ Cancel subscription
   - ❌ Update subscription (we only have one plan)
3. **Cancellation settings:**
   - Allow immediate cancellation
   - Allow end-of-period cancellation
   - Require cancellation reason
4. **Save configuration**

### Step 4: Set Up Webhooks

1. **Dashboard → Developers → Webhooks**
2. **Add endpoint:**
   - URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `invoice.payment_action_required`
3. **Copy webhook signing secret**
   - Format: `whsec_xxxxxxxxxxxxx`
   - Add to environment variables

### Step 5: Get API Keys

1. **Dashboard → Developers → API Keys**
2. **Copy keys:**
   - Publishable key: `pk_test_xxxxxxxxxxxxx` (for client-side)
   - Secret key: `sk_test_xxxxxxxxxxxxx` (for server-side)
3. **Add to environment variables**

### Step 6: Test Mode vs Live Mode

**Test Mode (Development):**
- Use test API keys (`pk_test_...`, `sk_test_...`)
- Use test card numbers (4242 4242 4242 4242)
- No real charges
- Separate data from production

**Live Mode (Production):**
- Use live API keys (`pk_live_...`, `sk_live_...`)
- Real credit cards
- Real charges
- Requires business verification

---

## 💳 Stripe Test Cards

For testing different scenarios:

| Scenario | Card Number | CVC | Date |
|----------|-------------|-----|------|
| Success | 4242 4242 4242 4242 | Any | Future |
| Decline | 4000 0000 0000 0002 | Any | Future |
| Insufficient Funds | 4000 0000 0000 9995 | Any | Future |
| Expired Card | 4000 0000 0000 0069 | Any | Past |
| Processing Error | 4000 0000 0000 0119 | Any | Future |
| 3D Secure Required | 4000 0025 0000 3155 | Any | Future |

---

## 📊 Monitoring & Analytics

### Metrics to Track

**Subscription Metrics:**
- Total active subscriptions
- Trial conversion rate
- Monthly recurring revenue (MRR)
- Churn rate
- Average customer lifetime value
- Trial cancellation rate
- Payment failure rate

**User Metrics:**
- Free vs Premium user ratio
- Feature usage by tier
- Upgrade prompt click-through rate
- Time to conversion (signup → trial → paid)

### Stripe Dashboard

**Built-in Analytics:**
- Revenue reports
- Customer growth
- Subscription analytics
- Failed payment tracking
- Churn analysis

### Custom Analytics

Create admin dashboard at `/admin/subscriptions`:
- Real-time subscription count
- Trial status overview
- Recent conversions
- Failed payments requiring attention
- Revenue trends

---

## 🔍 Edge Cases & Error Handling

### Edge Case 1: Payment Fails During Trial Conversion

**Scenario:** User's card is declined when trial ends

**Handling:**
1. Stripe automatically retries payment (Smart Retries)
2. Subscription status → `past_due`
3. User retains access during retry period (configurable)
4. Send email: "Payment Failed - Update Card"
5. After final retry fails → status `unpaid`
6. Disable premium features
7. Send final notice email

**User Actions:**
- Update payment method in Customer Portal
- Stripe automatically retries with new card
- If successful, reactivate subscription

### Edge Case 2: User Cancels Then Immediately Reactivates

**Scenario:** User cancels by mistake and wants to undo

**Handling:**
1. If canceled with `cancel_at_period_end=true`:
   - User can reactivate in Customer Portal
   - Stripe removes cancellation flag
   - No interruption in service
2. If canceled immediately:
   - Create new subscription
   - May lose some trial time (acceptable)

### Edge Case 3: Duplicate Subscriptions

**Scenario:** User somehow creates multiple subscriptions

**Prevention:**
1. Check for existing subscription before creating new one
2. Database unique constraint on `user_id`
3. Stripe customer ID reuse

**Handling:**
1. Cancel duplicate subscriptions
2. Refund if charged
3. Keep most recent subscription

### Edge Case 4: User Deletes Account During Active Subscription

**Scenario:** Premium user wants to delete account

**Handling:**
1. Show warning: "You have an active subscription"
2. Require cancellation first
3. Or: Auto-cancel subscription on account deletion
4. Webhook handles cleanup
5. Stripe customer remains (for records)

### Edge Case 5: Webhook Delivery Failure

**Scenario:** Webhook endpoint is down or times out

**Handling:**
1. Stripe automatically retries webhooks
2. Exponential backoff (up to 3 days)
3. Monitor webhook delivery in Stripe Dashboard
4. Set up alerts for failed webhooks
5. Manual reconciliation if needed

### Edge Case 6: User Changes Email

**Scenario:** User updates email in Supabase Auth

**Handling:**
1. Sync email to Stripe customer
2. Update via Stripe API when email changes
3. Ensure invoices go to correct email

### Edge Case 7: Refund Request

**Scenario:** User requests refund

**Handling:**
1. Process refund through Stripe Dashboard
2. Webhook: `charge.refunded`
3. Update subscription status
4. Disable premium features
5. Send confirmation email

---

## 🚀 Deployment Checklist

### Pre-Launch

- [ ] Stripe account fully verified
- [ ] Products and pricing configured
- [ ] Webhook endpoints tested
- [ ] All environment variables set in production
- [ ] Database migration deployed
- [ ] Email service configured
- [ ] Test all user flows in staging
- [ ] Security audit completed
- [ ] Terms of Service updated (subscription terms)
- [ ] Privacy Policy updated (payment data)

### Launch Day

- [ ] Switch Stripe to Live Mode
- [ ] Update API keys to live keys
- [ ] Deploy to production
- [ ] Test live checkout flow (small amount)
- [ ] Monitor webhook delivery
- [ ] Monitor error logs
- [ ] Announce feature to users

### Post-Launch

- [ ] Monitor subscription metrics daily (first week)
- [ ] Watch for failed payments
- [ ] Respond to support requests
- [ ] Gather user feedback
- [ ] Iterate on upgrade prompts
- [ ] Optimize conversion funnel

---

## 📚 Additional Resources

### Stripe Documentation
- [Subscriptions Guide](https://stripe.com/docs/billing/subscriptions/overview)
- [Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Testing](https://stripe.com/docs/testing)

### Stripe SDKs
- [stripe-js (client)](https://github.com/stripe/stripe-js)
- [stripe-node (server)](https://github.com/stripe/stripe-node)

### Email Services
- [Resend](https://resend.com) - Modern email API
- [SendGrid](https://sendgrid.com) - Established provider
- [Supabase Auth Emails](https://supabase.com/docs/guides/auth/auth-email-templates) - Built-in

### Compliance
- [PCI Compliance](https://stripe.com/docs/security/guide) - Handled by Stripe
- [SCA (Strong Customer Authentication)](https://stripe.com/docs/strong-customer-authentication)
- [GDPR Considerations](https://stripe.com/guides/general-data-protection-regulation)

---

## 🎯 Success Criteria

### Technical Success
- ✅ 99.9% webhook delivery success rate
- ✅ < 1% payment failure rate (excluding user issues)
- ✅ < 500ms API response time for subscription checks
- ✅ Zero security vulnerabilities
- ✅ 100% feature gate coverage

### Business Success
- 🎯 10% trial signup rate (of active users)
- 🎯 40% trial-to-paid conversion rate
- 🎯 < 5% monthly churn rate
- 🎯 $500 MRR within first month
- 🎯 Positive user feedback on pricing/value

### User Experience Success
- ✅ Seamless checkout experience
- ✅ Clear feature differentiation
- ✅ No confusion about billing
- ✅ Easy subscription management
- ✅ Responsive support for payment issues

---

## 🔮 Future Enhancements

### Phase 2 Features (Post-Launch)

1. **Annual Billing Option**
   - Offer 2 months free with annual plan
   - $99/year (vs $119.88 monthly)
   - Increase customer lifetime value

2. **Team/Family Plans**
   - Multiple users under one subscription
   - Shared budgets
   - $14.99/month for up to 5 users

3. **Lifetime License**
   - One-time payment option
   - $299 lifetime access
   - For users who prefer no recurring charges

4. **Referral Program**
   - Give 1 month free for each referral
   - Referred user gets 1 month free
   - Viral growth mechanism

5. **Usage-Based Pricing**
   - Free tier with limits (e.g., 100 transactions/month)
   - Premium removes limits
   - Better conversion for power users

6. **Enterprise Plan**
   - Custom pricing
   - Priority support
   - Custom features
   - White-label option

---

## 📝 Notes & Considerations

### Why 60-Day Trial?
- Industry standard is 7-30 days
- 60 days allows users to experience 2 full budget cycles
- Builds habit and demonstrates value
- Higher conversion rate expected
- Competitive differentiator

### Why Require Credit Card for Trial?
- Reduces trial abuse
- Higher quality leads
- Smoother conversion (no re-entry of payment info)
- Industry best practice for SaaS
- Stripe handles securely

### Pricing Rationale
- $9.99/month is competitive for budgeting apps
- YNAB: $14.99/month
- Mint: Free (ad-supported, being shut down)
- EveryDollar: $17.99/month
- PocketSmith: $9.95/month
- Our pricing: Premium features at accessible price

### Data Retention on Downgrade
- Keep ALL user data when downgrading
- Only disable premium features
- Easy to upgrade again
- Builds trust
- No data loss fear

### Grandfathering Existing Users
- Decision: Grandfather all existing users to Premium for 6 months
- Reward early adopters
- Build goodwill
- Smooth transition
- Announce well in advance

---

## ✅ Final Checklist

Before marking this feature complete:

- [ ] All database migrations deployed
- [ ] All API endpoints implemented and tested
- [ ] All UI components built and polished
- [ ] Feature gating working correctly
- [ ] Stripe integration fully functional
- [ ] Webhooks processing correctly
- [ ] Email notifications sending
- [ ] Documentation complete
- [ ] Security audit passed
- [ ] Performance testing passed
- [ ] User acceptance testing completed
- [ ] Legal documents updated
- [ ] Support team trained
- [ ] Monitoring and alerts configured
- [ ] Rollback plan documented
- [ ] Launch announcement prepared

---

**Document Version:** 1.0
**Last Updated:** 2025-01-24
**Author:** Budget App Team
**Status:** Planning Phase


