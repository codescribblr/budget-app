'use client';

import { useFeatures } from '@/contexts/FeatureContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { FeatureName } from '@/contexts/FeatureContext';

interface RecurringTransactionsFeatureGateProps {
  children: React.ReactNode;
  featureName?: FeatureName;
}

export function RecurringTransactionsFeatureGate({ 
  children, 
  featureName = 'recurring_transactions' 
}: RecurringTransactionsFeatureGateProps) {
  const router = useRouter();
  const { loading, isFeatureEnabled } = useFeatures();
  const isEnabled = isFeatureEnabled(featureName);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Not Enabled</CardTitle>
            <CardDescription>
              Recurring Transactions feature is not enabled for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              To access Recurring Transactions, please enable the feature in your settings.
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




