'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import type { PendingCheck } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import PendingCheckDialog from '@/components/pending-checks/PendingCheckDialog';

export default function PendingChecksPage() {
  const [pendingChecks, setPendingChecks] = useState<PendingCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchPendingChecks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pending-checks');
      if (!response.ok) throw new Error('Failed to fetch pending checks');
      const data = await response.json();
      setPendingChecks(data);
    } catch (error) {
      console.error('Error fetching pending checks:', error);
      toast.error('Failed to load pending checks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingChecks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pending Checks</h1>
          <p className="text-muted-foreground mt-1">Manage your pending checks</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Pending Check
        </Button>
      </div>

      {pendingChecks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pending checks</h3>
            <p className="text-muted-foreground">
              Pending checks will appear here once you add them from the dashboard
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingChecks.map((check) => (
            <Link key={check.id} href={`/pending-checks/${check.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      <CardTitle className="text-lg">{check.description}</CardTitle>
                    </div>
                    <Badge variant={check.type === 'income' ? 'default' : 'destructive'}>
                      {check.type === 'income' ? 'Income' : 'Expense'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(check.amount)}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <PendingCheckDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        pendingCheck={null}
        onSuccess={fetchPendingChecks}
      />
    </div>
  );
}
