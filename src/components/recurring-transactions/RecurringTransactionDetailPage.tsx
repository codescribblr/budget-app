'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Save,
  Calendar,
  DollarSign,
  Edit,
  Repeat,
  Bell,
  CheckCircle2,
  Trash2,
  Loader2,
  AlertCircle,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface RecurringTransaction {
  id: number;
  merchant_name: string;
  description_pattern: string | null;
  frequency: string;
  interval: number;
  expected_amount: number;
  amount_variance: number;
  is_amount_variable: boolean;
  transaction_type: 'income' | 'expense';
  category_id: number | null;
  account_id: number | null;
  credit_card_id: number | null;
  is_active: boolean;
  is_confirmed: boolean;
  confidence_score: number;
  detection_method: string;
  last_occurrence_date: string | null;
  next_expected_date: string | null;
  occurrence_count: number;
  notes: string | null;
  reminder_days_before: number;
  reminder_enabled: boolean;
  charge_class?: string | null;
  tracking_status?: string | null;
  accounts: { id: number; name: string } | null;
  credit_cards: { id: number; name: string } | null;
}

interface MatchedTransaction {
  id: number;
  date: string;
  description: string | null;
  total_amount: number;
  transaction_type: 'income' | 'expense';
  merchant_groups?: { display_name: string } | null;
  accounts?: { name: string } | null;
  credit_cards?: { name: string } | null;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  bimonthly: 'Bimonthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

const CHARGE_CLASS_LABELS: Record<string, string> = {
  fixed_bill: 'Fixed bill',
  variable_bill: 'Variable bill',
  income_payroll: 'Payroll income',
  membership: 'Membership',
  discretionary: 'Discretionary',
};

function getFrequencyLabel(freq: string) {
  return FREQUENCY_LABELS[freq] || freq;
}

function getChargeClassLabel(chargeClass: string | null | undefined) {
  if (!chargeClass) return null;
  return CHARGE_CLASS_LABELS[chargeClass] || chargeClass.replace(/_/g, ' ');
}

function toMonthlyEquivalent(amount: number, frequency: string, interval: number) {
  const safeInterval = interval > 0 ? interval : 1;
  switch (frequency) {
    case 'daily':
      return (amount * 30) / safeInterval;
    case 'weekly':
      return (amount * (52 / 12)) / safeInterval;
    case 'biweekly':
      return (amount * (26 / 12)) / safeInterval;
    case 'monthly':
      return amount / safeInterval;
    case 'bimonthly':
      return (amount * (6 / 12)) / safeInterval;
    case 'quarterly':
      return (amount * (4 / 12)) / safeInterval;
    case 'yearly':
      return amount / (12 * safeInterval);
    default:
      return amount;
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getConfidenceBadge(score: number) {
  const pct = (score * 100).toFixed(0);
  if (score >= 0.8) {
    return <Badge className="bg-green-600 hover:bg-green-600">High ({pct}%)</Badge>;
  }
  if (score >= 0.5) {
    return <Badge className="bg-amber-500 hover:bg-amber-500">Medium ({pct}%)</Badge>;
  }
  return <Badge variant="secondary">Low ({pct}%)</Badge>;
}

export default function RecurringTransactionDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [recurringTransaction, setRecurringTransaction] = useState<RecurringTransaction | null>(null);
  const [matchingTransactions, setMatchingTransactions] = useState<MatchedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [merchantName, setMerchantName] = useState('');
  const [frequency, setFrequency] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState(2);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  const resetForm = useCallback((rt: RecurringTransaction) => {
    setMerchantName(rt.merchant_name);
    setFrequency(rt.frequency);
    setExpectedAmount(rt.expected_amount?.toString() || '');
    setReminderDaysBefore(rt.reminder_days_before || 2);
    setReminderEnabled(rt.reminder_enabled);
    setIsActive(rt.is_active);
    setNotes(rt.notes || '');
  }, []);

  const fetchMatchingTransactions = useCallback(async () => {
    try {
      setLoadingTransactions(true);
      const response = await fetch(`/api/recurring-transactions/${id}/transactions`);
      if (response.ok) {
        const data = await response.json();
        setMatchingTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching matching transactions:', error);
    } finally {
      setLoadingTransactions(false);
    }
  }, [id]);

  const fetchRecurringTransaction = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recurring-transactions/${id}`);
      if (response.ok) {
        const data = await response.json();
        const rt = data.recurringTransaction;
        setRecurringTransaction(rt);
        resetForm(rt);
      } else {
        toast.error('Failed to fetch recurring transaction');
        router.push('/recurring-transactions');
      }
    } catch (error) {
      console.error('Error fetching recurring transaction:', error);
      toast.error('Failed to fetch recurring transaction');
    } finally {
      setLoading(false);
    }
  }, [id, resetForm, router]);

  useEffect(() => {
    if (!id) return;
    fetchRecurringTransaction();
    fetchMatchingTransactions();
  }, [id, fetchRecurringTransaction, fetchMatchingTransactions]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_name: merchantName,
          frequency,
          expected_amount: parseFloat(expectedAmount) || null,
          reminder_days_before: reminderDaysBefore,
          reminder_enabled: reminderEnabled,
          is_active: isActive,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        toast.success('Recurring transaction updated');
        setIsEditing(false);
        await fetchRecurringTransaction();
      } else {
        toast.error('Failed to update recurring transaction');
      }
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      toast.error('Failed to update recurring transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_confirmed: true }),
      });

      if (response.ok) {
        toast.success('Pattern confirmed');
        await fetchRecurringTransaction();
      } else {
        toast.error('Failed to confirm pattern');
      }
    } catch (error) {
      console.error('Error confirming recurring transaction:', error);
      toast.error('Failed to confirm pattern');
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Stopped tracking this pattern');
        router.push('/recurring-transactions');
      } else {
        toast.error('Failed to stop tracking');
      }
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      toast.error('Failed to stop tracking');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!recurringTransaction) {
    return null;
  }

  const isExpense = recurringTransaction.transaction_type === 'expense';
  const amountColor = isExpense ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  const amountPrefix = isExpense ? '-' : '+';
  const paymentSource =
    recurringTransaction.accounts?.name ||
    recurringTransaction.credit_cards?.name ||
    null;
  const monthlyEquivalent = toMonthlyEquivalent(
    recurringTransaction.expected_amount || 0,
    recurringTransaction.frequency,
    recurringTransaction.interval || 1,
  );
  const chargeClassLabel = getChargeClassLabel(recurringTransaction.charge_class);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" asChild>
          <Link href="/recurring-transactions">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {!recurringTransaction.is_confirmed && !isEditing && (
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm Pattern
            </Button>
          )}
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  resetForm(recurringTransaction);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Stop Tracking
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Repeat className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl md:text-3xl font-bold">{recurringTransaction.merchant_name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isExpense ? 'destructive' : 'default'}>
            {isExpense ? 'Expense' : 'Income'}
          </Badge>
          <Badge variant={recurringTransaction.is_active ? 'default' : 'secondary'}>
            {recurringTransaction.is_active ? 'Active' : 'Inactive'}
          </Badge>
          {!recurringTransaction.is_confirmed && (
            <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
              Unconfirmed
            </Badge>
          )}
          <Badge variant="outline">{getFrequencyLabel(recurringTransaction.frequency)}</Badge>
          {chargeClassLabel && <Badge variant="outline">{chargeClassLabel}</Badge>}
        </div>
        {paymentSource && (
          <p className="text-sm text-muted-foreground">
            Paid from <span className="font-medium text-foreground">{paymentSource}</span>
          </p>
        )}
      </div>

      {!recurringTransaction.is_confirmed && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900 dark:text-amber-100">
            This pattern was auto-detected. Review the matching transactions below and confirm if it looks correct.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            Expected Amount
          </div>
          <div className={`text-xl font-semibold mt-1 ${amountColor}`}>
            {amountPrefix}
            {formatCurrency(Math.abs(recurringTransaction.expected_amount || 0))}
          </div>
          {recurringTransaction.is_amount_variable && (
            <p className="text-xs text-muted-foreground mt-1">Variable amount</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Est. Monthly</div>
          <div className={`text-xl font-semibold mt-1 ${amountColor}`}>
            {amountPrefix}
            {formatCurrency(Math.abs(monthlyEquivalent))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Normalized from {getFrequencyLabel(recurringTransaction.frequency).toLowerCase()}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            Next Expected
          </div>
          <div className="text-xl font-semibold mt-1">
            {formatDate(recurringTransaction.next_expected_date)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Last: {formatDate(recurringTransaction.last_occurrence_date)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Occurrences
          </div>
          <div className="text-xl font-semibold mt-1">{recurringTransaction.occurrence_count}</div>
          <div className="mt-1">{getConfidenceBadge(recurringTransaction.confidence_score)}</div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matching Transactions</CardTitle>
          <CardDescription>
            Transactions used to detect this recurring pattern
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTransactions ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner />
            </div>
          ) : matchingTransactions.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <p className="mb-1">No matching transactions found.</p>
              <p className="text-sm">
                Run detection again or check that matches were saved for this pattern.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Account</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchingTransactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(txn.date)}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="truncate" title={txn.description || '—'}>
                          {txn.description || '—'}
                        </div>
                      </TableCell>
                      <TableCell>{txn.merchant_groups?.display_name || '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <span className={txn.transaction_type === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {txn.transaction_type === 'expense' ? '-' : '+'}
                          {formatCurrency(Math.abs(txn.total_amount || 0))}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {txn.accounts?.name || txn.credit_cards?.name || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? 'Edit Settings' : 'Settings'}</CardTitle>
            {!isEditing && (
              <CardDescription>Schedule, amount, and tracking status</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <Label>Merchant Name</Label>
                  <Input value={merchantName} onChange={(e) => setMerchantName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bimonthly">Bimonthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Amount</Label>
                  <Input
                    type="number"
                    value={expectedAmount}
                    onChange={(e) => setExpectedAmount(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">Include in forecasts and reminders</p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Merchant</dt>
                  <dd className="font-medium text-right">{recurringTransaction.merchant_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Frequency</dt>
                  <dd className="font-medium">{getFrequencyLabel(recurringTransaction.frequency)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Expected amount</dt>
                  <dd className={`font-medium ${amountColor}`}>
                    {amountPrefix}
                    {formatCurrency(Math.abs(recurringTransaction.expected_amount || 0))}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{recurringTransaction.is_active ? 'Active' : 'Inactive'}</dd>
                </div>
                {recurringTransaction.detection_method && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Detected via</dt>
                    <dd className="text-right capitalize">{recurringTransaction.detection_method.replace(/_/g, ' ')}</dd>
                  </div>
                )}
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Reminders
            </CardTitle>
            <CardDescription>Get notified before the next expected charge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Enable reminders</p>
                    <p className="text-xs text-muted-foreground">Email or push before next occurrence</p>
                  </div>
                  <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
                </div>
                {reminderEnabled && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={reminderDaysBefore}
                      onChange={(e) => setReminderDaysBefore(parseInt(e.target.value, 10) || 2)}
                      min={0}
                      max={30}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">days before</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm">
                {recurringTransaction.reminder_enabled ? (
                  <>
                    Remind me{' '}
                    <span className="font-medium">
                      {recurringTransaction.reminder_days_before}{' '}
                      {recurringTransaction.reminder_days_before === 1 ? 'day' : 'days'}
                    </span>{' '}
                    before the next expected charge.
                  </>
                ) : (
                  <span className="text-muted-foreground">Reminders are turned off.</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this recurring transaction..."
              rows={4}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {recurringTransaction.notes || 'No notes yet.'}
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop tracking this pattern?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes &ldquo;{recurringTransaction.merchant_name}&rdquo; from your recurring
              transactions. Your historical transactions are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Stopping...
                </>
              ) : (
                'Stop Tracking'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
