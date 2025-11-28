'use client';

import { useFeature } from '@/contexts/FeatureContext';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { FeatureName } from '@/contexts/FeatureContext';

interface FeatureGateProps {
  children: React.ReactNode;
  featureName: FeatureName;
}

export function FeatureGate({ children, featureName }: FeatureGateProps) {
  const router = useRouter();
  const isEnabled = useFeature(featureName);

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Feature Not Enabled</CardTitle>
            <CardDescription>
              Advanced Reporting feature is not enabled for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              To access Category Reports, please enable the Advanced Reporting feature in your settings.
            </p>
            <Button onClick={() => router.push('/settings/features')}>
              Go to Feature Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

