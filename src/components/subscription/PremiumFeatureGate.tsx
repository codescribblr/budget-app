'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFeature, useFeatures } from '@/contexts/FeatureContext';
import { UpgradePrompt } from './UpgradePrompt';
import { Loader2 } from 'lucide-react';
import type { FeatureName } from '@/contexts/FeatureContext';

interface PremiumFeatureGateProps {
  children: React.ReactNode;
  featureName: string;
  featureDescription?: string;
  featureKey?: FeatureName; // Optional feature key to check if feature is enabled
  fallback?: React.ReactNode;
}

export function PremiumFeatureGate({
  children,
  featureName,
  featureDescription,
  featureKey,
  fallback,
}: PremiumFeatureGateProps) {
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const { loading: featuresLoading } = useFeatures();

  // Map feature names to feature keys for backward compatibility
  const featureKeyMap: Record<string, FeatureName> = {
    'Goals & Debt Tracking': 'goals',
    'Loans Management': 'loans',
    'Advanced Reporting': 'advanced_reporting',
    'AI Chat Assistant': 'ai_chat',
    'Income Buffer': 'income_buffer',
  };

  // Use provided featureKey or try to map from featureName
  const actualFeatureKey = featureKey || featureKeyMap[featureName];
  const isFeatureEnabled = actualFeatureKey ? useFeature(actualFeatureKey) : true;

  const loading = subscriptionLoading || featuresLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user doesn't have premium, show upgrade prompt
  if (!isPremium) {
    return fallback || (
      <UpgradePrompt 
        featureName={featureName} 
        featureDescription={featureDescription}
      />
    );
  }

  // If user has premium but feature is disabled, don't show anything (return null)
  if (actualFeatureKey && !isFeatureEnabled) {
    return null;
  }

  return <>{children}</>;
}

