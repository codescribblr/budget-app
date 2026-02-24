'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { Category } from '@/lib/types';
import TransferBetweenEnvelopes from './TransferBetweenEnvelopes';
import AllocateIncome from './AllocateIncome';
import { FeatureTeaser } from '@/components/FeatureTeaser';

const VALID_TABS = ['allocate', 'transfer'] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function MoneyMovementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentSavings, setCurrentSavings] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const tabParam = searchParams.get('tab');
  const activeTab: TabValue = tabParam === 'transfer' ? 'transfer' : 'allocate';

  const setActiveTab = useCallback(
    (tab: TabValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'allocate') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const qs = params.toString();
      router.replace(qs ? `/money-movement?${qs}` : '/money-movement', { scroll: false });
    },
    [router, searchParams]
  );

  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const [categoriesRes, dashboardRes] = await Promise.all([
        fetch('/api/categories?excludeGoals=false'), // Include goal categories for allocation
        fetch('/api/dashboard'),
      ]);

      const [categoriesData, dashboardData] = await Promise.all([
        categoriesRes.json(),
        dashboardRes.json(),
      ]);

      setCategories(categoriesData);
      setCurrentSavings(dashboardData.current_savings);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Only fetch once on mount
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchData();
    }
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <FeatureTeaser
        storageKey="income-buffer"
        featureKey="income_buffer"
        message="Tip: Income Buffer helps smooth irregular paychecks. Explore in Settings → Features."
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="allocate">Allocate to Envelopes</TabsTrigger>
          <TabsTrigger value="transfer">Transfer Between Envelopes</TabsTrigger>
        </TabsList>

        <TabsContent value="allocate" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Allocate to Envelopes</CardTitle>
              <CardDescription>
                Distribute your current savings across budget categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AllocateIncome
                categories={categories}
                currentSavings={currentSavings}
                onSuccess={fetchData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfer" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Between Envelopes</CardTitle>
              <CardDescription>
                Move money from one budget category to another
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransferBetweenEnvelopes categories={categories} onSuccess={fetchData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


