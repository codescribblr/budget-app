'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useShiftClickSelection } from '@/hooks/useShiftClickSelection';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Archive,
  ArchiveRestore,
  Edit,
  GripVertical,
  List,
  MoreVertical,
  Plus,
  Save,
  Search,
  Trash2,
  Grid3X3,
  X,
  Filter,
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type StatusOption = 'active' | 'archived';
type TypeOption = 'monthly_expense' | 'accumulation' | 'target_balance';

function canArchiveCategory(category: Category) {
  // Guardrails: don't let users archive system/buffer categories (these are foundational)
  if (category.is_system) return false;
  if (category.is_buffer) return false;
  return true;
}

function SortableItem({
  id,
  disabled,
  children,
}: {
  id: number;
  disabled: boolean;
  children: (props: { handleProps: any; isDragging: boolean }) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ handleProps: { ...attributes, ...listeners }, isDragging })}
    </div>
  );
}

function SortableTableRow({
  category,
  disabled,
  categoryTypesEnabled,
  monthlySpending,
  ytdSpending,
  canEdit,
  onEdit,
  onArchiveToggle,
  onDelete,
}: {
  category: Category;
  disabled: boolean;
  categoryTypesEnabled: boolean;
  monthlySpending: Record<number, number>;
  ytdSpending: Record<number, number>;
  canEdit: boolean;
  onEdit: (c: Category) => void;
  onArchiveToggle: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
  };

  const isArchived = !!category.is_archived;
  const spent = monthlySpending[category.id] ?? 0;
  const ytd = ytdSpending[category.id] ?? 0;
  const type = category.category_type || 'monthly_expense';
  const archiveDisabled = !canArchiveCategory(category);

  return (
    <TableRow ref={setNodeRef} style={style} className={isArchived ? 'opacity-70' : ''}>
      <TableCell className="w-[44px]">
        {!disabled && !isArchived ? (
          <div className="cursor-grab text-muted-foreground" {...attributes} {...listeners} aria-label="Drag to reorder">
            <GripVertical className="h-4 w-4" />
          </div>
        ) : null}
      </TableCell>
      <TableCell className="max-w-[260px]">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/categories/${category.id}`} className="hover:underline truncate font-medium">
            {category.name}
          </Link>
          {isArchived && <Badge variant="secondary">Archived</Badge>}
          {category.is_system && <Badge variant="outline">System</Badge>}
          {category.is_buffer && <Badge variant="outline">Buffer</Badge>}
        </div>
      </TableCell>
      <TableCell>
        {categoryTypesEnabled ? (
          <span className="text-sm text-muted-foreground">{type.replace('_', ' ')}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {(() => {
          if (type === 'monthly_expense') {
            return formatCurrency(category.monthly_amount ?? 0);
          } else if (type === 'accumulation') {
            return formatCurrency(category.annual_target ?? 0);
          } else if (type === 'target_balance') {
            return formatCurrency(category.target_balance ?? 0);
          }
          return formatCurrency(category.monthly_amount ?? 0);
        })()}
      </TableCell>
      <TableCell className="text-right">{formatCurrency(category.current_balance ?? 0)}</TableCell>
      <TableCell className="text-right">{formatCurrency(spent)}</TableCell>
      <TableCell className="text-right">{formatCurrency(ytd)}</TableCell>
      <TableCell className="w-[44px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!canEdit}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(category)} disabled={!canEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onArchiveToggle(category)} disabled={!canEdit || archiveDisabled}>
              {isArchived ? (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Restore
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(category)} className="text-red-600" disabled={!canEdit}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function CategoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const canEdit = isEditor && !permissionsLoading;

  const categoryTypesEnabled = useFeature('category_types');
  const prioritySystemEnabled = useFeature('priority_system');

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlySpending, setMonthlySpending] = useState<Record<number, number>>({});
  const [ytdSpending, setYtdSpending] = useState<Record<number, number>>({});

  // Filters (URL-driven, like Transactions page)
  const qParam = searchParams.get('q') || '';
  const viewParam = searchParams.get('view');
  const viewMode: ViewMode = viewParam === 'grid' ? 'grid' : 'list'; // default list

  const statusParam = searchParams.get('status');
  const statusSelections: StatusOption[] = statusParam
    ? statusParam
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is StatusOption => s === 'active' || s === 'archived')
    : ['active'];

  const typeParam = searchParams.get('type');
  const typeSelections: TypeOption[] = typeParam
    ? typeParam
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is TypeOption => s === 'monthly_expense' || s === 'accumulation' || s === 'target_balance')
    : [];

  const showSystem = searchParams.get('showSystem') === 'true';
  const showBuffer = searchParams.get('showBuffer') === 'true';

  const updateFilters = (updates: {
    q?: string | null;
    view?: ViewMode | null;
    status?: StatusOption[] | null;
    type?: TypeOption[] | null;
    showSystem?: boolean | null;
    showBuffer?: boolean | null;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (updates.q !== undefined) {
      if (updates.q && updates.q.trim()) params.set('q', updates.q.trim());
      else params.delete('q');
    }
    if (updates.view !== undefined) {
      if (updates.view) params.set('view', updates.view);
      else params.delete('view');
    }
    if (updates.status !== undefined) {
      if (updates.status && updates.status.length > 0) params.set('status', updates.status.join(','));
      else params.delete('status');
    }
    if (updates.type !== undefined) {
      if (updates.type && updates.type.length > 0) params.set('type', updates.type.join(','));
      else params.delete('type');
    }
    if (updates.showSystem !== undefined) {
      if (updates.showSystem) params.set('showSystem', 'true');
      else params.delete('showSystem');
    }
    if (updates.showBuffer !== undefined) {
      if (updates.showBuffer) params.set('showBuffer', 'true');
      else params.delete('showBuffer');
    }

    const qs = params.toString();
    router.push(qs ? `/categories?${qs}` : '/categories');
  };

  // Bulk selection
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Reorder mode
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderedCategories, setReorderedCategories] = useState<Category[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form fields
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('0');
  const [newMonthlyAmount, setNewMonthlyAmount] = useState('0');
  const [newNotes, setNewNotes] = useState('');
  const [newIsSystem, setNewIsSystem] = useState(false);
  const [newCategoryType, setNewCategoryType] = useState<'monthly_expense' | 'accumulation' | 'target_balance'>('monthly_expense');
  const [newPriority, setNewPriority] = useState(5);
  const [newAnnualTarget, setNewAnnualTarget] = useState('');
  const [newTargetBalance, setNewTargetBalance] = useState('');

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Archive confirmation
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [categoryToArchive, setCategoryToArchive] = useState<Category | null>(null);

  // Bulk delete confirmation
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const resetForm = () => {
    setNewName('');
    setNewBalance('0');
    setNewMonthlyAmount('0');
    setNewNotes('');
    setNewIsSystem(false);
    setNewCategoryType('monthly_expense');
    setNewPriority(5);
    setNewAnnualTarget('');
    setNewTargetBalance('');
  };

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const [categoriesRes, monthlyRes, ytdRes] = await Promise.all([
        fetch('/api/categories?includeArchived=all'),
        fetch('/api/categories/monthly-spending'),
        fetch('/api/categories/ytd-spending'),
      ]);

      if (!categoriesRes.ok) throw new Error('Failed to fetch categories');

      const [categoriesData, monthlyData, ytdData] = await Promise.all([
        categoriesRes.json(),
        monthlyRes.ok ? monthlyRes.json() : {},
        ytdRes.ok ? ytdRes.json() : {},
      ]);

      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setMonthlySpending(monthlyData || {});
      setYtdSpending(ytdData || {});
    } catch (err) {
      console.error(err);
      toast.error('Failed to load categories');
      setCategories([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Only fetch once on mount
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchData();
    }
  }, []);

  const filteredCategories = useMemo(() => {
    let list = [...categories];

    // Status multi-filter (default: active)
    const statuses = statusSelections.length > 0 ? statusSelections : (['active'] as StatusOption[]);
    const hasActive = statuses.includes('active');
    const hasArchived = statuses.includes('archived');
    if (hasActive && !hasArchived) list = list.filter((c) => !c.is_archived);
    if (!hasActive && hasArchived) list = list.filter((c) => !!c.is_archived);
    // If both selected, treat as all

    // System/buffer visibility
    if (!showSystem) list = list.filter((c) => !c.is_system);
    if (!showBuffer) list = list.filter((c) => !c.is_buffer);

    // Type multi-filter
    if (typeSelections.length > 0) {
      list = list.filter((c) => typeSelections.includes((c.category_type || 'monthly_expense') as TypeOption));
    }

    // Search
    const q = qParam.trim().toLowerCase();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));

    // Sort by sort_order for consistent display
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

    return list;
  }, [categories, statusSelections, showSystem, showBuffer, typeSelections, qParam]);

  useEffect(() => {
    // Keep selection aligned with current filtered set
    if (!bulkMode) return;
    const visibleIds = new Set(filteredCategories.map((c) => c.id));
    setSelectedIds((cur) => new Set(Array.from(cur).filter((id) => visibleIds.has(id))));
  }, [bulkMode, filteredCategories]);

  const clearSelection = () => setSelectedIds(new Set());

  const selectAllVisible = (checked: boolean) => {
    if (!checked) {
      clearSelection();
      return;
    }
    setSelectedIds(new Set(filteredCategories.map((c) => c.id)));
  };

  const bulkArchiveOrRestore = async (is_archived: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    // Apply guardrails for archive
    const allowedIds = is_archived
      ? ids.filter((id) => {
          const c = categories.find((x) => x.id === id);
          return c ? canArchiveCategory(c) : false;
        })
      : ids;

    const skipped = ids.length - allowedIds.length;
    if (allowedIds.length === 0) {
      toast.error('No selected categories can be archived');
      return;
    }

    try {
      const res = await fetch('/api/categories/bulk-archive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: allowedIds, is_archived }),
      });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to update categories');
        throw new Error(msg || 'Failed to update categories');
      }
      const updated = (await res.json()) as Category[];
      setCategories((cur) =>
        cur.map((c) => {
          const u = updated.find((x) => x.id === c.id);
          return u ? u : c;
        })
      );
      toast.success(is_archived ? 'Categories archived' : 'Categories restored');
      if (skipped > 0) toast.message(`${skipped} system/buffer categories were skipped`);
      clearSelection();
      setBulkMode(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to update categories');
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDeleteDialogOpen(false);
    const prev = categories;
    setCategories((cur) => cur.filter((c) => !selectedIds.has(c.id)));

    try {
      // Delete sequentially to keep server load reasonable
      for (const id of ids) {
        const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          const msg = await handleApiError(res, 'Failed to delete category');
          throw new Error(msg || 'Failed to delete category');
        }
      }
      toast.success('Categories deleted');
      clearSelection();
      setBulkMode(false);
    } catch (e) {
      console.error(e);
      setCategories(prev);
      toast.error('Failed to delete one or more categories');
    }
  };

  const startEdit = (category: Category) => {
    setEditingCategory(category);
    setNewName(category.name);
    setNewBalance(String(category.current_balance ?? 0));
    setNewMonthlyAmount(String(category.monthly_amount ?? 0));
    setNewNotes(category.notes || '');
    setNewIsSystem(!!category.is_system);
    setNewCategoryType((category.category_type || 'monthly_expense') as any);
    setNewPriority(category.priority ?? 5);
    setNewAnnualTarget(category.annual_target != null ? String(category.annual_target) : '');
    setNewTargetBalance(category.target_balance != null ? String(category.target_balance) : '');
    setIsEditDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;

    const annualTargetValue = newAnnualTarget ? parseFloat(newAnnualTarget) : null;
    const targetBalanceValue = newTargetBalance ? parseFloat(newTargetBalance) : null;

    const patchBody: any = {
      name: newName,
      current_balance: parseFloat(newBalance) || 0,
      monthly_amount: parseFloat(newMonthlyAmount) || 0,
      notes: newNotes || null,
      is_system: newIsSystem,
      category_type: newCategoryType,
      priority: newPriority,
      annual_target: annualTargetValue,
      target_balance: targetBalanceValue,
    };

    // Optimistic update
    const prev = categories;
    setCategories((cur) => cur.map((c) => (c.id === editingCategory.id ? { ...c, ...patchBody } : c)));
    setIsEditDialogOpen(false);
    setEditingCategory(null);

    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to update category');
        throw new Error(msg || 'Failed to update category');
      }
      const updated = await res.json();
      setCategories((cur) => cur.map((c) => (c.id === updated.id ? updated : c)));
      toast.success('Category updated');
    } catch (e) {
      console.error(e);
      setCategories(prev);
      toast.error('Failed to update category');
    } finally {
      resetForm();
    }
  };

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const annualTargetValue = newAnnualTarget ? parseFloat(newAnnualTarget) : null;
    const targetBalanceValue = newTargetBalance ? parseFloat(newTargetBalance) : null;

    const body: any = {
      name: newName.trim(),
      current_balance: parseFloat(newBalance) || 0,
      monthly_amount: parseFloat(newMonthlyAmount) || 0,
      notes: newNotes || null,
      is_system: newIsSystem,
      category_type: newCategoryType,
      priority: newPriority,
      annual_target: annualTargetValue,
      target_balance: targetBalanceValue,
    };

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to add category');
        throw new Error(msg || 'Failed to add category');
      }
      const created = await res.json();
      setCategories((cur) => [...cur, created]);
      toast.success('Category created');
      setIsAddDialogOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
      toast.error('Failed to create category');
    }
  };

  const confirmDelete = (category: Category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    const prev = categories;
    setCategories((cur) => cur.filter((c) => c.id !== categoryToDelete.id));
    setDeleteDialogOpen(false);

    try {
      const res = await fetch(`/api/categories/${categoryToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to delete category');
        throw new Error(msg || 'Failed to delete category');
      }
      toast.success('Category deleted');
    } catch (e) {
      console.error(e);
      setCategories(prev);
      toast.error('Failed to delete category');
    } finally {
      setCategoryToDelete(null);
    }
  };

  const confirmArchiveToggle = (category: Category) => {
    setCategoryToArchive(category);
    setArchiveDialogOpen(true);
  };

  const handleArchiveToggle = async () => {
    if (!categoryToArchive) return;
    const nextArchived = !categoryToArchive.is_archived;
    const prev = categories;
    setCategories((cur) =>
      cur.map((c) => (c.id === categoryToArchive.id ? { ...c, is_archived: nextArchived } : c))
    );
    setArchiveDialogOpen(false);

    try {
      const res = await fetch(`/api/categories/${categoryToArchive.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: nextArchived }),
      });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to update category');
        throw new Error(msg || 'Failed to update category');
      }
      const updated = await res.json();
      setCategories((cur) => cur.map((c) => (c.id === updated.id ? updated : c)));
      toast.success(nextArchived ? 'Category archived' : 'Category restored');
    } catch (e) {
      console.error(e);
      setCategories(prev);
      toast.error('Failed to update category');
    } finally {
      setCategoryToArchive(null);
    }
  };

  const beginReorder = () => {
    setIsReorderMode(true);
    // Only reorder active categories (archived are kept separate)
    const active = filteredCategories.filter((c) => !c.is_archived);
    setReorderedCategories(active);
  };

  const cancelReorder = () => {
    setIsReorderMode(false);
    setReorderedCategories([]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setReorderedCategories((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const saveReorder = async () => {
    try {
      setIsSavingOrder(true);
      const categoryOrders = reorderedCategories.map((category, index) => ({
        id: category.id,
        sort_order: index,
      }));

      // Optimistically update local categories
      setCategories((cur) =>
        cur.map((c) => {
          const found = categoryOrders.find((o) => o.id === c.id);
          return found ? { ...c, sort_order: found.sort_order } : c;
        })
      );

      const res = await fetch('/api/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryOrders }),
      });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to save category order');
        throw new Error(msg || 'Failed to save category order');
      }
      toast.success('Category order saved');
      cancelReorder();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save category order');
      // Refresh to recover
      fetchData();
    } finally {
      setIsSavingOrder(false);
    }
  };

  const categoriesToRender = isReorderMode ? reorderedCategories : filteredCategories;
  const isArchivedOnlyView = statusSelections.includes('archived') && !statusSelections.includes('active');

  // Shift-click selection handler
  const handleCheckboxClick = useShiftClickSelection(
    categoriesToRender,
    (category) => category.id,
    selectedIds,
    setSelectedIds
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
            Manage your budget categories. Archive categories to stop using them without losing history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              resetForm();
              setIsAddDialogOpen(true);
            }}
            disabled={!canEdit}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-col gap-3">
          {/* Search row */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex items-center gap-2 w-full">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={qParam}
                onChange={(e) => updateFilters({ q: e.target.value })}
                placeholder="Search categories…"
                className="w-full"
              />
              {qParam && (
                <Button variant="ghost" size="sm" onClick={() => updateFilters({ q: null })}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filters row (wraps on mobile, like Transactions) */}
          <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {/* Status multi-select */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    Status
                    {statusSelections.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {statusSelections.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={statusSelections.length === 0 || (statusSelections.includes('active') && !statusSelections.includes('archived'))}
                    onCheckedChange={() => updateFilters({ status: ['active'] })}
                  >
                    Active only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusSelections.length > 0 && statusSelections.includes('archived') && !statusSelections.includes('active')}
                    onCheckedChange={() => updateFilters({ status: ['archived'] })}
                  >
                    Archived only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={statusSelections.includes('active') && statusSelections.includes('archived')}
                    onCheckedChange={() => updateFilters({ status: ['active', 'archived'] })}
                  >
                    Active + Archived
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Type multi-select */}
              {categoryTypesEnabled && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto">
                      <Filter className="mr-2 h-4 w-4" />
                      Type
                      {typeSelections.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {typeSelections.length}
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 max-h-[320px] overflow-y-auto">
                    <DropdownMenuLabel>Filter by category type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={typeSelections.length === 0}
                      onCheckedChange={() => {
                        if (typeSelections.length > 0) updateFilters({ type: null });
                      }}
                    >
                      All types
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={typeSelections.includes('monthly_expense')}
                      onCheckedChange={() => {
                        const next: TypeOption[] = typeSelections.includes('monthly_expense')
                          ? (typeSelections.filter((t) => t !== 'monthly_expense') as TypeOption[])
                          : [...typeSelections, 'monthly_expense'];
                        updateFilters({ type: next.length > 0 ? next : null });
                      }}
                    >
                      Monthly expense
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={typeSelections.includes('accumulation')}
                      onCheckedChange={() => {
                        const next: TypeOption[] = typeSelections.includes('accumulation')
                          ? (typeSelections.filter((t) => t !== 'accumulation') as TypeOption[])
                          : [...typeSelections, 'accumulation'];
                        updateFilters({ type: next.length > 0 ? next : null });
                      }}
                    >
                      Accumulation
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={typeSelections.includes('target_balance')}
                      onCheckedChange={() => {
                        const next: TypeOption[] = typeSelections.includes('target_balance')
                          ? (typeSelections.filter((t) => t !== 'target_balance') as TypeOption[])
                          : [...typeSelections, 'target_balance'];
                        updateFilters({ type: next.length > 0 ? next : null });
                      }}
                    >
                      Target balance
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* System/Buffer toggles */}
              <Button
                variant={showSystem ? 'default' : 'outline'}
                className="w-full sm:w-auto"
                onClick={() => updateFilters({ showSystem: !showSystem })}
              >
                Show system
              </Button>
              <Button
                variant={showBuffer ? 'default' : 'outline'}
                className="w-full sm:w-auto"
                onClick={() => updateFilters({ showBuffer: !showBuffer })}
              >
                Show buffer
              </Button>

              {/* Clear */}
              {(qParam || typeSelections.length > 0 || statusSelections.join(',') !== 'active' || showSystem || showBuffer || viewParam) && (
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => router.push('/categories')}>
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-end">
            <Button
              variant={bulkMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (isReorderMode) cancelReorder();
                setBulkMode((v) => !v);
                clearSelection();
              }}
              disabled={!canEdit}
              className="w-full sm:w-auto"
            >
              Bulk
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilters({ view: 'grid' })}
              className="w-full sm:w-auto"
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateFilters({ view: 'list' })}
              className="w-full sm:w-auto"
            >
              <List className="h-4 w-4 mr-2" />
              List
            </Button>

            {!isReorderMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={beginReorder}
                disabled={!canEdit || isArchivedOnlyView || bulkMode}
                className="w-full sm:w-auto"
              >
                <GripVertical className="h-4 w-4 mr-2" />
                Reorder
              </Button>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={cancelReorder} disabled={isSavingOrder} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button size="sm" onClick={saveReorder} disabled={isSavingOrder} className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingOrder ? 'Saving…' : 'Save order'}
                </Button>
              </>
            )}
          </div>
          </div>
        </div>
      </Card>

      {/* Bulk action bar */}
      {bulkMode && (
        <Card className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Selected: <span className="font-medium text-foreground">{selectedIds.size}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => bulkArchiveOrRestore(true)} disabled={selectedIds.size === 0}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button variant="outline" size="sm" onClick={() => bulkArchiveOrRestore(false)} disabled={selectedIds.size === 0}>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Restore
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialogOpen(true)} disabled={selectedIds.size === 0}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={() => { clearSelection(); setBulkMode(false); }}>
                Done
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Content */}
      {categoriesToRender.length === 0 ? (
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">No categories match your filters.</div>
        </Card>
      ) : viewMode === 'grid' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categoriesToRender.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {categoriesToRender.map((category) => {
                const spent = monthlySpending[category.id] ?? 0;
                const ytd = ytdSpending[category.id] ?? 0;
                const isArchived = !!category.is_archived;
                const type = category.category_type || 'monthly_expense';
                const archiveDisabled = !canArchiveCategory(category);

                const card = (
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      {bulkMode && (
                        <div className="pt-1">
                            <Checkbox
                              checked={selectedIds.has(category.id)}
                              onClick={(e) => {
                                const checked = !selectedIds.has(category.id);
                                handleCheckboxClick(category.id, e, checked);
                              }}
                              onCheckedChange={() => {}} // Required for controlled checkbox
                              aria-label="Select category"
                              disabled={!canEdit}
                            />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/categories/${category.id}`}
                            className="font-medium text-sm hover:underline truncate"
                          >
                            {category.name}
                          </Link>
                          {isArchived && <Badge variant="secondary">Archived</Badge>}
                          {category.is_system && <Badge variant="outline">System</Badge>}
                          {category.is_buffer && <Badge variant="outline">Buffer</Badge>}
                        </div>
                        {categoryTypesEnabled && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Type: {type.replace('_', ' ')}
                          </div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!canEdit}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEdit(category)} disabled={!canEdit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => confirmArchiveToggle(category)}
                            disabled={!canEdit || archiveDisabled}
                          >
                            {isArchived ? (
                              <>
                                <ArchiveRestore className="mr-2 h-4 w-4" />
                                Restore
                              </>
                            ) : (
                              <>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => confirmDelete(category)}
                            className="text-red-600"
                            disabled={!canEdit}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {type === 'monthly_expense' ? 'Monthly' : type === 'accumulation' ? 'Yearly Budget' : 'Target'}
                        </div>
                        <div className="font-medium">
                          {(() => {
                            if (type === 'monthly_expense') {
                              return formatCurrency(category.monthly_amount ?? 0);
                            } else if (type === 'accumulation') {
                              return formatCurrency(category.annual_target ?? 0);
                            } else if (type === 'target_balance') {
                              return formatCurrency(category.target_balance ?? 0);
                            }
                            return formatCurrency(category.monthly_amount ?? 0);
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Balance</div>
                        <div className="font-medium">{formatCurrency(category.current_balance ?? 0)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Spent (mo)</div>
                        <div className="font-medium">{formatCurrency(spent)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Spent (YTD)</div>
                        <div className="font-medium">{formatCurrency(ytd)}</div>
                      </div>
                    </div>
                  </Card>
                );

                if (!isReorderMode || isArchived) return card;

                return (
                  <SortableItem key={category.id} id={category.id} disabled={!canEdit}>
                    {({ handleProps }) => (
                      <div className="relative">
                        <div
                          className="absolute top-2 right-9 z-10 cursor-grab text-muted-foreground"
                          {...handleProps}
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        {card}
                      </div>
                    )}
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categoriesToRender.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <Card className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[44px]">
                      {bulkMode ? (
                        <Checkbox
                          checked={filteredCategories.length > 0 && selectedIds.size === filteredCategories.length}
                          onCheckedChange={(v) => selectAllVisible(!!v)}
                          aria-label="Select all"
                          disabled={!canEdit}
                        />
                      ) : null}
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Spent (mo)</TableHead>
                    <TableHead className="text-right">Spent (YTD)</TableHead>
                    <TableHead className="w-[44px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoriesToRender.map((category) => {
                    const isArchived = !!category.is_archived;
                    if (!isReorderMode || isArchived) {
                      // Regular non-sortable row
                      const spent = monthlySpending[category.id] ?? 0;
                      const ytd = ytdSpending[category.id] ?? 0;
                      const type = category.category_type || 'monthly_expense';
                      const archiveDisabled = !canArchiveCategory(category);

                      return (
                        <TableRow key={category.id} className={isArchived ? 'opacity-70' : ''}>
                          <TableCell className="w-[44px]">
                            {bulkMode ? (
                            <Checkbox
                              checked={selectedIds.has(category.id)}
                              onClick={(e) => {
                                const checked = !selectedIds.has(category.id);
                                handleCheckboxClick(category.id, e, checked);
                              }}
                              onCheckedChange={() => {}} // Required for controlled checkbox
                              aria-label="Select category"
                              disabled={!canEdit}
                            />
                            ) : null}
                          </TableCell>
                          <TableCell className="max-w-[260px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <Link href={`/categories/${category.id}`} className="hover:underline truncate font-medium">
                                {category.name}
                              </Link>
                              {isArchived && <Badge variant="secondary">Archived</Badge>}
                              {category.is_system && <Badge variant="outline">System</Badge>}
                              {category.is_buffer && <Badge variant="outline">Buffer</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {categoryTypesEnabled ? (
                              <span className="text-sm text-muted-foreground">{type.replace('_', ' ')}</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              if (type === 'monthly_expense') {
                                return formatCurrency(category.monthly_amount ?? 0);
                              } else if (type === 'accumulation') {
                                return formatCurrency(category.annual_target ?? 0);
                              } else if (type === 'target_balance') {
                                return formatCurrency(category.target_balance ?? 0);
                              }
                              return formatCurrency(category.monthly_amount ?? 0);
                            })()}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(category.current_balance ?? 0)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(spent)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(ytd)}</TableCell>
                          <TableCell className="w-[44px]">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" disabled={!canEdit}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEdit(category)} disabled={!canEdit}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => confirmArchiveToggle(category)}
                                  disabled={!canEdit || archiveDisabled}
                                >
                                  {isArchived ? (
                                    <>
                                      <ArchiveRestore className="mr-2 h-4 w-4" />
                                      Restore
                                    </>
                                  ) : (
                                    <>
                                      <Archive className="mr-2 h-4 w-4" />
                                      Archive
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => confirmDelete(category)}
                                  className="text-red-600"
                                  disabled={!canEdit}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <SortableTableRow
                        key={category.id}
                        category={category}
                        disabled={!canEdit || bulkMode}
                        categoryTypesEnabled={categoryTypesEnabled}
                        monthlySpending={monthlySpending}
                        ytdSpending={ytdSpending}
                        canEdit={canEdit}
                        onEdit={startEdit}
                        onArchiveToggle={confirmArchiveToggle}
                        onDelete={confirmDelete}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          setEditingCategory(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{isEditDialogOpen ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {isEditDialogOpen
                ? 'Update details for this category.'
                : 'Create a new category to organize your budget.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Name</label>
              </div>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Groceries" />
            </div>

            {categoryTypesEnabled && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Category type</label>
                  <HelpTooltip content="Category type controls how targets and progress are interpreted. Monthly expense is most common." />
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
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Monthly amount</label>
                  <HelpTooltip content="The default monthly amount used for budgeting and summaries." />
                </div>
                <Input value={newMonthlyAmount} onChange={(e) => setNewMonthlyAmount(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Current balance</label>
                  <HelpTooltip content="How much money is currently in this category/envelope." />
                </div>
                <Input value={newBalance} onChange={(e) => setNewBalance(e.target.value)} />
              </div>
            </div>

            {categoryTypesEnabled && newCategoryType === 'accumulation' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Annual target</label>
                  <HelpTooltip content="For accumulation categories, the annual target determines the suggested monthly amount (annual / 12)." />
                </div>
                <Input value={newAnnualTarget} onChange={(e) => setNewAnnualTarget(e.target.value)} placeholder="e.g. 1200" />
              </div>
            )}

            {categoryTypesEnabled && newCategoryType === 'target_balance' && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Target balance</label>
                  <HelpTooltip content="For target balance categories, this is the amount you want to keep in the envelope." />
                </div>
                <Input value={newTargetBalance} onChange={(e) => setNewTargetBalance(e.target.value)} placeholder="e.g. 2000" />
              </div>
            )}

            {prioritySystemEnabled && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Priority</label>
                  <HelpTooltip content="Higher priority categories (1 is highest) are funded first when using smart allocation." />
                  <span className="text-xs text-muted-foreground">({newPriority})</span>
                </div>
                <Slider value={[newPriority]} min={1} max={10} step={1} onValueChange={(v) => setNewPriority(v[0] ?? 5)} />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Notes</label>
                <HelpTooltip content="Optional notes to remind you how this category should be used." />
              </div>
              <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional…" />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={newIsSystem} onCheckedChange={(v) => setNewIsSystem(!!v)} id="is-system" disabled={!canEdit} />
              <label htmlFor="is-system" className="text-sm text-muted-foreground">
                System category (advanced)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  setEditingCategory(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={isEditDialogOpen ? handleSaveCategory : handleAddCategory} disabled={!canEdit}>
                {isEditDialogOpen ? 'Save' : 'Create'}
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
              This will permanently delete “{categoryToDelete?.name}”. If this category is used by existing transactions, consider archiving instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive confirmation */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {categoryToArchive?.is_archived ? 'Restore category?' : 'Archive category?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {categoryToArchive?.is_archived ? (
                <>This will make “{categoryToArchive?.name}” active again.</>
              ) : (
                <>
                  Archived categories are hidden from the dashboard and from category pickers by default, but remain available for reporting and history.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveToggle}>
              {categoryToArchive?.is_archived ? 'Restore' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected categories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} category{selectedIds.size === 1 ? '' : 'ies'}. If any are used by existing transactions, consider archiving instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

