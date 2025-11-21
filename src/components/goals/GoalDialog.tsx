'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { GoalWithDetails, CreateGoalRequest, Account, CreditCard, Loan } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { AlertCircle, Info } from 'lucide-react';
import { parseLocalDate, formatLocalDate, getTodayLocal } from '@/lib/date-utils';

interface GoalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  goal?: GoalWithDetails | null;
  onSuccess: () => void;
}

export default function GoalDialog({ isOpen, onClose, goal, onSuccess }: GoalDialogProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState<Date | undefined>(undefined);
  const [goalType, setGoalType] = useState<'envelope' | 'account-linked' | 'debt-paydown'>('envelope');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState<string>('');
  const [linkedCreditCardId, setLinkedCreditCardId] = useState<string>('');
  const [linkedLoanId, setLinkedLoanId] = useState<string>('');
  const [startingBalance, setStartingBalance] = useState('');
  const [notes, setNotes] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAccountWarning, setShowAccountWarning] = useState(false);
  const [accountOption, setAccountOption] = useState<'existing' | 'new'>('existing');
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<'checking' | 'savings' | 'cash'>('savings');
  const [newAccountBalance, setNewAccountBalance] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (goal) {
        // Edit mode
        setName(goal.name);
        setTargetAmount(goal.target_amount.toString());
        setTargetDate(parseLocalDate(goal.target_date));
        setGoalType(goal.goal_type);
        setMonthlyContribution(goal.monthly_contribution.toString());
        setLinkedAccountId(goal.linked_account_id?.toString() || '');
        setLinkedCreditCardId(goal.linked_credit_card_id?.toString() || '');
        setLinkedLoanId(goal.linked_loan_id?.toString() || '');
        setStartingBalance(goal.current_balance?.toString() || '');
        setNotes(goal.notes || '');
        // For account-linked goals, always use existing account option in edit mode
        if (goal.goal_type === 'account-linked') {
          setAccountOption('existing');
        }
      } else {
        // Create mode
        setName('');
        setTargetAmount('');
        setTargetDate(undefined);
        setGoalType('envelope');
        setMonthlyContribution('');
        setLinkedAccountId('');
        setLinkedCreditCardId('');
        setLinkedLoanId('');
        setStartingBalance('');
        setNotes('');
        setAccountOption('existing');
        setNewAccountName('');
        setNewAccountType('savings');
        setNewAccountBalance('');
      }
      fetchAccounts();
      fetchCreditCards();
      fetchLoans();
    }
  }, [isOpen, goal]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchCreditCards = async () => {
    try {
      const response = await fetch('/api/credit-cards');
      if (!response.ok) throw new Error('Failed to fetch credit cards');
      const data = await response.json();
      setCreditCards(data);
    } catch (error) {
      console.error('Error fetching credit cards:', error);
    }
  };

  const fetchLoans = async () => {
    try {
      const response = await fetch('/api/loans');
      if (!response.ok) throw new Error('Failed to fetch loans');
      const data = await response.json();
      setLoans(data);
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Please enter a goal name');
      return;
    }

    // Target amount validation (not required for debt-paydown)
    if (goalType !== 'debt-paydown') {
      if (!targetAmount || parseFloat(targetAmount) <= 0) {
        toast.error('Please enter a valid target amount');
        return;
      }
    }

    if (targetDate) {
      const today = getTodayLocal();
      if (targetDate < today) {
        toast.error('Target date must be in the future');
        return;
      }
    }

    if (goalType === 'envelope') {
      if (!monthlyContribution || parseFloat(monthlyContribution) <= 0) {
        toast.error('Please enter a valid monthly contribution');
        return;
      }
    }

    if (goalType === 'account-linked') {
      if (accountOption === 'existing' && !linkedAccountId) {
        toast.error('Please select an account');
        return;
      }
      if (accountOption === 'new') {
        if (!newAccountName.trim()) {
          toast.error('Please enter an account name');
          return;
        }
      }
    }

    if (goalType === 'debt-paydown') {
      if (!linkedCreditCardId && !linkedLoanId) {
        toast.error('Please select a credit card or loan');
        return;
      }
      if (linkedCreditCardId && linkedLoanId) {
        toast.error('Please select either a credit card or a loan, not both');
        return;
      }
      if (!monthlyContribution || parseFloat(monthlyContribution) <= 0) {
        toast.error('Please enter a valid monthly payment amount');
        return;
      }
    }

    setLoading(true);

    try {
      if (goal) {
        // Update existing goal
        const response = await fetch(`/api/goals/${goal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            target_amount: parseFloat(targetAmount),
            target_date: targetDate ? formatLocalDate(targetDate) : null,
            monthly_contribution: parseFloat(monthlyContribution),
            notes: notes || null,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update goal');
        }

        const result = await response.json();
        if (result.warning) {
          toast.warning(result.warning);
        }
        toast.success('Goal updated');
      } else {
        // Create new goal
        const requestData: CreateGoalRequest = {
          name,
          target_amount: goalType !== 'debt-paydown' ? parseFloat(targetAmount) : undefined,
          target_date: targetDate ? formatLocalDate(targetDate) : null,
          goal_type: goalType,
          monthly_contribution: parseFloat(monthlyContribution),
          starting_balance: goalType === 'envelope' && startingBalance
            ? parseFloat(startingBalance)
            : undefined,
          linked_account_id: goalType === 'account-linked' && accountOption === 'existing' && linkedAccountId
            ? parseInt(linkedAccountId)
            : null,
          linked_credit_card_id: goalType === 'debt-paydown' && linkedCreditCardId
            ? parseInt(linkedCreditCardId)
            : null,
          linked_loan_id: goalType === 'debt-paydown' && linkedLoanId
            ? parseInt(linkedLoanId)
            : null,
          new_account_name: goalType === 'account-linked' && accountOption === 'new'
            ? newAccountName.trim()
            : undefined,
          new_account_type: goalType === 'account-linked' && accountOption === 'new'
            ? newAccountType
            : undefined,
          new_account_balance: goalType === 'account-linked' && accountOption === 'new' && newAccountBalance
            ? parseFloat(newAccountBalance)
            : undefined,
          notes: notes || null,
        };

        const response = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create goal');
        }

        toast.success('Goal created');
        // Refresh accounts list if we created a new account
        if (goalType === 'account-linked' && accountOption === 'new') {
          await fetchAccounts();
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving goal:', error);
      toast.error(error.message || 'Failed to save goal');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (accountId: string) => {
    setLinkedAccountId(accountId);
    const selectedAccount = accounts.find(a => a.id.toString() === accountId);
    if (selectedAccount && selectedAccount.balance > 0) {
      setShowAccountWarning(true);
    } else {
      setShowAccountWarning(false);
    }
  };

  const availableAccounts = accounts.filter(acc => 
    !acc.linked_goal_id || acc.linked_goal_id === goal?.id
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
          <DialogDescription>
            Set up a savings goal with a target amount and optional timeline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Goal Name */}
          <div>
            <Label htmlFor="name">Goal Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Hawaii Vacation"
            />
          </div>

          {/* Goal Type */}
          {!goal && (
            <div>
              <Label>Goal Type *</Label>
              <div className="space-y-2 mt-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="envelope"
                    name="goalType"
                    value="envelope"
                    checked={goalType === 'envelope'}
                    onChange={(e) => setGoalType(e.target.value as 'envelope' | 'account-linked' | 'debt-paydown')}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="envelope" className="cursor-pointer">
                    Envelope-Based (works like a budget category)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="account-linked"
                    name="goalType"
                    value="account-linked"
                    checked={goalType === 'account-linked'}
                    onChange={(e) => setGoalType(e.target.value as 'envelope' | 'account-linked' | 'debt-paydown')}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="account-linked" className="cursor-pointer">
                    Account-Linked (tracks dedicated account balance)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="debt-paydown"
                    name="goalType"
                    value="debt-paydown"
                    checked={goalType === 'debt-paydown'}
                    onChange={(e) => setGoalType(e.target.value as 'envelope' | 'account-linked' | 'debt-paydown')}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="debt-paydown" className="cursor-pointer">
                    Debt Paydown (pay off credit card debt)
                  </Label>
                </div>
              </div>
            </div>
          )}

          {/* Target Amount */}
          {goalType !== 'debt-paydown' && (
            <div>
              <Label htmlFor="targetAmount">Target Amount *</Label>
              <Input
                id="targetAmount"
                type="number"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          {/* Target Date */}
          <div>
            <Label htmlFor="targetDate">Target Date (Optional)</Label>
            <DatePicker
              id="targetDate"
              date={targetDate}
              onDateChange={setTargetDate}
              minDate={getTodayLocal()}
              placeholder="Select target date"
            />
            <p className="text-xs text-muted-foreground mt-1">
              When you want to reach this goal
            </p>
          </div>

          {/* Monthly Contribution */}
          <div>
            <Label htmlFor="monthlyContribution">
              {goalType === 'debt-paydown' ? 'Monthly Payment' : 'Monthly Contribution'} *
              {goalType === 'account-linked' && (
                <span className="text-xs text-muted-foreground ml-2">
                  (for tracking/reminders only)
                </span>
              )}
            </Label>
            <Input
              id="monthlyContribution"
              type="number"
              step="0.01"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {goalType === 'debt-paydown' 
                ? 'How much you plan to pay toward this debt each month'
                : 'How much you plan to contribute each month'}
            </p>
          </div>

          {/* Account Selection (for account-linked goals) */}
          {goalType === 'account-linked' && (
            <div className="space-y-4">
              {!goal && (
                <div>
                  <Label>Account Option *</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="existing-account"
                        name="accountOption"
                        value="existing"
                        checked={accountOption === 'existing'}
                        onChange={(e) => setAccountOption(e.target.value as 'existing' | 'new')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="existing-account" className="cursor-pointer">
                        Select existing account
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="new-account"
                        name="accountOption"
                        value="new"
                        checked={accountOption === 'new'}
                        onChange={(e) => setAccountOption(e.target.value as 'existing' | 'new')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="new-account" className="cursor-pointer">
                        Create new account
                      </Label>
                    </div>
                  </div>
                </div>
              )}

              {accountOption === 'existing' ? (
                <div>
                  <Label htmlFor="linkedAccount">Select Account *</Label>
                  <Select value={linkedAccountId || undefined} onValueChange={handleAccountChange}>
                    <SelectTrigger id="linkedAccount">
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAccounts.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No available accounts
                        </div>
                      ) : (
                        availableAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id.toString()}>
                            {account.name} ({account.account_type})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {showAccountWarning && (
                    <Alert className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This account has an existing balance. Make sure it's dedicated solely to this goal for accurate tracking.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="newAccountName">Account Name *</Label>
                    <Input
                      id="newAccountName"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g., Hawaii Vacation Savings"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newAccountType">Account Type *</Label>
                    <Select value={newAccountType} onValueChange={(value) => setNewAccountType(value as 'checking' | 'savings' | 'cash')}>
                      <SelectTrigger id="newAccountType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="newAccountBalance">Starting Balance (Optional)</Label>
                    <Input
                      id="newAccountBalance"
                      type="number"
                      step="0.01"
                      value={newAccountBalance}
                      onChange={(e) => setNewAccountBalance(e.target.value)}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Initial balance if you've already started saving
                    </p>
                  </div>
                </div>
              )}

              <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> The account will be excluded from totals and should be used only for this goal. 
                  If you use it for other purposes, goal tracking will be inaccurate.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Credit Card/Loan Selection (for debt-paydown goals) */}
          {goalType === 'debt-paydown' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="debtSelection">Select Debt to Pay Down *</Label>
                <Select
                  value={
                    linkedCreditCardId ? `cc-${linkedCreditCardId}` :
                    linkedLoanId ? `loan-${linkedLoanId}` :
                    undefined
                  }
                  onValueChange={(value) => {
                    if (value.startsWith('cc-')) {
                      setLinkedCreditCardId(value.replace('cc-', ''));
                      setLinkedLoanId('');
                    } else if (value.startsWith('loan-')) {
                      setLinkedLoanId(value.replace('loan-', ''));
                      setLinkedCreditCardId('');
                    }
                  }}
                >
                  <SelectTrigger id="debtSelection">
                    <SelectValue placeholder="Select a credit card or loan" />
                  </SelectTrigger>
                  <SelectContent>
                    {creditCards.length === 0 && loans.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No credit cards or loans available
                      </div>
                    ) : (
                      <>
                        {creditCards.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Credit Cards
                            </div>
                            {creditCards.map((card) => (
                              <SelectItem key={`cc-${card.id}`} value={`cc-${card.id}`}>
                                {card.name} - Balance: {formatCurrency(card.current_balance)}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {loans.length > 0 && (
                          <>
                            {creditCards.length > 0 && (
                              <div className="h-px bg-border my-1" />
                            )}
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                              Loans
                            </div>
                            {loans.map((loan) => (
                              <SelectItem key={`loan-${loan.id}`} value={`loan-${loan.id}`}>
                                {loan.name} - Balance: {formatCurrency(loan.balance)}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {(linkedCreditCardId || linkedLoanId) && (
                  <div className="mt-2">
                    <p className="text-sm text-muted-foreground">
                      Current balance: <strong>
                        {linkedCreditCardId
                          ? formatCurrency(creditCards.find(c => c.id.toString() === linkedCreditCardId)?.current_balance || 0)
                          : formatCurrency(loans.find(l => l.id.toString() === linkedLoanId)?.balance || 0)
                        }
                      </strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Target amount will be set to this balance when the goal is created.
                    </p>
                  </div>
                )}
              </div>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> This goal will track your progress toward paying off this debt.
                  The target amount will be set to the current balance.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Starting Balance (for envelope goals) */}
          {goalType === 'envelope' && !goal && (
            <div>
              <Label htmlFor="startingBalance">Starting Balance (Optional)</Label>
              <Input
                id="startingBalance"
                type="number"
                step="0.01"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Initial amount already saved toward this goal
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this goal"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : goal ? 'Update Goal' : 'Create Goal'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

