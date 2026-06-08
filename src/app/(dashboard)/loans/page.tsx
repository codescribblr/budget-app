'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import type { Loan } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Landmark, Plus, Edit, Grid3X3, List } from 'lucide-react';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';
import LoanDialog from '@/components/loans/LoanDialog';
import { useLocalStorage } from '@/hooks/use-local-storage';

type ViewMode = 'cards' | 'list';

export default function LoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('loans-view', 'cards');

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/loans');
      if (response.status === 403) {
        // Premium required
        setLoans([]);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch loans');
      const data = await response.json();
      setLoans(data);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <PremiumFeatureGate
      featureName="Loans & Debt Tracking"
      featureDescription="Track your loans and debt balances"
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Loans</h1>
            <p className="text-muted-foreground mt-1">Manage your loan accounts</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center border rounded-md p-0.5">
              <Button
                variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode('cards')}
                aria-label="Card view"
              >
                <Grid3X3 className="h-4 w-4 mr-1.5" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="h-4 w-4 mr-1.5" />
                List
              </Button>
            </div>
            <Button
              onClick={() => {
                setEditingLoan(null);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Loan
            </Button>
          </div>
        </div>

        {loans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Landmark className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No loans yet</h3>
              <p className="text-muted-foreground">
                Loans will appear here once you add them from the dashboard
              </p>
            </CardContent>
          </Card>
        ) : viewMode === 'list' ? (
          <Card>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Min Payment</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow
                    key={loan.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/loans/${loan.id}`)}
                  >
                    <TableCell className="font-medium">{loan.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {loan.institution || '-'}
                    </TableCell>
                    <TableCell>
                      {!loan.include_in_net_worth && (
                        <Badge variant="outline" className="text-xs">Excluded</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(loan.balance)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {loan.minimum_payment ? formatCurrency(loan.minimum_payment) : '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {loan.interest_rate !== null ? `${loan.interest_rate}%` : '-'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLoan(loan);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loans.map((loan) => (
              <Card
                key={loan.id}
                className="cursor-pointer hover:shadow-md transition-shadow h-full"
                onClick={() => router.push(`/loans/${loan.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Landmark className="h-5 w-5" />
                      <CardTitle className="text-lg">{loan.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {!loan.include_in_net_worth && (
                        <Badge variant="outline" className="text-xs">Excluded</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLoan(loan);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {loan.institution && (
                    <CardDescription>{loan.institution}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Current Balance</div>
                      <div className="text-2xl font-bold">{formatCurrency(loan.balance)}</div>
                    </div>
                    {loan.minimum_payment && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Minimum Payment</span>
                        <span className="font-medium">{formatCurrency(loan.minimum_payment)}</span>
                      </div>
                    )}
                    {loan.interest_rate !== null && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Interest Rate</span>
                        <span className="font-medium">{loan.interest_rate}%</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <LoanDialog
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false);
            setEditingLoan(null);
          }}
          loan={editingLoan}
          onSuccess={() => {
            fetchLoans();
            setIsDialogOpen(false);
            setEditingLoan(null);
          }}
        />
      </div>
    </PremiumFeatureGate>
  );
}
