'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserSubscription } from '@/lib/subscription-utils';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
  isPremium: boolean;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/subscription/status');
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      
      const data = await response.json();
      setSubscription(data.subscription);
    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setError(err.message);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Helper functions moved inline to avoid server-side imports
  const isPremium = subscription?.tier === 'premium' &&
    ['active', 'trialing'].includes(subscription?.status || '');

  const trialDaysRemaining = subscription?.status === 'trialing' && subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const value: SubscriptionContextType = {
    subscription,
    loading,
    error,
    isPremium,
    isTrialing: subscription?.status === 'trialing',
    trialDaysRemaining,
    refreshSubscription: fetchSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}


