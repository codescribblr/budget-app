'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

export function SubscriptionBadge() {
  const { subscription, isPremium, isTrialing, trialDaysRemaining } = useSubscription();

  if (!subscription) return null;

  if (isPremium) {
    return (
      <Badge
        variant="default"
        className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0"
      >
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

