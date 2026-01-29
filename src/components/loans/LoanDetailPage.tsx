'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { Loan } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { ArrowLeft, Landmark, Edit } from 'lucide-react';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';
import LoanBalanceChart from './LoanBalanceChart';
import LoanBalanceAudit from './LoanBalanceAudit';
import LoanDialog from './LoanDialog';

export default function LoanDetailPage({ loanId }: { loanId: string }) {
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchLoan = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/loans/${loanId}`);
      if (!response.ok) {
        if (response.status === 403) {
          // Premium required - handled by PremiumFeatureGate
          return;
        }
        const msg = await handleApiError(response, 'Failed to load loan');
        throw new Error(msg || 'Failed to load loan');
      }
      const data = await response.json();
      setLoan(data);
    } catch (error: any) {
      console.error('Error fetching loan:', error);
      toast.error(error.message || 'Failed to load loan');
      setLoan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loanId) {
      fetchLoan();
    }
  }, [loanId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!loan) {
    return (
      <PremiumFeatureGate
        featureName="Loans & Debt Tracking"
        featureDescription="View loan details and balance history"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/loans">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Loans
              </Link>
            </Button>
          </div>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Loan not found.</div>
          </Card>
        </div>
      </PremiumFeatureGate>
    );
  }

  return (
    <PremiumFeatureGate
      featureName="Loans & Debt Tracking"
      featureDescription="View loan details and balance history"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" asChild>
            <Link href="/loans">
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
            <Landmark className="h-5 w-5" />
            <h1 className="text-2xl md:text-3xl font-bold">{loan.name}</h1>
            {!loan.include_in_net_worth && (
              <Badge variant="outline">Excluded from Net Worth</Badge>
            )}
          </div>
          {loan.institution && (
            <p className="text-muted-foreground">
              Institution: <span className="font-medium">{loan.institution}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Current Balance</div>
            <div className="text-lg font-semibold">{formatCurrency(loan.balance)}</div>
            {loan.starting_balance && (
              <div className="text-xs text-muted-foreground mt-1">
                Started at {formatCurrency(loan.starting_balance)}
              </div>
            )}
          </Card>
          {loan.minimum_payment && (
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Minimum Payment</div>
              <div className="text-lg font-semibold">{formatCurrency(loan.minimum_payment)}</div>
              {loan.payment_due_date && (
                <div className="text-xs text-muted-foreground mt-1">
                  Due on day {loan.payment_due_date} of month
                </div>
              )}
            </Card>
          )}
          {loan.interest_rate !== null && (
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Interest Rate</div>
              <div className="text-lg font-semibold">{loan.interest_rate}%</div>
            </Card>
          )}
        </div>

        {loan.id && (
          <>
            <LoanBalanceChart loanId={loan.id} />
            <LoanBalanceAudit loanId={loan.id} />
          </>
        )}

        <LoanDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          loan={loan}
          onSuccess={() => {
            fetchLoan();
            setIsEditDialogOpen(false);
          }}
        />
      </div>
    </PremiumFeatureGate>
  );
}
