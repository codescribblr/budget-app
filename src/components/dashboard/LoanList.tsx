import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '@/lib/utils';
import type { Loan } from '@/lib/types';
import { toast } from 'sonner';
import { Check, X, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { parseLocalDate, formatLocalDate } from '@/lib/date-utils';

interface LoanListProps {
  loans: Loan[];
  onUpdate: () => void;
}

export default function LoanList({ loans, onUpdate }: LoanListProps) {
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [loanName, setLoanName] = useState('');
  const [balance, setBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [openDate, setOpenDate] = useState<Date | undefined>(undefined);
  const [startingBalance, setStartingBalance] = useState('');
  const [institution, setInstitution] = useState('');
  const [includeInNetWorth, setIncludeInNetWorth] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);

  // Inline editing state
  const [editingBalanceId, setEditingBalanceId] = useState<number | null>(null);
  const [editingBalanceValue, setEditingBalanceValue] = useState('');

  const resetForm = () => {
    setLoanName('');
    setBalance('');
    setInterestRate('');
    setMinimumPayment('');
    setPaymentDueDate('');
    setOpenDate(undefined);
    setStartingBalance('');
    setInstitution('');
    setIncludeInNetWorth(true);
  };

  const handleUpdateLoan = async () => {
    if (!editingLoan) return;

    try {
      await fetch(`/api/loans/${editingLoan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loanName,
          balance: parseFloat(balance),
          interest_rate: interestRate ? parseFloat(interestRate) : null,
          minimum_payment: minimumPayment ? parseFloat(minimumPayment) : null,
          payment_due_date: paymentDueDate ? parseInt(paymentDueDate) : null,
          open_date: openDate ? formatLocalDate(openDate) : null,
          starting_balance: startingBalance ? parseFloat(startingBalance) : null,
          institution: institution || null,
          include_in_net_worth: includeInNetWorth,
        }),
      });

      setIsEditDialogOpen(false);
      setEditingLoan(null);
      resetForm();
      toast.success('Loan updated');
      onUpdate();
    } catch (error) {
      console.error('Error updating loan:', error);
      toast.error('Failed to update loan');
    }
  };

  const handleAddLoan = async () => {
    if (!loanName.trim()) {
      toast.error('Please enter a loan name');
      return;
    }

    try {
      await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loanName,
          balance: parseFloat(balance) || 0,
          interest_rate: interestRate ? parseFloat(interestRate) : undefined,
          minimum_payment: minimumPayment ? parseFloat(minimumPayment) : undefined,
          payment_due_date: paymentDueDate ? parseInt(paymentDueDate) : undefined,
          open_date: openDate ? formatLocalDate(openDate) : undefined,
          starting_balance: startingBalance ? parseFloat(startingBalance) : undefined,
          institution: institution || undefined,
          include_in_net_worth: includeInNetWorth,
        }),
      });

      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Loan added');
      onUpdate();
    } catch (error) {
      console.error('Error adding loan:', error);
      toast.error('Failed to add loan');
    }
  };

  const handleDeleteLoan = (loan: Loan) => {
    setLoanToDelete(loan);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteLoan = async () => {
    if (!loanToDelete) return;

    try {
      const response = await fetch(`/api/loans/${loanToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete loan');
      toast.success('Loan deleted');
      setDeleteDialogOpen(false);
      setLoanToDelete(null);
      onUpdate();
    } catch (error) {
      console.error('Error deleting loan:', error);
      toast.error('Failed to delete loan');
    }
  };

  const openEditDialog = (loan: Loan) => {
    setEditingLoan(loan);
    setLoanName(loan.name);
    setBalance(loan.balance.toString());
    setInterestRate(loan.interest_rate?.toString() || '');
    setMinimumPayment(loan.minimum_payment?.toString() || '');
    setPaymentDueDate(loan.payment_due_date?.toString() || '');
    setOpenDate(parseLocalDate(loan.open_date));
    setStartingBalance(loan.starting_balance?.toString() || '');
    setInstitution(loan.institution || '');
    setIncludeInNetWorth(loan.include_in_net_worth);
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setBalance('0');
    setIsAddDialogOpen(true);
  };

  // Inline balance editing handlers
  const startEditingBalance = (loan: Loan) => {
    setEditingBalanceId(loan.id);
    setEditingBalanceValue(loan.balance.toString());
  };

  const cancelEditingBalance = () => {
    setEditingBalanceId(null);
    setEditingBalanceValue('');
  };

  const saveInlineBalance = async (loanId: number) => {
    try {
      const response = await fetch(`/api/loans/${loanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balance: parseFloat(editingBalanceValue) || 0,
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

  const totalBalance = loans.reduce((sum, loan) => sum + loan.balance, 0);

  return (
    <>
      <div className="mb-3">
        <Button onClick={openAddDialog} size="sm">
          Add Loan
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Loan</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loans.map((loan) => (
            <TableRow key={loan.id}>
              <TableCell className="font-medium">{loan.name}</TableCell>
              <TableCell className="text-right font-semibold">
                {editingBalanceId === loan.id ? (
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
                          saveInlineBalance(loan.id);
                        } else if (e.key === 'Escape') {
                          cancelEditingBalance();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => saveInlineBalance(loan.id)}
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
                    className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                    onClick={() => startEditingBalance(loan)}
                  >
                    {formatCurrency(loan.balance)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(loan)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteLoan(loan)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/50">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">{formatCurrency(totalBalance)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-loan-name">Name *</Label>
              <Input
                id="edit-loan-name"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder="e.g., Student Loan"
              />
            </div>
            <div>
              <Label htmlFor="edit-balance">Balance *</Label>
              <Input
                id="edit-balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-interest-rate">Interest Rate (%)</Label>
              <Input
                id="edit-interest-rate"
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="e.g., 5.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-minimum-payment">Minimum Payment ($)</Label>
              <Input
                id="edit-minimum-payment"
                type="number"
                step="0.01"
                value={minimumPayment}
                onChange={(e) => setMinimumPayment(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-payment-due-date">Payment Due Date (day of month)</Label>
              <Input
                id="edit-payment-due-date"
                type="number"
                min="1"
                max="31"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
                placeholder="e.g., 15"
              />
            </div>
            <div>
              <Label htmlFor="edit-open-date">Open Date</Label>
              <DatePicker
                id="edit-open-date"
                date={openDate}
                onDateChange={setOpenDate}
                placeholder="Select open date"
              />
            </div>
            <div>
              <Label htmlFor="edit-starting-balance">Starting Balance ($)</Label>
              <Input
                id="edit-starting-balance"
                type="number"
                step="0.01"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="edit-institution">Institution</Label>
              <Input
                id="edit-institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g., Bank of America"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-include-in-net-worth"
                checked={includeInNetWorth}
                onCheckedChange={(checked) => setIncludeInNetWorth(checked as boolean)}
              />
              <Label htmlFor="edit-include-in-net-worth" className="text-sm font-normal">
                Include in net worth calculations
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLoan}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Loan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="add-loan-name">Name *</Label>
              <Input
                id="add-loan-name"
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder="e.g., Student Loan"
              />
            </div>
            <div>
              <Label htmlFor="add-balance">Balance *</Label>
              <Input
                id="add-balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="add-interest-rate">Interest Rate (%)</Label>
              <Input
                id="add-interest-rate"
                type="number"
                step="0.01"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="e.g., 5.5"
              />
            </div>
            <div>
              <Label htmlFor="add-minimum-payment">Minimum Payment ($)</Label>
              <Input
                id="add-minimum-payment"
                type="number"
                step="0.01"
                value={minimumPayment}
                onChange={(e) => setMinimumPayment(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="add-payment-due-date">Payment Due Date (day of month)</Label>
              <Input
                id="add-payment-due-date"
                type="number"
                min="1"
                max="31"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
                placeholder="e.g., 15"
              />
            </div>
            <div>
              <Label htmlFor="add-open-date">Open Date</Label>
              <DatePicker
                id="add-open-date"
                date={openDate}
                onDateChange={setOpenDate}
                placeholder="Select open date"
              />
            </div>
            <div>
              <Label htmlFor="add-starting-balance">Starting Balance ($)</Label>
              <Input
                id="add-starting-balance"
                type="number"
                step="0.01"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="add-institution">Institution</Label>
              <Input
                id="add-institution"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g., Bank of America"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="add-include-in-net-worth"
                checked={includeInNetWorth}
                onCheckedChange={(checked) => setIncludeInNetWorth(checked as boolean)}
              />
              <Label htmlFor="add-include-in-net-worth" className="text-sm font-normal">
                Include in net worth calculations
              </Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddLoan}>Add Loan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{loanToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteLoan}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

