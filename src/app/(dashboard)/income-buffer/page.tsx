'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useFeature } from '@/contexts/FeatureContext';
import { AddToBufferDialog } from '@/components/money-movement/AddToBufferDialog';

interface BufferStatus {
  enabled: boolean;
  balance: number;
  monthsOfRunway: number;
  monthlyBudget: number;
  hasBeenFundedThisMonth: boolean;
  totalFundedThisMonth: number;
}

export default function IncomeBufferPage() {
  const [status, setStatus] = useState<BufferStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [currentSavings, setCurrentSavings] = useState<number>(0);
  const [isAddToBufferOpen, setIsAddToBufferOpen] = useState(false);
  const router = useRouter();
  const incomeBufferEnabled = useFeature('income_buffer');

  useEffect(() => {
    if (!incomeBufferEnabled) {
      router.push('/dashboard');
      return;
    }
    fetchStatus();
    fetchCurrentSavings();
  }, [incomeBufferEnabled, router]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/income-buffer/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching buffer status:', error);
      toast.error('Failed to load buffer status');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSavings = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setCurrentSavings(data.current_savings || 0);
      }
    } catch (error) {
      console.error('Error fetching current savings:', error);
    }
  };

  const handleAddToBufferSuccess = () => {
    fetchStatus();
    fetchCurrentSavings();
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount > (status?.balance || 0)) {
      toast.error('Amount exceeds buffer balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      const response = await fetch('/api/income-buffer/fund-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to withdraw from buffer');
      }

      toast.success(`Withdrew ${formatCurrency(amount)} from buffer. Now allocate to your categories.`);
      setWithdrawAmount('');
      fetchStatus();
      
      // Redirect to Money Movement page after 1 second
      setTimeout(() => {
        router.push('/money-movement?tab=allocate');
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to withdraw from buffer');
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!status || !status.enabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Income Buffer</h1>
          <p className="text-muted-foreground mt-1">Feature not enabled</p>
        </div>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The Income Buffer feature is not enabled. Please enable it in Settings → Features.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const getRunwayColor = (months: number) => {
    if (months >= 3) return 'text-green-600 dark:text-green-400';
    if (months >= 1) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Income Buffer</h1>
        <p className="text-muted-foreground mt-1">Smooth irregular income into regular monthly funding</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Buffer Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(status.balance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Months of Runway
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getRunwayColor(status.monthsOfRunway)}`}>
              {status.monthsOfRunway.toFixed(1)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(status.monthlyBudget)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Withdraw from Buffer
            </CardTitle>
            <CardDescription>
              Transfer funds from your buffer to allocate to categories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Withdrawing from the buffer makes funds available for allocation.
                You'll be redirected to the Money Movement page to allocate to your categories.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount to Withdraw</Label>
              <div className="flex gap-2">
                <Input
                  id="withdraw-amount"
                  type="number"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1"
                  disabled={status.balance <= 0}
                />
                <Button
                  variant="outline"
                  onClick={() => setWithdrawAmount(status.monthlyBudget.toFixed(2))}
                  disabled={status.balance <= 0}
                >
                  Monthly Budget
                </Button>
              </div>
            </div>

            {withdrawAmount && parseFloat(withdrawAmount) > 0 && (
              <div className="p-3 bg-muted rounded-md">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Withdrawing:</span>
                    <span className="font-semibold">{formatCurrency(parseFloat(withdrawAmount))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Remaining in buffer:</span>
                    <span className="font-semibold">
                      {formatCurrency(status.balance - parseFloat(withdrawAmount))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New runway:</span>
                    <span className={`font-semibold ${getRunwayColor(
                      status.monthlyBudget > 0
                        ? (status.balance - parseFloat(withdrawAmount)) / status.monthlyBudget
                        : 0
                    )}`}>
                      {status.monthlyBudget > 0
                        ? ((status.balance - parseFloat(withdrawAmount)) / status.monthlyBudget).toFixed(1)
                        : '0.0'
                      } months
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={handleWithdraw}
              disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || status.balance <= 0}
              className="w-full"
            >
              {isWithdrawing ? 'Withdrawing...' : 'Withdraw & Allocate'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Add to Buffer
            </CardTitle>
            <CardDescription>
              Store excess income for future months
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-md">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available to Allocate:</span>
                  <span className="font-semibold">{formatCurrency(currentSavings)}</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => setIsAddToBufferOpen(true)}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              Add to Income Buffer
            </Button>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Transfer funds from your available savings to your Income Buffer. 
                You can withdraw these funds later to allocate to your categories.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How Income Buffer Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">What is the Income Buffer?</h3>
            <p className="text-sm text-muted-foreground">
              The Income Buffer helps you create a regular monthly rhythm even with irregular income.
              When you receive large payments, store the excess in the buffer. During slower months,
              withdraw from the buffer to maintain consistent funding.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Months of Runway</h3>
            <p className="text-sm text-muted-foreground">
              This shows how many months you can fund your budget using only the buffer.
              It's calculated as: Buffer Balance ÷ Monthly Budget. Aim for 3+ months for financial security.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Typical Workflow</h3>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
              <li>Receive income and update your account balance</li>
              <li>If you have excess funds, click "Add to Income Buffer" on this page</li>
              <li>On the 1st of each month, withdraw your monthly budget from the buffer</li>
              <li>Go to Money Movement → Allocate to Envelopes to distribute the funds</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Add to Income Buffer Dialog */}
      <AddToBufferDialog
        open={isAddToBufferOpen}
        onOpenChange={setIsAddToBufferOpen}
        availableToSave={currentSavings}
        onSuccess={handleAddToBufferSuccess}
      />
    </div>
  );
}



