'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import type { CreditCard } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { CreditCard as CreditCardIcon, Plus } from 'lucide-react';
import Link from 'next/link';
import CreditCardDialog from '@/components/credit-cards/CreditCardDialog';

export default function CreditCardsPage() {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchCreditCards = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/credit-cards');
      if (!response.ok) throw new Error('Failed to fetch credit cards');
      const data = await response.json();
      setCreditCards(data);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
      toast.error('Failed to load credit cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditCards();
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
          <h1 className="text-2xl md:text-3xl font-bold">Credit Cards</h1>
          <p className="text-muted-foreground mt-1">Manage your credit card accounts</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Credit Card
        </Button>
      </div>

      {creditCards.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCardIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No credit cards yet</h3>
            <p className="text-muted-foreground">
              Credit cards will appear here once you add them from the dashboard
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creditCards.map((creditCard) => (
            <Link key={creditCard.id} href={`/credit-cards/${creditCard.id}`}>
              <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCardIcon className="h-5 w-5" />
                      <CardTitle className="text-lg">{creditCard.name}</CardTitle>
                    </div>
                    {!creditCard.include_in_totals && (
                      <Badge variant="outline" className="text-xs">Excluded</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Current Balance</div>
                      <div className="text-2xl font-bold">{formatCurrency(creditCard.current_balance)}</div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available Credit</span>
                      <span className="font-medium">{formatCurrency(creditCard.available_credit)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Credit Limit</span>
                      <span className="font-medium">{formatCurrency(creditCard.credit_limit)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreditCardDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        creditCard={null}
        onSuccess={fetchCreditCards}
      />
    </div>
  );
}
