'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { DatePicker } from '@/components/ui/date-picker';
import { parseLocalDate, formatLocalDate } from '@/lib/date-utils';
import type { Category, TransactionWithSplits } from '@/lib/types';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { useFeature } from '@/contexts/FeatureContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { ArrowLeft, Archive, ArchiveRestore, Edit, Trash2, Crown } from 'lucide-react';
import CategoryBalanceAudit from './CategoryBalanceAudit';
import CategoryReportStats from '@/components/reports/categories/CategoryReportStats';
import CategoryReportCharts from '@/components/reports/categories/CategoryReportCharts';
import CategoryTransactionList from '@/components/reports/CategoryTransactionList';

function canArchiveCategory(category: Category) {
  if (category.is_system) return false;
  if (category.is_buffer) return false;
  return true;
}

export default function CategoryDetailPage({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const canEdit = isEditor && !permissionsLoading;

  const categoryTypesEnabled = useFeature('category_types');
  const prioritySystemEnabled = useFeature('priority_system');
  const advancedReportingEnabled = useFeature('advanced_reporting');
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const showAdvancedReports = isPremium && advancedReportingEnabled;

  const numericId = useMemo(() => parseInt(categoryId, 10), [categoryId]);

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithSplits[]>([]);
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [ytdSpending, setYtdSpending] = useState(0);
  const [lastTransactionDate, setLastTransactionDate] = useState<string | null>(null);
  const [monthTransactionCount, setMonthTransactionCount] = useState<number | null>(null);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRange, setDateRange] = useState('current-month');
  const [isInitialized, setIsInitialized] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('0');
  const [newMonthlyAmount, setNewMonthlyAmount] = useState('0');
  const [newNotes, setNewNotes] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'monthly_expense' | 'accumulation' | 'target_balance'>('monthly_expense');
  const [newPriority, setNewPriority] = useState(5);
  const [newAnnualTarget, setNewAnnualTarget] = useState('');
  const [newTargetBalance, setNewTargetBalance] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const updateURL = useCallback((start: string, end: string, range: string) => {
    if (isNaN(numericId)) return;
    const params = new URLSearchParams();
    if (start) params.set('startDate', start);
    if (end) params.set('endDate', end);
    if (range) params.set('dateRange', range);
    router.push(`/categories/${numericId}?${params.toString()}`, { scroll: false });
  }, [router, numericId]);

  useEffect(() => {
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const dateRangeParam = searchParams.get('dateRange');

    if (startDateParam || endDateParam || dateRangeParam) {
      if (startDateParam) setStartDate(startDateParam);
      if (endDateParam) setEndDate(endDateParam);
      if (dateRangeParam) setDateRange(dateRangeParam);
    } else {
      setDateRange('current-month');
    }

    setIsInitialized(true);
  }, [searchParams]);

  const fetchBudgetData = useCallback(async () => {
    if (isNaN(numericId)) return;

    try {
      setLoading(true);

      const [categoryRes, monthlyRes, ytdRes, activityRes] = await Promise.all([
        fetch(`/api/categories/${categoryId}`),
        fetch('/api/categories/monthly-spending'),
        fetch('/api/categories/ytd-spending'),
        fetch(`/api/categories/${categoryId}/activity`),
      ]);

      if (!categoryRes.ok) {
        const msg = await handleApiError(categoryRes, 'Failed to load category');
        throw new Error(msg || 'Failed to load category');
      }

      const cat = (await categoryRes.json()) as Category;
      setCategory(cat);

      const monthlyMap = monthlyRes.ok ? await monthlyRes.json() : {};
      const ytdMap = ytdRes.ok ? await ytdRes.json() : {};
      setMonthlySpending(monthlyMap?.[numericId] ?? 0);
      setYtdSpending(ytdMap?.[numericId] ?? 0);

      if (activityRes.ok) {
        const activity = await activityRes.json();
        setLastTransactionDate(activity.lastTransactionDate ?? null);
        setMonthTransactionCount(
          typeof activity.monthTransactionCount === 'number' ? activity.monthTransactionCount : null,
        );
      } else {
        setLastTransactionDate(null);
        setMonthTransactionCount(null);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load category');
      setCategory(null);
    } finally {
      setLoading(false);
    }
  }, [categoryId, numericId]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  useEffect(() => {
    if (!showAdvancedReports || !isInitialized || isNaN(numericId)) return;

    const fetchReportData = async () => {
      try {
        const transactionsUrl = new URL('/api/transactions', window.location.origin);
        if (startDate) transactionsUrl.searchParams.set('startDate', startDate);
        if (endDate) transactionsUrl.searchParams.set('endDate', endDate);

        const [categoriesRes, transactionsRes] = await Promise.all([
          fetch('/api/categories?includeArchived=all'),
          fetch(transactionsUrl.toString()),
        ]);

        if (categoriesRes.ok) {
          setCategories(await categoriesRes.json());
        }
        if (transactionsRes.ok) {
          setTransactions(await transactionsRes.json());
        }
      } catch (error) {
        console.error('Error fetching report data:', error);
      }
    };

    fetchReportData();
  }, [showAdvancedReports, isInitialized, numericId, startDate, endDate]);

  useEffect(() => {
    if (!isInitialized || !showAdvancedReports) return;
    if (dateRange === 'custom') return;

    const today = new Date();
    const end = today.toISOString().split('T')[0];
    let newStartDate = '';
    let newEndDate = '';

    switch (dateRange) {
      case 'current-month': {
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        newStartDate = currentMonthStart.toISOString().split('T')[0];
        newEndDate = currentMonthEnd.toISOString().split('T')[0];
        break;
      }
      case 'last-month': {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        newStartDate = lastMonth.toISOString().split('T')[0];
        newEndDate = lastMonthEnd.toISOString().split('T')[0];
        break;
      }
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        newStartDate = weekAgo.toISOString().split('T')[0];
        newEndDate = end;
        break;
      }
      case 'quarter': {
        const quarterAgo = new Date(today);
        quarterAgo.setMonth(quarterAgo.getMonth() - 3);
        newStartDate = quarterAgo.toISOString().split('T')[0];
        newEndDate = end;
        break;
      }
      case 'current-year': {
        const currentYearStart = new Date(today.getFullYear(), 0, 1);
        const currentYearEnd = new Date(today.getFullYear(), 11, 31);
        newStartDate = currentYearStart.toISOString().split('T')[0];
        newEndDate = currentYearEnd.toISOString().split('T')[0];
        break;
      }
      case 'year': {
        const yearAgo = new Date(today);
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        newStartDate = yearAgo.toISOString().split('T')[0];
        newEndDate = end;
        break;
      }
      case 'all':
        newStartDate = '';
        newEndDate = '';
        break;
    }

    setStartDate(newStartDate);
    setEndDate(newEndDate);
    updateURL(newStartDate, newEndDate, dateRange);
  }, [dateRange, isInitialized, showAdvancedReports, updateURL]);

  const filteredTransactions = useMemo(() => {
    if (!showAdvancedReports || isNaN(numericId)) return [];

    return transactions.filter((t) => {
      if (!t.splits.some((split) => split.category_id === numericId)) return false;
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });
  }, [transactions, numericId, startDate, endDate, showAdvancedReports]);

  const openEdit = () => {
    if (!category) return;
    setNewName(category.name);
    setNewBalance(String(category.current_balance ?? 0));
    setNewMonthlyAmount(String(category.monthly_amount ?? 0));
    setNewNotes(category.notes || '');
    setNewCategoryType((category.category_type || 'monthly_expense') as typeof newCategoryType);
    setNewPriority(category.priority ?? 5);
    setNewAnnualTarget(category.annual_target != null ? String(category.annual_target) : '');
    setNewTargetBalance(category.target_balance != null ? String(category.target_balance) : '');
    setIsEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!category) return;

    const annualTargetValue = newAnnualTarget ? parseFloat(newAnnualTarget) : undefined;
    const targetBalanceValue = newTargetBalance ? parseFloat(newTargetBalance) : undefined;

    const patchBody = {
      name: newName,
      current_balance: parseFloat(newBalance) || 0,
      monthly_amount: parseFloat(newMonthlyAmount) || 0,
      notes: newNotes || null,
      category_type: newCategoryType,
      priority: newPriority,
      annual_target: annualTargetValue ?? null,
      target_balance: targetBalanceValue ?? null,
    };

    const prev = category;
    setCategory({
      ...category,
      ...patchBody,
      annual_target: annualTargetValue,
      target_balance: targetBalanceValue,
    });
    setIsEditDialogOpen(false);

    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to update category');
        throw new Error(msg || 'Failed to update category');
      }
      const updated = await res.json();
      setCategory(updated);
      toast.success('Category updated');
    } catch (e) {
      console.error(e);
      setCategory(prev);
      toast.error('Failed to update category');
    }
  };

  const toggleArchive = async () => {
    if (!category) return;
    const nextArchived = !category.is_archived;
    const prev = category;
    setCategory({ ...category, is_archived: nextArchived });
    setArchiveDialogOpen(false);

    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: nextArchived }),
      });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to update category');
        throw new Error(msg || 'Failed to update category');
      }
      const updated = await res.json();
      setCategory(updated);
      toast.success(nextArchived ? 'Category archived' : 'Category restored');
    } catch (e) {
      console.error(e);
      setCategory(prev);
      toast.error('Failed to update category');
    }
  };

  const deleteCategory = async () => {
    if (!category) return;
    setDeleteDialogOpen(false);
    try {
      const res = await fetch(`/api/categories/${category.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to delete category');
        throw new Error(msg || 'Failed to delete category');
      }
      toast.success('Category deleted');
      router.push('/categories');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete category');
    }
  };

  const getCategoryTypeBadge = () => {
    if (!categoryTypesEnabled || !category?.category_type) return null;

    const typeLabels: Record<string, string> = {
      monthly_expense: 'Monthly Expense',
      accumulation: 'Accumulation',
      target_balance: 'Target Balance',
    };

    const colors: Record<string, string> = {
      monthly_expense: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      accumulation: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      target_balance: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };

    return (
      <Badge className={colors[category.category_type] || 'bg-gray-100 text-gray-800'}>
        {typeLabels[category.category_type] || category.category_type}
      </Badge>
    );
  };

  if (loading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link href="/categories">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Categories
          </Link>
        </Button>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Category not found.</div>
        </Card>
      </div>
    );
  }

  const isArchived = !!category.is_archived;
  const archiveDisabled = !canArchiveCategory(category);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="outline" asChild>
          <Link href="/categories">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={openEdit} disabled={!canEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => setArchiveDialogOpen(true)}
            disabled={!canEdit || archiveDisabled}
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Restore
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </>
            )}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={!canEdit}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">{category.name}</h1>
          {isArchived && <Badge variant="secondary">Archived</Badge>}
          {category.is_system && <Badge variant="outline">System</Badge>}
          {category.is_buffer && <Badge variant="outline">Buffer</Badge>}
          {getCategoryTypeBadge()}
        </div>

        {showAdvancedReports && (
          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger id="date-range" className="w-full sm:w-[160px] md:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Current Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
                <SelectItem value="current-year">Current Year</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <div className="w-[calc(50%-0.25rem)] sm:w-auto md:w-auto">
              <DatePicker
                id="start-date"
                date={parseLocalDate(startDate)}
                onDateChange={(date) => {
                  const newStartDate = formatLocalDate(date);
                  setStartDate(newStartDate);
                  setDateRange('custom');
                  updateURL(newStartDate, endDate, 'custom');
                }}
                placeholder="Start date"
              />
            </div>
            <div className="w-[calc(50%-0.25rem)] sm:w-auto md:w-auto">
              <DatePicker
                id="end-date"
                date={parseLocalDate(endDate)}
                onDateChange={(date) => {
                  const newEndDate = formatLocalDate(date);
                  setEndDate(newEndDate);
                  setDateRange('custom');
                  updateURL(startDate, newEndDate, 'custom');
                }}
                placeholder="End date"
              />
            </div>
          </div>
        )}
      </div>

      {category.notes ? (
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Notes</div>
          <div className="text-sm">{category.notes}</div>
        </Card>
      ) : null}

      <CategoryReportStats
        category={category}
        transactions={showAdvancedReports ? filteredTransactions : []}
        startDate={showAdvancedReports ? startDate : ''}
        endDate={showAdvancedReports ? endDate : ''}
        lastTransactionDate={lastTransactionDate}
        monthTransactionCount={monthTransactionCount}
        budgetSummaryOnly={!showAdvancedReports}
        monthlySpending={monthlySpending}
        ytdSpending={ytdSpending}
      />

      {showAdvancedReports ? (
        <>
          <CategoryReportCharts
            category={category}
            transactions={filteredTransactions}
            startDate={startDate}
            endDate={endDate}
          />

          <CategoryTransactionList
            transactions={filteredTransactions}
            categories={categories}
            selectedCategoryId={numericId}
            startDate={startDate}
            endDate={endDate}
          />
        </>
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-amber-500" />
              Advanced reports
            </CardTitle>
            <CardDescription>
              Charts, spending trends, merchant breakdowns, and filtered transaction history for this category.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isPremium ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to Premium to unlock detailed category analytics.
                </p>
                <Button onClick={() => router.push('/settings/subscription')}>
                  View Premium plans
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Enable Advanced Reporting in your feature settings to view charts and analytics here.
                </p>
                <Button variant="outline" onClick={() => router.push('/settings')}>
                  Go to feature settings
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <CategoryBalanceAudit categoryId={category.id} />

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update details for this category.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>

            {categoryTypesEnabled && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Category type</label>
                  <HelpTooltip content="Category type controls how targets and progress are interpreted." />
                </div>
                <Select value={newCategoryType} onValueChange={(v) => setNewCategoryType(v as typeof newCategoryType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly_expense">Monthly expense</SelectItem>
                    <SelectItem value="accumulation">Accumulation</SelectItem>
                    <SelectItem value="target_balance">Target balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Monthly amount</label>
                <Input value={newMonthlyAmount} onChange={(e) => setNewMonthlyAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Current balance</label>
                <Input value={newBalance} onChange={(e) => setNewBalance(e.target.value)} />
              </div>
            </div>

            {categoryTypesEnabled && newCategoryType === 'accumulation' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Annual target</label>
                <Input value={newAnnualTarget} onChange={(e) => setNewAnnualTarget(e.target.value)} />
              </div>
            )}

            {categoryTypesEnabled && newCategoryType === 'target_balance' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Target balance</label>
                <Input value={newTargetBalance} onChange={(e) => setNewTargetBalance(e.target.value)} />
              </div>
            )}

            {prioritySystemEnabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Priority</label>
                  <HelpTooltip content="Higher priority categories are funded first when using smart allocation." />
                  <span className="text-xs text-muted-foreground">({newPriority})</span>
                </div>
                <Slider value={[newPriority]} min={1} max={10} step={1} onValueChange={(v) => setNewPriority(v[0] ?? 5)} />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Notes</label>
              <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional…" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveEdit} disabled={!canEdit}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete “{category.name}”. If this category is used by existing transactions, consider archiving instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCategory} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isArchived ? 'Restore category?' : 'Archive category?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived ? (
                <>This will make “{category.name}” active again.</>
              ) : (
                <>Archived categories are hidden from the dashboard and from category pickers by default, but remain available for reporting and history.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={toggleArchive}>
              {isArchived ? 'Restore' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
