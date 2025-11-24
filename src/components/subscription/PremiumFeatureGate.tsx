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

