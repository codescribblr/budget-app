'use client';

import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';

interface RecurringTransactionsFeatureGateProps {
  children: React.ReactNode;
}

export function RecurringTransactionsFeatureGate({ 
  children
}: RecurringTransactionsFeatureGateProps) {
  return (
    <PremiumFeatureGate
      featureName="Recurring Transactions"
      featureDescription="Automatically detect and track recurring transactions like subscriptions, bills, and regular payments. Get notified about upcoming transactions and manage your recurring expenses."
      featureKey="recurring_transactions"
    >
      {children}
    </PremiumFeatureGate>
  );
}





