'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Check } from 'lucide-react';

interface UpgradePromptProps {
  featureName: string;
  featureDescription?: string;
}

const PREMIUM_BENEFITS = [
  'Monthly Funding Tracking',
  'Category Types & Priorities',
  'Smart Allocation',
  'Income Buffer',
  'Goals & Debt Tracking',
  'Loans Management',
  'Advanced Reports',
  'Priority Support',
];

export function UpgradePrompt({ featureName, featureDescription }: UpgradePromptProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = () => {
    setLoading(true);
    router.push('/settings/subscription');
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-2xl w-full border-2 border-primary/20">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl mb-2">
              {featureName} is a Premium Feature
            </CardTitle>
            <CardDescription className="text-base">
              {featureDescription || 'Upgrade to Premium to unlock this feature and more'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Premium Features Include:
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PREMIUM_BENEFITS.map((benefit) => (
                <div key={benefit} className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">
              <span className="text-2xl font-bold text-foreground">$5.00</span>/month
            </div>
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                🎉 Start with a 60-day free trial!
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Cancel anytime before the trial ends - no charge
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleUpgrade}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Start Free Trial'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Credit card required • Cancel anytime
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


