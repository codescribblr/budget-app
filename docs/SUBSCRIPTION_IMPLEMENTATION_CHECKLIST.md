# Subscription Feature - Implementation Checklist

Use this checklist to track progress on the subscription feature implementation.

---

## 🎯 Phase 1: Foundation & Setup

### Stripe Account Setup
- [ ] Create Stripe account at stripe.com
- [ ] Complete business verification
- [ ] Enable test mode
- [ ] Create "Budget App Premium" product
- [ ] Set price to $9.99/month with 60-day trial
- [ ] Copy Price ID to environment variables
- [ ] Configure Customer Portal settings
- [ ] Set up webhook endpoint
- [ ] Copy webhook signing secret
- [ ] Copy API keys (publishable and secret)

### Development Environment
- [ ] Install dependencies: `npm install stripe @stripe/stripe-js`
- [ ] Add environment variables to `.env.local`
- [ ] Add environment variables to Vercel
- [ ] Test Stripe API connection

### Database Setup
- [ ] Create migration file `021_add_subscriptions.sql`
- [ ] Add `user_subscriptions` table
- [ ] Add indexes for performance
- [ ] Enable RLS policies
- [ ] Add `requires_premium` column to `user_feature_flags`
- [ ] Mark existing premium features
- [ ] Run migration locally: `npm run migrate`
- [ ] Deploy migration to production

---

## 🔌 Phase 2: API Implementation

### Subscription API Routes
- [ ] Create `/api/subscription/create-checkout-session/route.ts`
  - [ ] Get or create Stripe customer
  - [ ] Create checkout session with trial
  - [ ] Return session URL
  - [ ] Error handling
  - [ ] Test with Postman/curl

- [ ] Create `/api/subscription/create-portal-session/route.ts`
  - [ ] Get user's Stripe customer ID
  - [ ] Create portal session
  - [ ] Return portal URL
  - [ ] Error handling
  - [ ] Test portal access

- [ ] Create `/api/subscription/status/route.ts`
  - [ ] Query user_subscriptions table
  - [ ] Return subscription details
  - [ ] Handle no subscription case
  - [ ] Test response format

### Webhook Handler
- [ ] Create `/api/webhooks/stripe/route.ts`
- [ ] Verify webhook signature
- [ ] Handle `checkout.session.completed`
  - [ ] Create subscription record
  - [ ] Set trial dates
  - [ ] Update user tier
- [ ] Handle `customer.subscription.updated`
  - [ ] Update subscription status
  - [ ] Update billing dates
- [ ] Handle `customer.subscription.deleted`
  - [ ] Mark as canceled
  - [ ] Downgrade to free tier
- [ ] Handle `invoice.paid`
  - [ ] Update payment status
  - [ ] Send receipt email
- [ ] Handle `invoice.payment_failed`
  - [ ] Update status to past_due
  - [ ] Send payment failed email
- [ ] Test all webhook events with Stripe CLI
- [ ] Deploy webhook endpoint
- [ ] Register webhook in Stripe Dashboard

### Utility Functions
- [ ] Create `src/lib/subscription-utils.ts`
  - [ ] `getUserSubscription(userId)`
  - [ ] `isPremiumUser(subscription)`
  - [ ] `hasActiveSubscription(subscription)`
  - [ ] `requirePremiumSubscription(userId)`
  - [ ] `getOrCreateStripeCustomer(user)`
- [ ] Add unit tests for utility functions

---

## 🎨 Phase 3: UI Components

### Subscription Context
- [ ] Create `src/contexts/SubscriptionContext.tsx`
- [ ] Implement `useSubscription()` hook
- [ ] Fetch subscription on mount
- [ ] Provide subscription state to app
- [ ] Add to app providers

### Subscription Settings Page
- [ ] Create `/settings/subscription/page.tsx`
- [ ] Build current plan card component
  - [ ] Show tier (Free/Premium)
  - [ ] Show status (Active/Trialing/Canceled)
  - [ ] Show trial countdown if applicable
  - [ ] Show next billing date if premium
- [ ] Build plan comparison component
  - [ ] Free tier features list
  - [ ] Premium tier features list
  - [ ] Pricing display
  - [ ] "Current Plan" badge
- [ ] Add action buttons
  - [ ] "Start 60-Day Trial" for free users
  - [ ] "Manage Subscription" for premium users
  - [ ] Handle loading states
  - [ ] Handle errors
- [ ] Build billing history section (premium only)
  - [ ] Fetch invoices from Stripe
  - [ ] Display invoice list
  - [ ] Download PDF links
- [ ] Test all states (free, trialing, active, canceled)

### Premium Feature Gate Component
- [ ] Create `src/components/subscription/PremiumFeatureGate.tsx`
- [ ] Check subscription status
- [ ] Show children if premium
- [ ] Show upgrade prompt if free
- [ ] Add loading state
- [ ] Test with different features

### Upgrade Prompt Modal
- [ ] Create `src/components/subscription/UpgradePrompt.tsx`
- [ ] Feature-specific messaging
- [ ] Benefits list
- [ ] "Start Free Trial" CTA
- [ ] "Learn More" link
- [ ] Dismissible
- [ ] Test modal flow

