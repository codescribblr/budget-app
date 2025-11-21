import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
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
import { formatCurrency } from '@/lib/utils';
import type { Category, DashboardSummary } from '@/lib/types';
import { toast } from 'sonner';
import { Check, X, Settings, GripVertical, Save } from 'lucide-react';
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

interface CategoryListProps {
  categories: Category[];
  summary: DashboardSummary | null;
  onUpdate: () => void;
}

interface SortableRowProps {
  category: Category;
  spent: number;
  budget: number;
  remaining: number;
  percentUsed: number;
  isReorderMode: boolean;
  editingBalanceId: number | null;
  editingBalanceValue: string;
  setEditingBalanceValue: (value: string) => void;
  startEditingBalance: (category: Category) => void;
  saveInlineBalance: (categoryId: number) => void;
  cancelEditingBalance: () => void;
  openEditDialog: (category: Category) => void;
  handleDeleteCategory: (category: Category) => void;
  getBudgetStatusColor: (percentUsed: number) => string;
  getProgressBarColor: (percentUsed: number) => string;
}

function SortableRow({
  category,
  spent,
  budget,
  remaining,
  percentUsed,
  isReorderMode,
  editingBalanceId,
  editingBalanceValue,
  setEditingBalanceValue,
  startEditingBalance,
  saveInlineBalance,
  cancelEditingBalance,
  openEditDialog,
  handleDeleteCategory,
  getBudgetStatusColor,
  getProgressBarColor,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id, disabled: !isReorderMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      {isReorderMode && (
        <TableCell className="w-[10%]">
          <div
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        </TableCell>
      )}
      <TableCell className="font-medium">
        <a
          href={`/reports?category=${category.id}`}
          className="hover:underline cursor-pointer"
        >
          {category.name}
        </a>
      </TableCell>
      <TableCell>
        {budget > 0 ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className={getBudgetStatusColor(percentUsed)}>
                {percentUsed.toFixed(0)}% used
              </span>
              <span className="text-muted-foreground">
                {formatCurrency(remaining)} left
              </span>
            </div>
            <div className="relative">
              <Progress
                value={Math.min(percentUsed, 100)}
                className="h-2"
              />
              <div
                className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressBarColor(percentUsed)}`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">No budget set</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {category.notes ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  {formatCurrency(category.monthly_amount)}*
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs whitespace-pre-wrap">{category.notes}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          formatCurrency(category.monthly_amount)
        )}
      </TableCell>
      <TableCell className="text-right font-semibold">
        {editingBalanceId === category.id ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              type="number"
              step="0.01"
              value={editingBalanceValue}
              onChange={(e) => setEditingBalanceValue(e.target.value)}
              className="w-28 h-8 text-right"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveInlineBalance(category.id);
                } else if (e.key === 'Escape') {
                  cancelEditingBalance();
                }
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => saveInlineBalance(category.id)}
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={cancelEditingBalance}
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <span
            className={`cursor-pointer hover:bg-muted px-2 py-1 rounded ${category.current_balance < 0 ? 'text-red-600' : ''}`}
            onClick={() => startEditingBalance(category)}
            title="Click to edit balance"
          >
            {formatCurrency(category.current_balance)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {!isReorderMode && (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(category)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteCategory(category)}
            >
              Delete
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function CategoryList({ categories, summary, onUpdate }: CategoryListProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newMonthlyAmount, setNewMonthlyAmount] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newIsSystem, setNewIsSystem] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Inline editing state
  const [editingBalanceId, setEditingBalanceId] = useState<number | null>(null);
  const [editingBalanceValue, setEditingBalanceValue] = useState('');

  // Monthly spending state
  const [monthlySpending, setMonthlySpending] = useState<Record<number, number>>({});
  const [loadingSpending, setLoadingSpending] = useState(true);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Reorder mode state
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderedCategories, setReorderedCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch monthly spending on mount and when categories change
  useEffect(() => {
    const fetchMonthlySpending = async () => {
      try {
        setLoadingSpending(true);
        const response = await fetch('/api/categories/monthly-spending');
        if (!response.ok) throw new Error('Failed to fetch monthly spending');
        const data = await response.json();
        setMonthlySpending(data);
      } catch (error) {
        console.error('Error fetching monthly spending:', error);
      } finally {
        setLoadingSpending(false);
      }
    };

    fetchMonthlySpending();
  }, [categories]);

  // Filter out system categories (like Transfer) from envelope display
  // Include goal categories in envelope list (they work like envelopes)
  const envelopeCategories = categories.filter(cat => !cat.is_system);

  const totalMonthly = envelopeCategories.reduce((sum, cat) => sum + cat.monthly_amount, 0);
  const totalCurrent = envelopeCategories.reduce((sum, cat) => sum + cat.current_balance, 0);
  const hasNegativeBalance = envelopeCategories.some(cat => cat.current_balance < 0);

  // Helper function to get budget status color
  const getBudgetStatusColor = (percentUsed: number) => {
    if (percentUsed >= 100) return 'text-red-600'; // Critical (over budget)
    if (percentUsed >= 90) return 'text-red-500'; // Red (90-100%)
    if (percentUsed >= 70) return 'text-yellow-600'; // Yellow (70-90%)
    return 'text-green-600'; // Green (<70%)
  };

  // Helper function to get progress bar color
  const getProgressBarColor = (percentUsed: number) => {
    if (percentUsed >= 100) return 'bg-red-600'; // Critical
    if (percentUsed >= 90) return 'bg-red-500'; // Red
    if (percentUsed >= 70) return 'bg-yellow-500'; // Yellow
    return 'bg-green-600'; // Green
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    try {
      await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          monthly_amount: parseFloat(newMonthlyAmount) || 0,
          current_balance: parseFloat(newBalance),
          notes: newNotes || null,
          is_system: newIsSystem,
        }),
      });

      setIsEditDialogOpen(false);
      setEditingCategory(null);
      setNewName('');
      setNewMonthlyAmount('');
      setNewBalance('');
      setNewNotes('');
      setNewIsSystem(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newName.trim()) {
      alert('Please enter a category name');
      return;
    }

    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          monthly_amount: parseFloat(newMonthlyAmount) || 0,
          current_balance: parseFloat(newBalance) || 0,
          notes: newNotes || null,
          is_system: newIsSystem,
        }),
      });

      setIsAddDialogOpen(false);
      setNewName('');
      setNewMonthlyAmount('');
      setNewBalance('');
      setNewNotes('');
      setNewIsSystem(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    if (category.is_system) {
      toast.error('System categories cannot be deleted.');
      return;
    }
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete category');
      toast.success('Category deleted');
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      onUpdate();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setNewName(category.name);
    setNewMonthlyAmount(category.monthly_amount.toString());
    setNewBalance(category.current_balance.toString());
    setNewNotes(category.notes || '');
    setNewIsSystem(category.is_system);
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setNewName('');
    setNewMonthlyAmount('');
    setNewBalance('0');
    setNewNotes('');
    setNewIsSystem(false);
    setIsAddDialogOpen(true);
  };

  // Inline balance editing handlers
  const startEditingBalance = (category: Category) => {
    setEditingBalanceId(category.id);
    setEditingBalanceValue(category.current_balance.toString());
  };

  const cancelEditingBalance = () => {
    setEditingBalanceId(null);
    setEditingBalanceValue('');
  };

  const saveInlineBalance = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_balance: parseFloat(editingBalanceValue) || 0,
        }),
      });

      if (!response.ok) throw new Error('Failed to update balance');

      toast.success('Balance updated');
      setEditingBalanceId(null);
      setEditingBalanceValue('');
      onUpdate();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('Failed to update balance');
    }
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle reorder mode
  const handleEnterReorderMode = () => {
    setIsReorderMode(true);
    setReorderedCategories([...envelopeCategories]);
  };

  const handleCancelReorder = () => {
    setIsReorderMode(false);
    setReorderedCategories([]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setReorderedCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveReorder = async () => {
    try {
      setIsSaving(true);

      // Create array of category IDs with new sort_order
      const categoryOrders = reorderedCategories.map((category, index) => ({
        id: category.id,
        sort_order: index,
      }));

      const response = await fetch('/api/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryOrders }),
      });

      if (!response.ok) throw new Error('Failed to save category order');

      toast.success('Category order saved');
      setIsReorderMode(false);
      setReorderedCategories([]);
      onUpdate();
    } catch (error) {
      console.error('Error saving category order:', error);
      toast.error('Failed to save category order');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Action Buttons */}
        <div className="mb-3 flex gap-2 justify-between">
          <Button onClick={openAddDialog} size="sm" disabled={isReorderMode}>
            Add Category
          </Button>

          {!isReorderMode ? (
            <Button
              onClick={handleEnterReorderMode}
              size="sm"
              variant="outline"
              disabled={envelopeCategories.length <= 1}
            >
              <GripVertical className="mr-2 h-4 w-4" />
              Reorder
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleSaveReorder}
                size="sm"
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={handleCancelReorder}
                size="sm"
                variant="outline"
                disabled={isSaving}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable categories section */}
        <div className="flex-1 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={(isReorderMode ? reorderedCategories : envelopeCategories).map(c => c.id)}
              strategy={verticalListSortingStrategy}
              disabled={!isReorderMode}
            >
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    {isReorderMode && <TableHead className="w-[10%]"></TableHead>}
                    <TableHead className={isReorderMode ? "w-[25%]" : "w-[30%]"}>Category</TableHead>
                    <TableHead className={isReorderMode ? "w-[25%]" : "w-[30%]"}>Budget Progress</TableHead>
                    <TableHead className="text-right w-[15%]">Monthly</TableHead>
                    <TableHead className="text-right w-[15%]">Balance</TableHead>
                    <TableHead className="text-right w-[10%]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(isReorderMode ? reorderedCategories : envelopeCategories).map((category) => {
                    const spent = monthlySpending[category.id] || 0;
                    const budget = category.monthly_amount;
                    const remaining = budget - spent;
                    const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;

                    return (
                      <SortableRow
                        key={category.id}
                        category={category}
                        spent={spent}
                        budget={budget}
                        remaining={remaining}
                        percentUsed={percentUsed}
                        isReorderMode={isReorderMode}
                        editingBalanceId={editingBalanceId}
                        editingBalanceValue={editingBalanceValue}
                        setEditingBalanceValue={setEditingBalanceValue}
                        startEditingBalance={startEditingBalance}
                        saveInlineBalance={saveInlineBalance}
                        cancelEditingBalance={cancelEditingBalance}
                        openEditDialog={openEditDialog}
                        handleDeleteCategory={handleDeleteCategory}
                        getBudgetStatusColor={getBudgetStatusColor}
                        getProgressBarColor={getProgressBarColor}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </SortableContext>
          </DndContext>
        </div>

        {/* Fixed totals row at bottom */}
        <div className="border-t bg-muted/50">
          <Table>
            <TableBody>
              <TableRow className="font-bold">
                {isReorderMode && <TableCell className="w-[10%]"></TableCell>}
                <TableCell className={isReorderMode ? "w-[25%]" : "w-[30%]"}>Total Budget</TableCell>
                <TableCell className={isReorderMode ? "w-[25%]" : "w-[30%]"}></TableCell>
                <TableCell className={`text-right w-[15%] ${summary && totalMonthly > summary.monthly_net_income ? 'text-red-600' : ''}`}>
                  {formatCurrency(totalMonthly)}
                </TableCell>
                <TableCell className={`text-right w-[15%] ${hasNegativeBalance ? 'text-red-600' : ''}`}>
                  {formatCurrency(totalCurrent)}
                </TableCell>
                <TableCell className="text-right w-[10%]"></TableCell>
              </TableRow>
              {summary && (
                <TableRow className="font-medium text-muted-foreground">
                  {isReorderMode && <TableCell className="w-[10%]"></TableCell>}
                  <TableCell className={isReorderMode ? "w-[25%]" : "w-[30%]"}>Available to be budgeted</TableCell>
                  <TableCell className={isReorderMode ? "w-[25%]" : "w-[30%]"}></TableCell>
                  <TableCell className={`text-right w-[15%] ${summary.monthly_net_income - totalMonthly < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(summary.monthly_net_income)}
                  </TableCell>
                  <TableCell className="text-right w-[15%]"></TableCell>
                  <TableCell className="text-right w-[10%]"></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Category Name</label>
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Monthly Budget Amount</label>
              <Input
                type="number"
                step="0.01"
                value={newMonthlyAmount}
                onChange={(e) => setNewMonthlyAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used by "Use Monthly Amounts" button when allocating to envelopes
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Current Balance</label>
              <Input
                type="number"
                step="0.01"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g., car repairs = 900 for tires for 4 cars over 4 years, 60 for oil changes for 3 cars 3x per year, 100 for other repairs all /12 months"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional notes to track budget formulas or other information
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-is-system"
                checked={newIsSystem}
                onCheckedChange={(checked) => setNewIsSystem(checked === true)}
              />
              <label
                htmlFor="edit-is-system"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                System Category (hidden from envelope list, available in dropdowns)
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateCategory}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Category Name</label>
              <Input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Groceries"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Monthly Budget Amount</label>
              <Input
                type="number"
                step="0.01"
                value={newMonthlyAmount}
                onChange={(e) => setNewMonthlyAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used by "Use Monthly Amounts" button when allocating to envelopes
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Starting Balance</label>
              <Input
                type="number"
                step="0.01"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="e.g., car repairs = 900 for tires for 4 cars over 4 years, 60 for oil changes for 3 cars 3x per year, 100 for other repairs all /12 months"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional notes to track budget formulas or other information
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-is-system"
                checked={newIsSystem}
                onCheckedChange={(checked) => setNewIsSystem(checked === true)}
              />
              <label
                htmlFor="add-is-system"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                System Category (hidden from envelope list, available in dropdowns)
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCategory}>Add Category</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{categoryToDelete?.name}"</strong>?
              <p className="mt-2 text-sm text-muted-foreground">
                This will also delete all transactions associated with this category.
              </p>
              <p className="mt-2 text-destructive font-semibold">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setCategoryToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

