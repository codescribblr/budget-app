'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { PendingCheck } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { ArrowLeft, FileText, Edit } from 'lucide-react';
import { format } from 'date-fns';
import PendingCheckDialog from './PendingCheckDialog';

export default function PendingCheckDetailPage({ pendingCheckId }: { pendingCheckId: string }) {
  const [loading, setLoading] = useState(true);
  const [pendingCheck, setPendingCheck] = useState<PendingCheck | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchPendingCheck = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pending-checks/${pendingCheckId}`);
      if (!response.ok) {
        const msg = await handleApiError(response, 'Failed to load pending check');
        throw new Error(msg || 'Failed to load pending check');
      }
      const data = await response.json();
      setPendingCheck(data);
    } catch (error: any) {
      console.error('Error fetching pending check:', error);
      toast.error(error.message || 'Failed to load pending check');
      setPendingCheck(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pendingCheckId) {
      fetchPendingCheck();
    }
  }, [pendingCheckId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!pendingCheck) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/pending-checks">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pending Checks
            </Link>
          </Button>
        </div>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Pending check not found.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href="/pending-checks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <Button onClick={() => setIsEditDialogOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h1 className="text-2xl md:text-3xl font-bold">{pendingCheck.description}</h1>
          <Badge variant={pendingCheck.type === 'income' ? 'default' : 'destructive'}>
            {pendingCheck.type === 'income' ? 'Income' : 'Expense'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Amount</div>
          <div className="text-lg font-semibold">{formatCurrency(pendingCheck.amount)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Type</div>
          <div className="text-lg font-semibold">
            {pendingCheck.type === 'income' ? 'Income' : 'Expense'}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Created</div>
          <div className="text-sm font-semibold">
            {format(new Date(pendingCheck.created_at), 'MMM d, yyyy')}
          </div>
        </Card>
      </div>

      <PendingCheckDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        pendingCheck={pendingCheck}
        onSuccess={() => {
          fetchPendingCheck();
          setIsEditDialogOpen(false);
        }}
      />
    </div>
  );
}
