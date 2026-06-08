'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Crown, Check, X, Sparkles, CreditCard } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAccountPermissions } from '@/hooks/use-account-permissions';

const PREMIUM_FEATURES = [
  'Monthly Funding Tracking',
  'Category Types & Priorities',
  'Smart Allocation',
  'Income Buffer',
  'Goals & Debt Tracking',
  'Loans Management',
  'Retirement Planning & Net Worth Tracking',
  'Automatic Transaction Import (powered by Teller IO)',
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
  const { isOwner, isLoading: permissionsLoading } = useAccountPermissions();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ daysLate?: number; requiresBillingUpdate?: boolean; changes?: string[] } | null>(null);
  const hasSyncedRef = useRef(false);

  // Auto-sync subscription status from Stripe on page load (only once, after loading completes)
  useEffect(() => {
    // Skip if already synced
    if (hasSyncedRef.current) return;
    
    // Wait for permissions and subscription to load, and ensure user is owner
    if (permissionsLoading || loading || !isOwner) return;
    
    // Skip if this is a redirect from checkout (will be handled by the other useEffect)
    if (searchParams.get('success') || searchParams.get('canceled')) return;
    
    // Mark as synced to prevent multiple calls
    hasSyncedRef.current = true;
    
    const syncSubscriptionStatus = async () => {
      setSyncing(true);
      try {
        const response = await fetch('/api/subscription/sync', {
          method: 'POST',
        });
        
        if (response.ok) {
          const data = await response.json();
          setSyncResult({
            daysLate: data.daysLate || undefined,
            requiresBillingUpdate: data.requiresBillingUpdate || false,
            changes: data.changes || [],
          });
          
          // Refresh subscription context to get updated status
          // Use setTimeout to avoid triggering re-renders that might cause loops
          setTimeout(() => {
            refreshSubscription();
          }, 100);
          
          // Show success message if status was updated
          if (data.changes && data.changes.length > 0) {
            const hasStatusChange = data.changes.some((c: string) => c.includes('status_changed') || c.includes('downgraded') || c.includes('upgraded'));
            if (hasStatusChange) {
              setSuccess('Subscription status synced with Stripe');
              setTimeout(() => setSuccess(null), 5000);
            }
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          // Don't show error if no subscription found (user might not have one yet)
          if (response.status !== 404) {
            console.error('Error syncing subscription:', errorData.error);
          }
        }
      } catch (err) {
        console.error('Error syncing subscription:', err);
        // Don't show error to user - sync is a background operation
      } finally {
        setSyncing(false);
      }
    };

    syncSubscriptionStatus();
    // Note: We check loading inside but don't include it in deps to avoid loops
    // The hasSyncedRef ensures we only sync once even if loading changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, permissionsLoading]); // hasSyncedRef prevents multiple calls even if loading changes

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccess('Successfully started your 60-day free trial!');
      
      // Try to sync subscription from Stripe as fallback
      const syncSubscription = async () => {
        try {
          const response = await fetch('/api/subscription/sync', {
            method: 'POST',
          });
          if (response.ok) {
            console.log('Subscription synced successfully');
            refreshSubscription();
          }
        } catch (err) {
          console.error('Error syncing subscription:', err);
        }
      };

      // Wait a moment for webhook to process, then refresh
      setTimeout(() => {
        refreshSubscription();
        syncSubscription();
      }, 2000);
      // Also refresh again after a longer delay in case webhook is slow
      setTimeout(() => {
        refreshSubscription();
      }, 5000);
    } else if (searchParams.get('canceled') === 'true') {
      setError('Checkout was canceled. You can try again anytime.');
    }
  }, [searchParams, refreshSubscription]);

  // Handle automatic checkout for OAuth signups with premium plan
  useEffect(() => {
    const checkoutParam = searchParams.get('checkout');
    if (checkoutParam === 'premium' && !loading && isOwner && !isPremium) {
      // Remove the checkout parameter from URL to prevent re-triggering
      const params = new URLSearchParams(searchParams.toString());
      params.delete('checkout');
      router.replace(`/settings/subscription?${params.toString()}`, { scroll: false });
      
      // Automatically start checkout
      handleStartTrial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading, isOwner, isPremium, router]);

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

      {/* Billing Issue Alert */}
      {syncResult?.requiresBillingUpdate && syncResult.daysLate !== undefined && syncResult.daysLate > 0 && (
        <Alert variant="destructive">
          <X className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Payment Failed - Action Required</p>
                <p className="text-sm mt-1">
                  Your subscription payment failed {syncResult.daysLate} day{syncResult.daysLate !== 1 ? 's' : ''} ago. 
                  Premium features have been disabled until payment is updated.
                </p>
              </div>
              <Button
                onClick={handleManageSubscription}
                disabled={actionLoading || !isOwner || permissionsLoading}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                Update Payment
              </Button>
            </div>
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
          {syncing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Syncing subscription status with Stripe...
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium capitalize">
                {subscription?.status || 'Active'}
                {syncResult?.requiresBillingUpdate && (
                  <Badge variant="destructive" className="ml-2">Payment Failed</Badge>
                )}
              </p>
            </div>
            {isTrialing && trialDaysRemaining !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Trial Ends In</p>
                <p className="font-medium">{trialDaysRemaining} days</p>
              </div>
            )}
            {syncResult?.daysLate !== undefined && syncResult.daysLate > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Days Past Due</p>
                <p className="font-medium text-destructive">{syncResult.daysLate} days</p>
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
                disabled={actionLoading || !isOwner || permissionsLoading}
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
                disabled={actionLoading || !isOwner || permissionsLoading}
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
            {!isOwner && !permissionsLoading && (
              <p className="text-sm text-muted-foreground mt-2 text-center">Only account owners can manage subscriptions</p>
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
                  <p className="text-2xl font-bold">$8.33<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                  <p className="text-xs text-green-600 font-semibold mt-1">60-day free trial</p>
                  <p className="text-xs text-muted-foreground mt-1">Billed annually as $100/year</p>
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
                  disabled={actionLoading || !isOwner || permissionsLoading}
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


