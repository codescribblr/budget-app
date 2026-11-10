'use client';
import { freshFetch as fetch } from "@/lib/view-freshness";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useResourceVersion } from '@/components/new-look/use-resource-version';
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
  const version = useResourceVersion("settings");
  const loaded = useRef(false), sequence = useRef(0);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    const id = ++sequence.current;
    try {
      setLoading(!loaded.current);
      setError(null);
      
      const response = await fetch('/api/subscription/status');
      if (id !== sequence.current) return;
      // Background refreshes may finish after sign-out. Clear private state
      // instead of treating an ended session as a subscription service failure.
      if (response.status === 401) {
        loaded.current = false;
        setSubscription(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }
      
      const data = await response.json();
      if (id !== sequence.current) return;
      loaded.current = true; setSubscription(data.subscription);
    } catch (err: any) {
      if (id !== sequence.current) return;
      console.error('Error fetching subscription:', err);
      setError(err.message);
      if (!loaded.current) setSubscription(null);
    } finally {
      if (id === sequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
    return () => { sequence.current++; };
  }, [fetchSubscription, version]);

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


