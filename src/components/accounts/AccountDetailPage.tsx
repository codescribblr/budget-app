'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import type { Account } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { ArrowLeft, Wallet, PiggyBank, Banknote, Edit } from 'lucide-react';
import AccountBalanceChart from './AccountBalanceChart';
import AccountBalanceAudit from './AccountBalanceAudit';
import AccountDialog from './AccountDialog';

export default function AccountDetailPage({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounts/${accountId}`);
      if (!response.ok) {
        const msg = await handleApiError(response, 'Failed to load account');
        throw new Error(msg || 'Failed to load account');
      }
      const data = await response.json();
      setAccount(data);
    } catch (error: any) {
      console.error('Error fetching account:', error);
      toast.error(error.message || 'Failed to load account');
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) {
      fetchAccount();
    }
  }, [accountId]);

  const getAccountIcon = (accountType: Account['account_type']) => {
    switch (accountType) {
      case 'checking':
        return <Wallet className="h-5 w-5" />;
      case 'savings':
        return <PiggyBank className="h-5 w-5" />;
      case 'cash':
        return <Banknote className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const getAccountTypeLabel = (accountType: Account['account_type']) => {
    switch (accountType) {
      case 'checking':
        return 'Checking';
      case 'savings':
        return 'Savings';
      case 'cash':
        return 'Cash';
      default:
        return accountType;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/accounts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </Link>
          </Button>
        </div>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Account not found.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href="/accounts">
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
          {getAccountIcon(account.account_type)}
          <h1 className="text-2xl md:text-3xl font-bold">{account.name}</h1>
          {!account.include_in_totals && (
            <Badge variant="outline">Excluded from Totals</Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Type: <span className="font-medium">{getAccountTypeLabel(account.account_type)}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Current Balance</div>
          <div className="text-lg font-semibold">{formatCurrency(account.balance)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Account Type</div>
          <div className="text-lg font-semibold">{getAccountTypeLabel(account.account_type)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="text-lg font-semibold">
            {account.include_in_totals ? 'Included in Totals' : 'Excluded from Totals'}
          </div>
        </Card>
      </div>

      {account.id && (
        <>
          <AccountBalanceChart accountId={account.id} />
          <AccountBalanceAudit accountId={account.id} />
        </>
      )}

      <AccountDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        account={account}
        onSuccess={() => {
          fetchAccount();
          setIsEditDialogOpen(false);
        }}
      />
    </div>
  );
}
