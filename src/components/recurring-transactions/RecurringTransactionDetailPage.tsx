'use client';

import { useEffect, useState } from 'react';
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
import { ArrowLeft, Save, Calendar, DollarSign, TrendingUp, Bell, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface RecurringTransaction {
  id: number;
  merchant_name: string;
  description_pattern: string | null;
  frequency: string;
  interval: number;
  day_of_month: number | null;
  day_of_week: number | null;
  week_of_month: number | null;
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
}

export default function RecurringTransactionDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [recurringTransaction, setRecurringTransaction] = useState<RecurringTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [merchantName, setMerchantName] = useState('');
  const [frequency, setFrequency] = useState('');
  const [expectedAmount, setExpectedAmount] = useState('');
  const [reminderDaysBefore, setReminderDaysBefore] = useState(2);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchRecurringTransaction();
  }, [id]);

  const fetchRecurringTransaction = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/recurring-transactions/${id}`);
      if (response.ok) {
        const data = await response.json();
        const rt = data.recurringTransaction;
        setRecurringTransaction(rt);
        setMerchantName(rt.merchant_name);
        setFrequency(rt.frequency);
        setExpectedAmount(rt.expected_amount?.toString() || '');
        setReminderDaysBefore(rt.reminder_days_before || 2);
        setReminderEnabled(rt.reminder_enabled);
        setIsActive(rt.is_active);
        setNotes(rt.notes || '');
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
  };

  const handleSave = async () => {
    if (!id) return;

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

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Biweekly',
      monthly: 'Monthly',
      bimonthly: 'Bimonthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      custom: 'Custom',
    };
    return labels[freq] || freq;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!recurringTransaction) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/recurring-transactions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{recurringTransaction.merchant_name}</h1>
          </div>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              setIsEditing(false);
              fetchRecurringTransaction();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Merchant Name</Label>
              {isEditing ? (
                <Input
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                />
              ) : (
                <p className="text-sm">{recurringTransaction.merchant_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              {isEditing ? (
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
              ) : (
                <p className="text-sm">{getFrequencyLabel(recurringTransaction.frequency)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Expected Amount</Label>
              {isEditing ? (
                <Input
                  type="number"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  step="0.01"
                />
              ) : (
                <p className="text-sm">
                  <span className={recurringTransaction.transaction_type === 'expense' ? 'text-red-600' : 'text-green-600'}>
                    {recurringTransaction.transaction_type === 'expense' ? '-' : '+'}
                    {formatCurrency(Math.abs(recurringTransaction.expected_amount || 0))}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <p className="text-sm">
                <Badge variant={recurringTransaction.transaction_type === 'expense' ? 'destructive' : 'default'}>
                  {recurringTransaction.transaction_type === 'expense' ? 'Expense' : 'Income'}
                </Badge>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <span className="text-sm">{isActive ? 'Active' : 'Inactive'}</span>
                </div>
              ) : (
                <p className="text-sm">
                  <Badge variant={recurringTransaction.is_active ? 'default' : 'secondary'}>
                    {recurringTransaction.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  {!recurringTransaction.is_confirmed && (
                    <Badge variant="outline" className="ml-2">Unconfirmed</Badge>
                  )}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Reminder Settings</Label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={reminderEnabled}
                      onCheckedChange={setReminderEnabled}
                    />
                    <span className="text-sm">Enable reminders</span>
                  </div>
                  {reminderEnabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={reminderDaysBefore}
                        onChange={(e) => setReminderDaysBefore(parseInt(e.target.value) || 2)}
                        min={0}
                        max={30}
                        className="w-20"
                      />
                      <span className="text-sm">days before</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm">
                  {recurringTransaction.reminder_enabled
                    ? `Remind me ${recurringTransaction.reminder_days_before} days before`
                    : 'Reminders disabled'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Next Expected Date</Label>
              <p className="text-sm flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {recurringTransaction.next_expected_date
                  ? new Date(recurringTransaction.next_expected_date).toLocaleDateString()
                  : 'Not scheduled'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Last Occurrence</Label>
              <p className="text-sm">
                {recurringTransaction.last_occurrence_date
                  ? new Date(recurringTransaction.last_occurrence_date).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Occurrence Count</Label>
              <p className="text-sm">{recurringTransaction.occurrence_count}</p>
            </div>

            <div className="space-y-2">
              <Label>Confidence Score</Label>
              <p className="text-sm">
                {recurringTransaction.confidence_score >= 0.8 ? (
                  <Badge className="bg-green-500">High ({(recurringTransaction.confidence_score * 100).toFixed(0)}%)</Badge>
                ) : recurringTransaction.confidence_score >= 0.5 ? (
                  <Badge className="bg-yellow-500">Medium ({(recurringTransaction.confidence_score * 100).toFixed(0)}%)</Badge>
                ) : (
                  <Badge className="bg-gray-500">Low ({(recurringTransaction.confidence_score * 100).toFixed(0)}%)</Badge>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

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
                {recurringTransaction.notes || 'No notes'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




