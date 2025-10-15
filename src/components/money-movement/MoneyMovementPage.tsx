'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { Category } from '@/lib/types';
import TransferBetweenEnvelopes from './TransferBetweenEnvelopes';
import AllocateIncome from './AllocateIncome';

export default function MoneyMovementPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentSavings, setCurrentSavings] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, dashboardRes] = await Promise.all([
        fetch('/api/categories'),
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
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Money Movement</h1>
          <p className="text-muted-foreground mt-1">
            Transfer funds between envelopes or allocate income
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>
          Back to Dashboard
        </Button>
      </div>

      <Separator />

      <Tabs defaultValue="transfer" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transfer">Transfer Between Envelopes</TabsTrigger>
          <TabsTrigger value="allocate">Allocate to Envelopes</TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
}