### Navigation Updates
- [ ] Add "Subscription" to settings sidebar
  - [ ] Crown icon
  - [ ] Badge showing tier
- [ ] Update user menu dropdown
  - [ ] Show tier badge
  - [ ] Trial countdown if applicable
- [ ] Test navigation

---

## 🔒 Phase 4: Feature Gating

### Update Feature Flag System
- [ ] Modify `src/contexts/FeatureContext.tsx`
- [ ] Add subscription check to `isFeatureEnabled()`
- [ ] Return false if premium required but user is free
- [ ] Test feature access for free users
- [ ] Test feature access for premium users

### Gate Premium Features
- [ ] Wrap Goals page with `PremiumFeatureGate`
- [ ] Wrap Loans page with `PremiumFeatureGate`
- [ ] Wrap Advanced Reports with `PremiumFeatureGate`
- [ ] Add API guards to premium endpoints
  - [ ] Goals API routes
  - [ ] Loans API routes
  - [ ] Advanced reports API routes
- [ ] Test all gated features
- [ ] Verify upgrade prompts appear

### Edge Case Handling
- [ ] Handle expired trial (auto-downgrade)
- [ ] Handle failed payment (grace period)
- [ ] Handle canceled subscription (access until period end)
- [ ] Handle reactivation
- [ ] Test all edge cases

---

## 📧 Phase 5: Email Notifications

### Email Service Setup
- [ ] Choose email provider (Resend/SendGrid/Supabase)
- [ ] Set up account and API keys
- [ ] Add email templates
- [ ] Test email delivery

### Email Templates
- [ ] Trial started email
- [ ] Trial ending (7 days) email
- [ ] Trial ending (3 days) email
- [ ] Trial ending (1 day) email
- [ ] Trial converted to paid email
- [ ] Payment successful email
- [ ] Payment failed email
- [ ] Subscription canceled email

### Email Triggers
- [ ] Send trial started on checkout completion
- [ ] Schedule trial reminder emails
- [ ] Send payment emails on webhook events
- [ ] Send cancellation confirmation
- [ ] Test all email flows

---

## 🧪 Phase 6: Testing

### Unit Tests
- [ ] Test subscription utility functions
- [ ] Test webhook event handlers
- [ ] Test access control functions
- [ ] Test feature gating logic

### Integration Tests
- [ ] Test full trial signup flow
- [ ] Test trial cancellation flow
- [ ] Test trial to paid conversion
- [ ] Test payment failure handling
- [ ] Test subscription reactivation
- [ ] Test account deletion with active subscription

### End-to-End Tests
- [ ] Free user discovers premium feature
- [ ] Free user starts trial
- [ ] Trial user accesses premium features
- [ ] Trial user cancels before billing
- [ ] Trial user converts to paid
- [ ] Premium user manages subscription
- [ ] Premium user cancels subscription

### Performance Tests
- [ ] Subscription check performance (< 100ms)
- [ ] Webhook processing time (< 500ms)
- [ ] Page load with subscription data
- [ ] Database query optimization

---

## 🚀 Phase 7: Deployment

### Pre-Deployment
- [ ] Security audit
- [ ] Code review
- [ ] Update Terms of Service
- [ ] Update Privacy Policy
- [ ] Prepare announcement
- [ ] Train support team

### Deployment Steps
- [ ] Deploy database migration
- [ ] Deploy API routes
- [ ] Deploy UI components
- [ ] Switch Stripe to live mode
- [ ] Update environment variables to live keys
- [ ] Test live checkout (small amount)
- [ ] Monitor webhook delivery
- [ ] Monitor error logs

### Post-Deployment
- [ ] Announce feature to users
- [ ] Monitor subscription metrics
- [ ] Watch for errors
- [ ] Respond to support requests
- [ ] Gather feedback
- [ ] Iterate on conversion funnel

---

## 📊 Success Metrics

### Track These Metrics
- [ ] Trial signup rate
- [ ] Trial to paid conversion rate
- [ ] Monthly churn rate
- [ ] Monthly recurring revenue (MRR)
- [ ] Payment failure rate
- [ ] Webhook delivery success rate
- [ ] Feature usage by tier

### Set Up Monitoring
- [ ] Stripe Dashboard analytics
- [ ] Custom admin dashboard
- [ ] Error tracking (Sentry/similar)
- [ ] Webhook delivery monitoring
- [ ] Email delivery monitoring

---

## ✅ Final Checklist

- [ ] All code committed and pushed
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Environment variables set
- [ ] Stripe fully configured
- [ ] Webhooks registered and tested
- [ ] Emails sending correctly
- [ ] Feature gates working
- [ ] UI polished and responsive
- [ ] Security audit passed
- [ ] Legal documents updated
- [ ] Support team ready
- [ ] Monitoring configured
- [ ] Launch announcement ready
- [ ] Rollback plan documented

---

**Status:** Not Started  
**Started:** ___________  
**Completed:** ___________  
**Deployed:** ___________


