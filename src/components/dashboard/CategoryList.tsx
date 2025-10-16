import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import type { Category } from '@/lib/types';

interface CategoryListProps {
  categories: Category[];
  onUpdate: () => void;
}

export default function CategoryList({ categories, onUpdate }: CategoryListProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newName, setNewName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newMonthlyAmount, setNewMonthlyAmount] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Filter out system categories (like Transfer) from envelope display
  const envelopeCategories = categories.filter(cat => !cat.is_system);

  const totalMonthly = envelopeCategories.reduce((sum, cat) => sum + cat.monthly_amount, 0);
  const totalCurrent = envelopeCategories.reduce((sum, cat) => sum + cat.current_balance, 0);

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
        }),
      });

      setIsEditDialogOpen(false);
      setEditingCategory(null);
      setNewName('');
      setNewMonthlyAmount('');
      setNewBalance('');
      setNewNotes('');
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
        }),
      });

      setIsAddDialogOpen(false);
      setNewName('');
      setNewMonthlyAmount('');
      setNewBalance('');
      setNewNotes('');
      onUpdate();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (category.is_system) {
      alert('System categories cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"? This will also delete all transactions associated with this category.`)) {
      return;
    }

    try {
      await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const openEditDialog = (category: Category) => {
    if (category.is_system) {
      alert('System categories cannot be edited.');
      return;
    }

    setEditingCategory(category);
    setNewName(category.name);
    setNewMonthlyAmount(category.monthly_amount.toString());
    setNewBalance(category.current_balance.toString());
    setNewNotes(category.notes || '');
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setNewName('');
    setNewMonthlyAmount('');
    setNewBalance('0');
    setNewNotes('');
    setIsAddDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Add Category Button */}
        <div className="mb-3">
          <Button onClick={openAddDialog} size="sm">
            Add Category
          </Button>
        </div>

        {/* Scrollable categories section */}
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Monthly</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envelopeCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(category.monthly_amount)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(category.current_balance)}
                  </TableCell>
                  <TableCell className="text-right">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Fixed totals row at bottom */}
        <div className="border-t bg-muted/50">
          <Table>
            <TableBody>
              <TableRow className="font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatCurrency(totalMonthly)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totalCurrent)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCategory}>Add Category</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

