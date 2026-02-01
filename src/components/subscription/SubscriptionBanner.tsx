'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, Crown, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useLocalStorage } from '@/hooks/use-local-storage';

export function SubscriptionBanner() {
  const { subscription, isPremium, isTrialing, trialDaysRemaining, loading } = useSubscription();
  const [dismissed, setDismissed] = useLocalStorage<Record<string, boolean>>('subscription-banner-dismissed', {});
  const [localDismissed, setLocalDismissed] = useState(false);

  if (loading || !subscription) {
    return null;
  }

  // Don't show if user has active premium subscription
  if (isPremium && !isTrialing && subscription.status === 'active') {
    return null;
  }

  const bannerKey = `${subscription.account_id}-${subscription.status}-${trialDaysRemaining}`;
  const isDismissed = dismissed[bannerKey] || localDismissed;

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setLocalDismissed(true);
    setDismissed({ ...dismissed, [bannerKey]: true });
  };

  // Trial ending soon (7 days or less)
  if (isTrialing && trialDaysRemaining !== null && trialDaysRemaining <= 7) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 mb-4">
        <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1">
            <span className="font-semibold text-yellow-900 dark:text-yellow-100">
              {trialDaysRemaining === 0 
                ? 'Your Premium trial ends today'
                : trialDaysRemaining === 1
                ? 'Your Premium trial ends tomorrow'
                : `Your Premium trial ends in ${trialDaysRemaining} days`}
            </span>
            <span className="text-yellow-800 dark:text-yellow-200 ml-2">
              You'll be billed $100/year unless you cancel.
            </span>
          </div>
          <div className="flex gap-2">
            <Link href="/settings/subscription">
              <Button size="sm" variant="default">
                Manage Subscription
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Payment failed - need to update payment method
  if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    return (
      <Alert className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 mb-4">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1">
            <span className="font-semibold text-red-900 dark:text-red-100">
              Payment Failed - Premium Access Disabled
            </span>
            <span className="text-red-800 dark:text-red-200 ml-2">
              Please update your payment method to reactivate your Premium subscription.
            </span>
          </div>
          <div className="flex gap-2">
            <Link href="/settings/subscription">
              <Button size="sm" variant="default">
                <CreditCard className="h-4 w-4 mr-2" />
                Update Payment Method
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial expired but subscription still exists (shouldn't happen, but handle it)
  if (subscription.status === 'trialing' && trialDaysRemaining !== null && trialDaysRemaining < 0) {
    return (
      <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800 mb-4">
        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1">
            <span className="font-semibold text-orange-900 dark:text-orange-100">
              Your Premium trial has ended
            </span>
            <span className="text-orange-800 dark:text-orange-200 ml-2">
              Premium features have been disabled. Update your payment method to continue.
            </span>
          </div>
          <div className="flex gap-2">
            <Link href="/settings/subscription">
              <Button size="sm" variant="default">
                <CreditCard className="h-4 w-4 mr-2" />
                Update Payment Method
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
