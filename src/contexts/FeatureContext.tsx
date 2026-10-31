'use client';
import { freshFetch as fetch } from "@/lib/view-freshness";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useResourceVersion } from '@/components/new-look/use-resource-version';
import type { FeatureName } from '@/lib/feature-flags';

export type { FeatureName } from '@/lib/feature-flags';

export interface Feature {
  key: FeatureName;
  revision?: string | null;
  name: string;
  description: string;
  level: 'basic' | 'intermediate' | 'advanced' | 'power';
  dependencies: FeatureName[];
  dataLossWarning: boolean;
  requiresPremium: boolean;
  enabled: boolean;
  enabledAt: string | null;
  disabledAt: string | null;
}

interface FeatureContextType {
  features: Feature[];
  loading: boolean;
  error: string | null;
  hasPremium: boolean;
  isFeatureEnabled: (featureName: FeatureName) => boolean;
  toggleFeature: (featureName: FeatureName, enabled: boolean, originalRevision?: string | null) => Promise<void>;
  refreshFeatures: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export function FeatureProvider({ children }: { children: React.ReactNode }) {
  const modern = usePathname()?.startsWith("/new");
  const version = useResourceVersion("settings");
  const loaded = useRef(false), requestId = useRef(0);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [hasPremium, setHasPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    const id = ++requestId.current;
    try {
      setLoading(!loaded.current);
      setError(null);

      const response = await fetch('/api/features');
      if (!response.ok) {
        throw new Error('Failed to fetch features');
      }

      const data = await response.json();
      if (id !== requestId.current) return;
      loaded.current = true; setAccountId(data.accountId);
      // Ensure features is always an array, even if API returns malformed data
      setFeatures(Array.isArray(data.features) ? data.features : []);
      setHasPremium(data.hasPremium || false);
    } catch (err: any) {
      if (id !== requestId.current) return;
      console.error('Error fetching features:', err);
      setError(err.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures, version]);

  const isFeatureEnabled = useCallback((featureName: FeatureName): boolean => {
    const feature = features.find(f => f.key === featureName);
    return feature?.enabled || false;
  }, [features]);

  const toggleFeature = useCallback(async (featureName: FeatureName, enabled: boolean, originalRevision?: string | null) => {
    try {
      const response = await fetch('/api/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featureName, enabled, ...(modern ? {expectedRevision:originalRevision !== undefined ? originalRevision : features.find(f => f.key === featureName)?.revision ?? null,expectedBudgetId:accountId} : {}) }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 409) await fetchFeatures();
        throw new Error(errorData.message || errorData.error || 'Failed to toggle feature');
      }

      const data = await response.json();
      requestId.current++;

      // Update local state inline instead of refetching all features
      setFeatures(prevFeatures =>
        prevFeatures.map(feature =>
          feature.key === featureName
            ? {
                ...feature,
                revision: data.feature.revision,
                enabled: data.feature.enabled,
                enabledAt: data.feature.enabledAt,
                disabledAt: data.feature.disabledAt
              }
            : feature
        )
      );
    } catch (err: any) {
      console.error('Error toggling feature:', err);
      throw err;
    }
  }, [modern, features, accountId, fetchFeatures]);

  const value: FeatureContextType = {
    features,
    loading,
    error,
    hasPremium,
    isFeatureEnabled,
    toggleFeature,
    refreshFeatures: fetchFeatures,
  };

  return (
    <FeatureContext.Provider value={value}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatures(): FeatureContextType {
  const context = useContext(FeatureContext);
  if (context === undefined) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
}

export function useFeature(featureName: FeatureName): boolean {
  const { isFeatureEnabled } = useFeatures();
  return isFeatureEnabled(featureName);
}


