# Subscription Feature - Code Examples

This document contains ready-to-use code snippets for implementing the subscription feature.

---

## 🔧 Utility Functions

### `src/lib/subscription-utils.ts`

```typescript
import { createClient } from './supabase/server';

export interface UserSubscription {
  id: number;
  user_id: string;
  tier: 'free' | 'premium';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get user's subscription from database
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
  
  return data;
}

/**
 * Check if subscription is in an active state
 */
export function hasActiveSubscription(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  
  const activeStatuses = ['active', 'trialing'];
  return activeStatuses.includes(subscription.status);
}

/**
 * Check if user has premium access
 */
export function isPremiumUser(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  
  return subscription.tier === 'premium' && hasActiveSubscription(subscription);
}

/**
 * Get days remaining in trial
 */
export function getTrialDaysRemaining(subscription: UserSubscription | null): number | null {
  if (!subscription || subscription.status !== 'trialing' || !subscription.trial_end) {
    return null;
  }
  
  const trialEnd = new Date(subscription.trial_end);
  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Require premium subscription (throws if not premium)
 */
export async function requirePremiumSubscription(userId: string): Promise<UserSubscription> {
  const subscription = await getUserSubscription(userId);
  
  if (!isPremiumUser(subscription)) {
    throw new Error('Premium subscription required');
  }
  
  return subscription!;
}

/**
 * Get or create Stripe customer for user
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  stripe: any
): Promise<string> {
  const supabase = await createClient();
  
  // Check if customer already exists
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }
  
  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: { user_id: userId }
  });
  
  // Store customer ID
  await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customer.id,
      tier: 'free',
      status: 'active',
    }, {
      onConflict: 'user_id'
    });
  
  return customer.id;
}
```

---

## 🎨 React Context

### `src/contexts/SubscriptionContext.tsx`

```typescript
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserSubscription } from '@/lib/subscription-utils';
import { isPremiumUser, getTrialDaysRemaining } from '@/lib/subscription-utils';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
  isPremium: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/subscription/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      
      const data = await response.json();
      setSubscription(data.subscription);
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const value: SubscriptionContextType = {
    subscription,
    loading,
    error,
    isPremium: isPremiumUser(subscription),
    isTrialing: subscription?.status === 'trialing',
    trialDaysRemaining: getTrialDaysRemaining(subscription),
    refreshSubscription: fetchSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
```

---

## 🎨 UI Components

### Premium Feature Gate

**File:** `src/components/subscription/PremiumFeatureGate.tsx`

```typescript
'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { UpgradePrompt } from './UpgradePrompt';
import { Loader2 } from 'lucide-react';

interface PremiumFeatureGateProps {
  children: React.ReactNode;
  featureName: string;
  featureDescription?: string;
  fallback?: React.ReactNode;
}

export function PremiumFeatureGate({
  children,
  featureName,
  featureDescription,
  fallback,
}: PremiumFeatureGateProps) {
  const { isPremium, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPremium) {
    return fallback || (
      <UpgradePrompt
        featureName={featureName}
        featureDescription={featureDescription}
      />
    );
  }

  return <>{children}</>;
}
```

### Upgrade Prompt

**File:** `src/components/subscription/UpgradePrompt.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Check } from 'lucide-react';

interface UpgradePromptProps {
  featureName: string;
  featureDescription?: string;
}

const PREMIUM_BENEFITS = [
  'Monthly Funding Tracking',
  'Category Types & Priorities',
  'Smart Allocation',
  'Income Buffer',
  'Goals & Debt Tracking',
  'Advanced Reports',
  'Priority Support',
];

export function UpgradePrompt({ featureName, featureDescription }: UpgradePromptProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = () => {
    setLoading(true);
    router.push('/settings/subscription');
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-2xl w-full border-2 border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl mb-2">
              {featureName} is a Premium Feature
            </CardTitle>
            <CardDescription className="text-base">
              {featureDescription || 'Upgrade to Premium to unlock this feature and more'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Premium Features Include:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PREMIUM_BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">
              <span className="text-2xl font-bold text-foreground">$9.99</span>/month
            </div>
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                🎉 Start with a 60-day free trial!
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Cancel anytime before the trial ends - no charge
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Start Free Trial'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Credit card required • Cancel anytime
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Subscription Badge

**File:** `src/components/subscription/SubscriptionBadge.tsx`

```typescript
'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

