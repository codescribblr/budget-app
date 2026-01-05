'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { PreTaxDeductionItem } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';

type PayFrequency = 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'quarterly' | 'annually';

interface PreTaxDeductionsSectionProps {
  items: PreTaxDeductionItem[];
  annualIncome: number;
  payFrequency: PayFrequency;
  includeExtraPaychecks: boolean;
  onChange: (items: PreTaxDeductionItem[]) => void;
  disabled?: boolean;
}

export default function PreTaxDeductionsSection({
  items,
  annualIncome,
  payFrequency,
  includeExtraPaychecks,
  onChange,
  disabled = false,
}: PreTaxDeductionsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PreTaxDeductionItem | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'fixed' as 'percentage' | 'fixed',
    value: 0,
  });

  // Calculate paychecks per month based on pay frequency
  const getPaychecksPerMonth = (): number => {
    switch (payFrequency) {
      case 'weekly':
        return 52 / 12; // 4.33
      case 'bi-weekly':
        return includeExtraPaychecks ? 26 / 12 : 24 / 12; // 2.17 or 2.0
      case 'semi-monthly':
        return 2;
      case 'monthly':
        return 1;
      case 'quarterly':
        return 4 / 12; // 0.33
      case 'annually':
        return 1 / 12; // 0.083
      default:
        return 1;
    }
  };

  // Calculate actual paychecks per year (for percentage calculations)
  const getActualPaychecksPerYear = (): number => {
    switch (payFrequency) {
      case 'weekly':
        return 52;
      case 'bi-weekly':
        return 26;
      case 'semi-monthly':
        return 24;
      case 'monthly':
        return 12;
      case 'quarterly':
        return 4;
      case 'annually':
        return 1;
      default:
        return 12;
    }
  };

  // Calculate monthly amount for a deduction item
  const calculateMonthlyAmount = (item: PreTaxDeductionItem): number => {
    const paychecksPerMonth = getPaychecksPerMonth();
    
    if (item.type === 'fixed') {
      // Fixed amount per paycheck
      return item.value * paychecksPerMonth;
    } else {
      // Percentage of gross paycheck
      const actualPaychecksPerYear = getActualPaychecksPerYear();
      const grossPerPaycheck = annualIncome / actualPaychecksPerYear;
      const deductionPerPaycheck = grossPerPaycheck * (item.value / 100);
      return deductionPerPaycheck * paychecksPerMonth;
    }
  };

  // Calculate total monthly pre-tax deductions
  const totalMonthly = items.reduce((sum, item) => sum + calculateMonthlyAmount(item), 0);

  const handleOpenDialog = (item?: PreTaxDeductionItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        type: item.type,
        value: item.value,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        type: 'fixed',
        value: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      type: 'fixed',
      value: 0,
    });
  };

  const saveToDatabase = async (updatedItems: PreTaxDeductionItem[]) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: [
            { key: 'pre_tax_deduction_items', value: JSON.stringify(updatedItems) }
          ]
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to save pre-tax deductions');
        throw new Error(errorMessage || 'Failed to save pre-tax deductions');
      }

      toast.success('Pre-tax deductions saved');
      return true;
    } catch (error) {
      console.error('Error saving pre-tax deductions:', error);
      // Error toast already shown by handleApiError
      return false;
    }
  };

  const handleSave = async () => {
    if (!formData.name || formData.value <= 0) {
      return;
    }

    let updatedItems: PreTaxDeductionItem[];

    if (editingItem) {
      // Update existing item
      updatedItems = items.map(item =>
        item.id === editingItem.id
          ? { ...item, name: formData.name, type: formData.type, value: formData.value }
          : item
      );
    } else {
      // Add new item
      const newItem: PreTaxDeductionItem = {
        id: crypto.randomUUID(),
        name: formData.name,
        type: formData.type,
        value: formData.value,
      };
      updatedItems = [...items, newItem];
    }

    // Save to database
    const saved = await saveToDatabase(updatedItems);

    if (saved) {
      // Update parent state
      onChange(updatedItems);
      handleCloseDialog();
    }
  };

  const handleDelete = async (id: string) => {
    const updatedItems = items.filter(item => item.id !== id);

    // Save to database
    const saved = await saveToDatabase(updatedItems);

    if (saved) {
      // Update parent state
      onChange(updatedItems);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pre-Tax Deductions</CardTitle>
              <CardDescription>
                Enter amounts per paycheck. Total monthly: {formatCurrency(totalMonthly)}
              </CardDescription>
            </div>
            <Button 
              onClick={() => handleOpenDialog()} 
              size="sm"
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Deduction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pre-tax deductions configured. Click "Add Deduction" to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Per Paycheck</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {item.type === 'percentage' ? `${item.value}%` : 'Fixed'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.type === 'percentage'
                        ? `${item.value}%`
                        : formatCurrency(item.value)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(calculateMonthlyAmount(item))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(item)}
                          disabled={disabled}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={disabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalMonthly)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Pre-Tax Deduction' : 'Add Pre-Tax Deduction'}
            </DialogTitle>
            <DialogDescription>
              Enter the amount deducted per paycheck. For percentages, enter the percentage of gross pay.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., 401k, Health Insurance"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'percentage' | 'fixed') =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">
                {formData.type === 'percentage' ? 'Percentage' : 'Amount Per Paycheck'}
              </Label>
              <Input
                id="value"
                type="number"
                step={formData.type === 'percentage' ? '0.01' : '0.01'}
                placeholder={formData.type === 'percentage' ? 'e.g., 10 for 10%' : 'e.g., 125.00'}
                value={formData.value || ''}
                onChange={(e) =>
                  setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })
                }
              />
              {formData.type === 'percentage' && (
                <p className="text-xs text-muted-foreground">
                  Enter as a number (e.g., 10 for 10%)
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name || formData.value <= 0 || disabled}
            >
              {editingItem ? 'Save Changes' : 'Add Deduction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


