'use client';

import { useState, useEffect } from 'react';
import type { UsageStats } from '@/lib/ai/types';

export function useAIUsage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/ai/usage');
      if (!response.ok) {
        throw new Error('Failed to fetch usage statistics');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      // Set default stats on error
      setStats({
        chat: { used: 0, limit: 15 },
        categorization: { used: 0, limit: 5 },
        insights: { used: 0, limit: 15 },
        dashboard_insights: { used: 0, limit: 1 },
        reports: { used: 0, limit: 3 },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refreshStats: fetchUsageStats,
  };
}

