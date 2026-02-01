'use client';

import { useRouter } from 'next/navigation';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useFeature, useFeatures } from '@/contexts/FeatureContext';
import { UpgradePrompt } from './UpgradePrompt';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  const router = useRouter();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const { loading: featuresLoading } = useFeatures();

  // Map feature names to feature keys for backward compatibility
  const featureKeyMap: Record<string, FeatureName> = {
    'Goals & Debt Tracking': 'goals',
    'Loans Management': 'loans',
    'Advanced Reporting': 'advanced_reporting',
    'AI Features': 'ai_chat',
    'AI Chat Assistant': 'ai_chat', // Backward compatibility
    'Income Buffer': 'income_buffer',
    'Automatic Imports': 'automatic_imports',
    'Retirement Planning': 'retirement_planning',
    'Recurring Transactions': 'recurring_transactions',
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

  // If user has premium but feature is disabled, show feature disabled message
  if (actualFeatureKey && !isFeatureEnabled) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Not Enabled</CardTitle>
            <CardDescription>
              {featureName} is not enabled for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              To access {featureName}, please enable the feature in your settings.
            </p>
            <Button onClick={() => router.push('/settings')}>
              Go to Feature Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}


