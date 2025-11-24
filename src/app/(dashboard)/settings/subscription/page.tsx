'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Crown, Check, X, Sparkles, CreditCard } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const PREMIUM_FEATURES = [
  'Monthly Funding Tracking',
  'Category Types & Priorities',
  'Smart Allocation',
  'Income Buffer',
  'Goals & Debt Tracking',
  'Loans Management',
  'Advanced Reports',
  'Priority Support',
];

const FREE_FEATURES = [
  'Unlimited Accounts',
  'Unlimited Categories',
  'Unlimited Transactions',
  'CSV Import',
  'Basic Reports',
  'Data Backup & Restore',
];

function SubscriptionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, loading, isPremium, isTrialing, trialDaysRemaining, refreshSubscription } = useSubscription();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccess('Successfully started your 60-day free trial!');
      refreshSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      setError('Checkout was canceled. You can try again anytime.');
    }
  }, [searchParams, refreshSubscription]);

  const handleStartTrial = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch('/api/subscription/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          successUrl: `${window.location.origin}/settings/subscription?success=true`,
          cancelUrl: `${window.location.origin}/settings/subscription?canceled=true`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to start checkout');
      setActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch('/api/subscription/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/settings/subscription`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Failed to open customer portal');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription and billing
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <X className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription status and details</CardDescription>
            </div>
            <Badge
              variant={isPremium ? 'default' : 'secondary'}
              className={isPremium ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : ''}
            >
              {isPremium && <Crown className="h-3 w-3 mr-1" />}
              {subscription?.tier === 'premium' ? 'Premium' : 'Free'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">{subscription?.status || 'Active'}</p>
            </div>
            {isTrialing && trialDaysRemaining !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Trial Ends In</p>
                <p className="font-medium">{trialDaysRemaining} days</p>
              </div>
            )}
          </div>

          {isPremium && !isTrialing && subscription?.current_period_end && (
            <div>
              <p className="text-sm text-muted-foreground">Next Billing Date</p>
              <p className="font-medium">
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
          )}

          <div className="pt-4">
            {isPremium ? (
              <Button
                onClick={handleManageSubscription}
                disabled={actionLoading}
                className="w-full"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Subscription
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleStartTrial}
                disabled={actionLoading}
                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0"
                size="lg"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start 60-Day Premium Free Trial
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison - only show if not premium */}
      {!isPremium && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade to Premium</CardTitle>
            <CardDescription>
              Unlock powerful features to take your budgeting to the next level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Free Tier */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">Free</h3>
                  <p className="text-2xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                </div>
                <ul className="space-y-2">
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Premium Tier */}
              <div className="space-y-4 border-2 border-primary rounded-lg p-4 relative">
                <div className="absolute -top-3 left-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                  RECOMMENDED
                </div>
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    Premium
                  </h3>
                  <p className="text-2xl font-bold">$5<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                  <p className="text-xs text-green-600 font-semibold mt-1">60-day free trial</p>
                </div>
                <p className="text-sm text-muted-foreground">Everything in Free, plus:</p>
                <ul className="space-y-2">
                  {PREMIUM_FEATURES.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <span className="text-sm font-semibold">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={handleStartTrial}
                  disabled={actionLoading}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0"
                  size="lg"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Start 60-Day Premium Free Trial
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SubscriptionPageContent />
    </Suspense>
  );
}

