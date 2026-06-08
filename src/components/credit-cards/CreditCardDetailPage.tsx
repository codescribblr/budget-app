'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { CreditCard } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { ArrowLeft, CreditCard as CreditCardIcon, Edit } from 'lucide-react';
import CreditCardBalanceChart from './CreditCardBalanceChart';
import CreditCardBalanceAudit from './CreditCardBalanceAudit';
import CreditCardDialog from './CreditCardDialog';

export default function CreditCardDetailPage({ creditCardId }: { creditCardId: string }) {
  const [loading, setLoading] = useState(true);
  const [creditCard, setCreditCard] = useState<CreditCard | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchCreditCard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/credit-cards/${creditCardId}`);
      if (!response.ok) {
        const msg = await handleApiError(response, 'Failed to load credit card');
        throw new Error(msg || 'Failed to load credit card');
      }
      const data = await response.json();
      setCreditCard(data);
    } catch (error: any) {
      console.error('Error fetching credit card:', error);
      toast.error(error.message || 'Failed to load credit card');
      setCreditCard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (creditCardId) {
      fetchCreditCard();
    }
  }, [creditCardId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!creditCard) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/credit-cards">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Credit Cards
            </Link>
          </Button>
        </div>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Credit card not found.</div>
        </Card>
      </div>
    );
  }

  const utilizationPercentage = creditCard.credit_limit > 0
    ? ((creditCard.current_balance / creditCard.credit_limit) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href="/credit-cards">
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
          <CreditCardIcon className="h-5 w-5" />
          <h1 className="text-2xl md:text-3xl font-bold">{creditCard.name}</h1>
          {!creditCard.include_in_totals && (
            <Badge variant="outline">Excluded from Totals</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Current Balance</div>
          <div className="text-lg font-semibold">{formatCurrency(creditCard.current_balance)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Available Credit</div>
          <div className="text-lg font-semibold">{formatCurrency(creditCard.available_credit)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Credit Limit</div>
          <div className="text-lg font-semibold">{formatCurrency(creditCard.credit_limit)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {utilizationPercentage}% utilized
          </div>
        </Card>
      </div>

      {creditCard.id && (
        <>
          <CreditCardBalanceChart creditCardId={creditCard.id} />
          <CreditCardBalanceAudit creditCardId={creditCard.id} />
        </>
      )}

      <CreditCardDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        creditCard={creditCard}
        onSuccess={() => {
          fetchCreditCard();
          setIsEditDialogOpen(false);
        }}
      />
    </div>
  );
}
