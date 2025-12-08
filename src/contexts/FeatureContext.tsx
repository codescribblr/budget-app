'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type FeatureName =
  | 'monthly_funding_tracking'
  | 'category_types'
  | 'priority_system'
  | 'smart_allocation'
  | 'income_buffer'
  | 'goals'
  | 'loans'
  | 'advanced_reporting'
  | 'ai_chat'
  | 'automatic_imports';

export interface Feature {
  key: FeatureName;
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
  toggleFeature: (featureName: FeatureName, enabled: boolean) => Promise<void>;
  refreshFeatures: () => Promise<void>;
}

const FeatureContext = createContext<FeatureContextType | undefined>(undefined);

export function FeatureProvider({ children }: { children: React.ReactNode }) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [hasPremium, setHasPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/features');
      if (!response.ok) {
        throw new Error('Failed to fetch features');
      }

      const data = await response.json();
      // Ensure features is always an array, even if API returns malformed data
      setFeatures(Array.isArray(data.features) ? data.features : []);
      setHasPremium(data.hasPremium || false);
    } catch (err: any) {
      console.error('Error fetching features:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const isFeatureEnabled = useCallback((featureName: FeatureName): boolean => {
    const feature = features.find(f => f.key === featureName);
    return feature?.enabled || false;
  }, [features]);

  const toggleFeature = useCallback(async (featureName: FeatureName, enabled: boolean) => {
    try {
      const response = await fetch('/api/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featureName, enabled }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to toggle feature');
      }

      const data = await response.json();

      // Update local state inline instead of refetching all features
      setFeatures(prevFeatures =>
        prevFeatures.map(feature =>
          feature.key === featureName
            ? {
                ...feature,
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
  }, []);

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

