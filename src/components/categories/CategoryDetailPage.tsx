'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { formatCurrency } from '@/lib/utils';
import type { Category } from '@/lib/types';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { useFeature } from '@/contexts/FeatureContext';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { ArrowLeft, Archive, ArchiveRestore, Edit, Trash2, FileText } from 'lucide-react';
import CategoryBalanceAudit from './CategoryBalanceAudit';

function canArchiveCategory(category: Category) {
  if (category.is_system) return false;
  if (category.is_buffer) return false;
  return true;
}

export default function CategoryDetailPage({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const canEdit = isEditor && !permissionsLoading;

  const categoryTypesEnabled = useFeature('category_types');
  const prioritySystemEnabled = useFeature('priority_system');

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);
  const [monthlySpending, setMonthlySpending] = useState(0);
  const [ytdSpending, setYtdSpending] = useState(0);
  const [lastTransactionDate, setLastTransactionDate] = useState<string | null>(null);
  const [monthTransactionCount, setMonthTransactionCount] = useState<number | null>(null);

  // Edit dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('0');
  const [newMonthlyAmount, setNewMonthlyAmount] = useState('0');
  const [newNotes, setNewNotes] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'monthly_expense' | 'accumulation' | 'target_balance'>('monthly_expense');
  const [newPriority, setNewPriority] = useState(5);
  const [newAnnualTarget, setNewAnnualTarget] = useState('');
  const [newTargetBalance, setNewTargetBalance] = useState('');

  // Confirm dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const numericId = useMemo(() => parseInt(categoryId, 10), [categoryId]);

  const fetchData = async () => {
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
      setMonthlySpending((monthlyMap && numericId && monthlyMap[numericId]) ? monthlyMap[numericId] : 0);
      setYtdSpending((ytdMap && numericId && ytdMap[numericId]) ? ytdMap[numericId] : 0);

      if (activityRes.ok) {
        const activity = await activityRes.json();
        setLastTransactionDate(activity.lastTransactionDate ?? null);
        setMonthTransactionCount(typeof activity.monthTransactionCount === 'number' ? activity.monthTransactionCount : null);
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
  };

  useEffect(() => {
    if (!isNaN(numericId)) fetchData();
  }, [categoryId, numericId]);

  const openEdit = () => {
    if (!category) return;
    setNewName(category.name);
    setNewBalance(String(category.current_balance ?? 0));
    setNewMonthlyAmount(String(category.monthly_amount ?? 0));
    setNewNotes(category.notes || '');
    setNewCategoryType((category.category_type || 'monthly_expense') as any);
    setNewPriority(category.priority ?? 5);
    setNewAnnualTarget(category.annual_target != null ? String(category.annual_target) : '');
    setNewTargetBalance(category.target_balance != null ? String(category.target_balance) : '');
    setIsEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!category) return;

    const annualTargetValue = newAnnualTarget ? parseFloat(newAnnualTarget) : null;
    const targetBalanceValue = newTargetBalance ? parseFloat(newTargetBalance) : null;

    const patchBody: any = {
      name: newName,
      current_balance: parseFloat(newBalance) || 0,
      monthly_amount: parseFloat(newMonthlyAmount) || 0,
      notes: newNotes || null,
      category_type: newCategoryType,
      priority: newPriority,
      annual_target: annualTargetValue,
      target_balance: targetBalanceValue,
    };

    const prev = category;
    setCategory({ ...category, ...patchBody });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/categories">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Categories
            </Link>
          </Button>
        </div>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Category not found.</div>
        </Card>
      </div>
    );
  }

  const type = category.category_type || 'monthly_expense';
  const isArchived = !!category.is_archived;
  const archiveDisabled = !canArchiveCategory(category);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link href="/categories">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/reports/categories/${category.id}`}>
              <FileText className="h-4 w-4 mr-2" />
              View full report
            </Link>
          </Button>
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

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">{category.name}</h1>
          {isArchived && <Badge variant="secondary">Archived</Badge>}
          {category.is_system && <Badge variant="outline">System</Badge>}
          {category.is_buffer && <Badge variant="outline">Buffer</Badge>}
        </div>
        {categoryTypesEnabled && (
          <p className="text-muted-foreground">
            Type: <span className="font-medium">{type.replace('_', ' ')}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Monthly amount</div>
          <div className="text-lg font-semibold">{formatCurrency(category.monthly_amount ?? 0)}</div>
          <div className="mt-3 text-xs text-muted-foreground">Current balance</div>
          <div className="text-lg font-semibold">{formatCurrency(category.current_balance ?? 0)}</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Spent this month</div>
          <div className="text-lg font-semibold">{formatCurrency(monthlySpending)}</div>
          <div className="mt-3 text-xs text-muted-foreground">Spent YTD</div>
          <div className="text-lg font-semibold">{formatCurrency(ytdSpending)}</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Activity</div>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Transactions (mo)</span>
              <span className="font-medium">{monthTransactionCount ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last activity</span>
              <span className="font-medium">{lastTransactionDate ?? '—'}</span>
            </div>
          </div>
        </Card>
      </div>

      {category.notes ? (
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Notes</div>
          <div className="text-sm">{category.notes}</div>
        </Card>
      ) : null}

      <CategoryBalanceAudit categoryId={category.id} />

      {/* Edit dialog */}
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
                <Select value={newCategoryType} onValueChange={(v) => setNewCategoryType(v as any)}>
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

      {/* Delete confirmation */}
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

      {/* Archive confirmation */}
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


