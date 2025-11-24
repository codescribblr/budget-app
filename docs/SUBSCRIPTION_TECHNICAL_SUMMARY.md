# Subscription Feature - Technical Implementation Summary

## Quick Reference Guide

This document provides a condensed technical overview for implementing the subscription feature. For complete details, see `SUBSCRIPTION_FEATURE_PLAN.md`.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Subscription │  │   Upgrade    │  │   Feature    │      │
│  │   Settings   │  │   Prompts    │  │    Gates     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  /api/subscription/*  │  /api/webhooks/stripe        │   │
│  └──────────┬────────────┴──────────────┬────────────────┘   │
└─────────────┼───────────────────────────┼─────────────────────┘
              │                           │
              ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐
    │  Stripe API     │         │  Supabase DB    │
    │  - Checkout     │         │  - user_subs    │
    │  - Portal       │         │  - features     │
    │  - Webhooks     │         │  - users        │
    └─────────────────┘         └─────────────────┘
```

---

## 📦 Required Dependencies

```bash
npm install stripe @stripe/stripe-js
```

**Versions:**
- `stripe`: ^14.0.0 (server-side SDK)
- `@stripe/stripe-js`: ^2.0.0 (client-side SDK)

---

## 🗄️ Database Schema

### Migration File: `021_add_subscriptions.sql`

```sql
-- User subscriptions table
CREATE TABLE user_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);

-- RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscription" ON user_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription" ON user_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription" ON user_subscriptions FOR UPDATE USING (auth.uid() = user_id);

-- Mark premium features
ALTER TABLE user_feature_flags ADD COLUMN requires_premium BOOLEAN DEFAULT false;
UPDATE user_feature_flags SET requires_premium = true 
WHERE feature_name IN ('monthly_funding_tracking', 'category_types', 'priority_system', 
                       'smart_allocation', 'income_buffer', 'advanced_reporting');
```

---

## 🔐 Environment Variables

```bash
# .env.local and Vercel
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
```

---

## 🔌 API Routes to Create

### 1. Create Checkout Session
**File:** `src/app/api/subscription/create-checkout-session/route.ts`

```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-11-20.acacia' });

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser();
  const { priceId, successUrl, cancelUrl } = await request.json();

  // Get or create Stripe customer
  let customerId = await getStripeCustomerId(user.id);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { user_id: user.id }
    });
    customerId = customer.id;
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 60,
      metadata: { user_id: user.id }
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return NextResponse.json({ sessionId: session.id, url: session.url });
}
```

### 2. Create Portal Session
**File:** `src/app/api/subscription/create-portal-session/route.ts`

### 3. Get Subscription Status
**File:** `src/app/api/subscription/status/route.ts`

### 4. Stripe Webhooks
**File:** `src/app/api/webhooks/stripe/route.ts`

---

## 🎨 Key UI Components

### 1. Subscription Settings Page
**File:** `src/app/(dashboard)/settings/subscription/page.tsx`

**Features:**
- Current plan display
- Plan comparison table
- Upgrade/manage buttons
- Billing history

### 2. Premium Feature Gate
**File:** `src/components/subscription/PremiumFeatureGate.tsx`

```typescript
export function PremiumFeatureGate({ children, featureName }: Props) {
  const { subscription } = useSubscription();
  
  if (!isPremiumUser(subscription)) {
    return <UpgradePrompt featureName={featureName} />;
  }
  
  return <>{children}</>;
}
```

### 3. Upgrade Prompt Modal
**File:** `src/components/subscription/UpgradePrompt.tsx`

---

## 🔒 Access Control

### Subscription Context
**File:** `src/contexts/SubscriptionContext.tsx`

```typescript
export function useSubscription() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSubscription();
  }, []);
  
  return { subscription, loading, isPremium: isPremiumUser(subscription) };
}
```

### Utility Functions
**File:** `src/lib/subscription-utils.ts`

```typescript
export function isPremiumUser(subscription: any): boolean {
  if (!subscription) return false;
  const activeStatuses = ['active', 'trialing'];
  return subscription.tier === 'premium' && activeStatuses.includes(subscription.status);
}

export async function requirePremiumSubscription(userId: string) {
  const subscription = await getUserSubscription(userId);
  if (!isPremiumUser(subscription)) {
    throw new Error('Premium subscription required');
  }
}
```