export function SubscriptionBadge() {
  const { subscription, isPremium, isTrialing, trialDaysRemaining } = useSubscription();

  if (!subscription) return null;

  if (isPremium) {
    return (
      <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-orange-500">
        <Crown className="h-3 w-3 mr-1" />
        Premium
        {isTrialing && trialDaysRemaining !== null && (
          <span className="ml-1">({trialDaysRemaining}d trial)</span>
        )}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      Free
    </Badge>
  );
}
```

---

## 🔌 API Routes

### Create Checkout Session

**File:** `src/app/api/subscription/create-checkout-session/route.ts`

```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getOrCreateStripeCustomer } from '@/lib/subscription-utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    const { successUrl, cancelUrl } = await request.json();

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!, stripe);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PREMIUM_PRICE_ID!,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 60,
        metadata: {
          user_id: user.id,
        },
      },
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?success=true`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

### Create Portal Session

**File:** `src/app/api/subscription/create-portal-session/route.ts`

```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getUserSubscription } from '@/lib/subscription-utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser();
    const { returnUrl } = await request.json();

    // Get user's subscription
    const subscription = await getUserSubscription(user.id);

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      );
    }

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
```

### Get Subscription Status

**File:** `src/app/api/subscription/status/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getUserSubscription } from '@/lib/subscription-utils';

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();
    const subscription = await getUserSubscription(user.id);

    // If no subscription exists, return default free tier
    if (!subscription) {
      return NextResponse.json({
        subscription: {
          tier: 'free',
          status: 'active',
          stripe_customer_id: null,
          stripe_subscription_id: null,
          trial_start: null,
          trial_end: null,
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
        },
      });
    }

    return NextResponse.json({
      subscription,
    });
  } catch (error: any) {
    console.error('Error fetching subscription status:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
```

### Stripe Webhooks

**File:** `src/app/api/webhooks/stripe/route.ts`

```typescript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string;

        if (!userId) break;

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Create or update subscription record
        await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            tier: 'premium',
            status: subscription.status,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            stripe_price_id: subscription.items.data[0].price.id,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        // TODO: Send welcome email
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;

        if (!userId) break;

        await supabase
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('user_subscriptions')
          .update({
            tier: 'free',
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        // TODO: Send cancellation confirmation email
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        // TODO: Send receipt email
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        await supabase
          .from('user_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        // TODO: Send payment failed email
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

---

## 🎯 Usage Examples

### Protecting a Page

```typescript
// app/(dashboard)/goals/page.tsx
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';

export default function GoalsPage() {
  return (
    <PremiumFeatureGate
      featureName="Goals Tracking"
      featureDescription="Set savings goals and track your progress over time"
    >
      {/* Your goals page content */}
    </PremiumFeatureGate>
  );
}
```

### Protecting an API Route

```typescript
// app/api/goals/route.ts
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { requirePremiumSubscription } from '@/lib/subscription-utils';

export async function GET() {
  try {
    const { user } = await getAuthenticatedUser();
    await requirePremiumSubscription(user.id);

    // Premium feature logic...
  } catch (error: any) {
    if (error.message === 'Premium subscription required') {
      return NextResponse.json({ error: 'Premium subscription required' }, { status: 403 });
    }
    // Handle other errors...
  }
}
```

### Conditional Feature Display

```typescript
// components/Dashboard.tsx
import { useSubscription } from '@/contexts/SubscriptionContext';

export function Dashboard() {
  const { isPremium } = useSubscription();

  return (
    <div>
      {/* Always visible */}
      <AccountsSummary />

      {/* Premium only */}
      {isPremium && <AdvancedReports />}

      {/* Show upgrade prompt if not premium */}
      {!isPremium && (
        <Card>
          <CardContent className="text-center p-6">
            <p>Unlock Advanced Reports with Premium</p>
            <Button onClick={() => router.push('/settings/subscription')}>
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```


