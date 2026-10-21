'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { Badge } from '@/components/ui/badge';
import { PremiumBadge } from './PremiumBadge';

export function SubscriptionBadge() {
  const { subscription, isPremium, isTrialing, trialDaysRemaining } = useSubscription();

  if (!subscription) return null;

  if (isPremium) {
    return (
      <PremiumBadge>
        {isTrialing && trialDaysRemaining !== null && (
          <span className="ml-1">({trialDaysRemaining}d trial)</span>
        )}
      </PremiumBadge>
    );
  }

  return (
    <Badge variant="secondary">
      Free
    </Badge>
  );
}


