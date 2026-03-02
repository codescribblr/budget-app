'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Loan, NonCashAsset } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { parseLocalDate } from '@/lib/date-utils';

interface LoanDialogProps {
  isOpen: boolean;
  onClose: () => void;
  loan?: Loan | null;
  onSuccess: () => void;
}

export default function LoanDialog({ isOpen, onClose, loan, onSuccess }: LoanDialogProps) {
  const [loanName, setLoanName] = useState('');
  const [balance, setBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [openDate, setOpenDate] = useState<Date | undefined>(undefined);
  const [maturityDate, setMaturityDate] = useState<Date | undefined>(undefined);
  const [startingBalance, setStartingBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [includeInNetWorth, setIncludeInNetWorth] = useState(true);
  const [linkedNonCashAssetId, setLinkedNonCashAssetId] = useState<number | null>(null);
  const [assets, setAssets] = useState<NonCashAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (loan) {
        // Edit mode
        setLoanName(loan.name);
        setBalance(loan.balance.toString());
        setInterestRate(loan.interest_rate?.toString() || '');
        setMinimumPayment(loan.minimum_payment?.toString() || '');
        setPaymentDueDate(loan.payment_due_date?.toString() || '');
        setOpenDate(parseLocalDate(loan.open_date));
        setMaturityDate(parseLocalDate(loan.maturity_date));
        setStartingBalance(loan.starting_balance?.toString() || '');
        setInstitution(loan.institution || '');
        setIncludeInNetWorth(loan.include_in_net_worth);
        setLinkedNonCashAssetId(loan.linked_non_cash_asset_id ?? null);
      } else {
        // Add mode
        setLoanName('');
        setBalance('0');
        setInterestRate('');
        setMinimumPayment('');
        setPaymentDueDate('');
        setOpenDate(undefined);
        setMaturityDate(undefined);
        setStartingBalance('');
        setInstitution('');
        setIncludeInNetWorth(true);
        setLinkedNonCashAssetId(null);
      }
    }
  }, [isOpen, loan]);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/non-cash-assets')
        .then((res) => (res.ok ? res.json() : []))
        .then((data: NonCashAsset[]) => setAssets(Array.isArray(data) ? data : []))
        .catch(() => setAssets([]));
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!loanName.trim()) {
      toast.error('Please enter a loan name');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: loanName.trim(),
        balance: parseFloat(balance) || 0,
        interest_rate: interestRate ? parseFloat(interestRate) : null,
        minimum_payment: minimumPayment ? parseFloat(minimumPayment) : null,
        payment_due_date: paymentDueDate ? parseInt(paymentDueDate) : null,
        open_date: openDate ? openDate.toISOString().split('T')[0] : null,
        maturity_date: maturityDate ? maturityDate.toISOString().split('T')[0] : null,
        starting_balance: startingBalance ? parseFloat(startingBalance) : null,
        institution: institution.trim() || null,
        include_in_net_worth: includeInNetWorth,
        linked_non_cash_asset_id: linkedNonCashAssetId ?? null,
      };

      if (loan) {
        // Update existing loan
        const response = await fetch(`/api/loans/${loan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const msg = await handleApiError(response, 'Failed to update loan');
          throw new Error(msg || 'Failed to update loan');
        }

        toast.success('Loan updated');
      } else {
        // Create new loan
        const response = await fetch('/api/loans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const msg = await handleApiError(response, 'Failed to add loan');
          throw new Error(msg || 'Failed to add loan');
        }

        toast.success('Loan added');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving loan:', error);
      toast.error(error.message || 'Failed to save loan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{loan ? `Edit ${loan.name}` : 'Add Loan'}</DialogTitle>
          <DialogDescription>
            {loan ? 'Update the loan details and balance.' : 'Add a new loan to track your debt.'}
          </DialogDescription>
        </DialogHeader>
        <div
          className="space-y-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (loanName.trim()) {
                handleSave();
              }
            }
          }}
        >
          <div>
            <Label htmlFor="loan-name">Name *</Label>
            <Input
              id="loan-name"
              value={loanName}
              onChange={(e) => setLoanName(e.target.value)}
              placeholder="e.g., Student Loan"
            />
          </div>
          <div>
            <Label htmlFor="balance">Balance *</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="interest-rate">Interest Rate (%)</Label>
            <Input
              id="interest-rate"
              type="number"
              step="0.01"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="e.g., 5.5"
            />
          </div>
          <div>
            <Label htmlFor="minimum-payment">Minimum Payment ($)</Label>
            <Input
              id="minimum-payment"
              type="number"
              step="0.01"
              value={minimumPayment}
              onChange={(e) => setMinimumPayment(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="payment-due-date">Payment Due Date (day of month)</Label>
            <Input
              id="payment-due-date"
              type="number"
              min="1"
              max="31"
              value={paymentDueDate}
              onChange={(e) => setPaymentDueDate(e.target.value)}
              placeholder="e.g., 15"
            />
          </div>
          <div>
            <Label htmlFor="open-date">Open Date</Label>
            <DatePicker
              id="open-date"
              date={openDate}
              onDateChange={setOpenDate}
              placeholder="Select open date"
            />
          </div>
          <div>
            <Label htmlFor="maturity-date">Maturity Date (Payoff Date)</Label>
            <DatePicker
              id="maturity-date"
              date={maturityDate}
              onDateChange={setMaturityDate}
              placeholder="Select maturity/payoff date"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The date when this loan will be fully paid off. Used in forecast calculations to remove loan payments from expenses after this date.
            </p>
          </div>
          <div>
            <Label htmlFor="linked-asset">Linked asset (retirement forecast)</Label>
            <Select
              value={linkedNonCashAssetId?.toString() ?? 'none'}
              onValueChange={(v) => setLinkedNonCashAssetId(v === 'none' ? null : parseInt(v, 10))}
            >
              <SelectTrigger id="linked-asset">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              If this loan is secured by an asset (e.g. mortgage on home), link it. When that asset is liquidated in the retirement forecast, the loan is paid off from the proceeds and the payment is removed from expenses.
            </p>
          </div>
          <div>
            <Label htmlFor="starting-balance">Starting Balance ($)</Label>
            <Input
              id="starting-balance"
              type="number"
              step="0.01"
              value={startingBalance}
              onChange={(e) => setStartingBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="institution">Institution</Label>
            <Input
              id="institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g., Bank of America"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-in-net-worth"
              checked={includeInNetWorth}
              onCheckedChange={(checked) => setIncludeInNetWorth(checked as boolean)}
            />
            <Label htmlFor="include-in-net-worth" className="text-sm font-normal cursor-pointer">
              Include in net worth calculations
            </Label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !loanName.trim()}>
              {loading ? 'Saving...' : loan ? 'Save Changes' : 'Add Loan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
