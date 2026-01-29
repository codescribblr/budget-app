import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { formatCurrency } from '@/lib/utils';
import type { Account } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { Check, X, MoreVertical, Edit, Trash2, Wallet, PiggyBank, Banknote } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AccountListProps {
  accounts: Account[];
  onUpdate: (updatedAccounts: Account[]) => void;
  onUpdateSummary?: () => void;
  disabled?: boolean;
}

export default function AccountList({ accounts, onUpdate, onUpdateSummary, disabled = false }: AccountListProps) {
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountName, setAccountName] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [accountType, setAccountType] = useState<'checking' | 'savings' | 'cash'>('checking');
  const [includeInTotals, setIncludeInTotals] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Inline editing state
  const [editingBalanceId, setEditingBalanceId] = useState<number | null>(null);
  const [editingBalanceValue, setEditingBalanceValue] = useState('');

  const handleUpdateAccount = async () => {
    if (!editingAccount) return;

    // Optimistic update
    const updatedAccount: Account = {
      ...editingAccount,
      balance: parseFloat(newBalance),
      account_type: accountType,
      include_in_totals: includeInTotals,
    };
    const updatedAccounts = accounts.map(acc => 
      acc.id === editingAccount.id ? updatedAccount : acc
    );
    onUpdate(updatedAccounts);
    setIsEditDialogOpen(false);
    setEditingAccount(null);
    setAccountName('');
    setNewBalance('');
    setAccountType('checking');
    setIncludeInTotals(true);

    try {
      const response = await fetch(`/api/accounts/${editingAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balance: parseFloat(newBalance),
          account_type: accountType,
          include_in_totals: includeInTotals,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update account');
      }

      if (onUpdateSummary) onUpdateSummary();
    } catch (error) {
      // Revert on error
      onUpdate(accounts);
      console.error('Error updating account:', error);
      toast.error('Failed to update account');
    }
  };

  const handleAddAccount = async () => {
    if (!accountName.trim()) {
      alert('Please enter an account name');
      return;
    }

    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountName,
          balance: parseFloat(newBalance) || 0,
          account_type: accountType,
          include_in_totals: includeInTotals,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add account');
      }

      const newAccount = await response.json();
      const updatedAccounts = [...accounts, newAccount];
      onUpdate(updatedAccounts);
      if (onUpdateSummary) onUpdateSummary();

      setIsAddDialogOpen(false);
      setAccountName('');
      setNewBalance('');
      setAccountType('checking');
      setIncludeInTotals(true);
    } catch (error) {
      console.error('Error adding account:', error);
      toast.error('Failed to add account');
    }
  };

  const handleDeleteAccount = (account: Account) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;

    // Optimistic update
    const updatedAccounts = accounts.filter(acc => acc.id !== accountToDelete.id);
    onUpdate(updatedAccounts);

    try {
      const response = await fetch(`/api/accounts/${accountToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to delete account');
        throw new Error(errorMessage || 'Failed to delete account');
      }
      toast.success('Account deleted');
      if (onUpdateSummary) onUpdateSummary();
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    } catch (error) {
      // Revert on error
      onUpdate(accounts);
      console.error('Error deleting account:', error);
      // Error toast already shown above
    }
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setAccountName(account.name);
    setNewBalance(account.balance.toString());
    setAccountType(account.account_type);
    setIncludeInTotals(account.include_in_totals);
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setAccountName('');
    setNewBalance('0');
    setAccountType('checking');
    setIncludeInTotals(true);
    setIsAddDialogOpen(true);
  };

  // Inline balance editing handlers
  const startEditingBalance = (account: Account) => {
    setEditingBalanceId(account.id);
    setEditingBalanceValue(account.balance.toString());
  };

  const cancelEditingBalance = () => {
    setEditingBalanceId(null);
    setEditingBalanceValue('');
  };

  const saveInlineBalance = async (accountId: number) => {
    const newBalance = parseFloat(editingBalanceValue) || 0;
    
    // Optimistic update
    const updatedAccounts = accounts.map(acc => 
      acc.id === accountId ? { ...acc, balance: newBalance } : acc
    );
    onUpdate(updatedAccounts);
    setEditingBalanceId(null);
    setEditingBalanceValue('');

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balance: newBalance,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to update balance');
        throw new Error(errorMessage || 'Failed to update balance');
      }

      toast.success('Balance updated');
      if (onUpdateSummary) onUpdateSummary();
    } catch (error) {
      // Revert on error
      onUpdate(accounts);
      setEditingBalanceId(accountId);
      setEditingBalanceValue(newBalance.toString());
      console.error('Error updating balance:', error);
      // Error toast already shown above
    }
  };

  const totalBalance = Array.isArray(accounts) ? accounts.reduce((sum, acc) => sum + acc.balance, 0) : 0;

  const getAccountTypeIcon = (type: 'checking' | 'savings' | 'cash') => {
    switch (type) {
      case 'checking':
        return <Wallet className="h-4 w-4" />;
      case 'savings':
        return <PiggyBank className="h-4 w-4" />;
      case 'cash':
        return <Banknote className="h-4 w-4" />;
    }
  };

  const getAccountTypeLabel = (type: 'checking' | 'savings' | 'cash') => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <Button onClick={openAddDialog} size="sm" disabled={disabled}>
          Add Account
        </Button>
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-semibold">{formatCurrency(totalBalance)}</span>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-muted-foreground cursor-help">
                        {getAccountTypeIcon(account.account_type)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{getAccountTypeLabel(account.account_type)}</p>
                    </TooltipContent>
                  </Tooltip>
                  <span className="font-medium">{account.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {editingBalanceId === account.id ? (
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
                          saveInlineBalance(account.id);
                        } else if (e.key === 'Escape') {
                          cancelEditingBalance();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => saveInlineBalance(account.id)}
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
                    onClick={() => startEditingBalance(account)}
                  >
                    {formatCurrency(account.balance)}
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
                    <DropdownMenuItem onClick={() => openEditDialog(account)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteAccount(account)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingAccount?.name}</DialogTitle>
            <DialogDescription>
              Update the account balance and settings.
            </DialogDescription>
          </DialogHeader>
          <div 
            className="space-y-4 pt-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUpdateAccount();
              }
            }}
          >
            <div>
              <Label htmlFor="balance">Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="account-type-edit">Account Type</Label>
              <Select value={accountType} onValueChange={(value: 'checking' | 'savings' | 'cash') => setAccountType(value)}>
                <SelectTrigger id="account-type-edit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include-in-totals"
                checked={includeInTotals}
                onChange={(e) => setIncludeInTotals(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="include-in-totals" className="cursor-pointer">
                Include in totals calculation
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateAccount}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Account</DialogTitle>
            <DialogDescription>
              Add a new bank account to track your finances.
            </DialogDescription>
          </DialogHeader>
          <div 
            className="space-y-4 pt-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (accountName.trim()) {
                  handleAddAccount();
                }
              }
            }}
          >
            <div>
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="e.g., Checking Account"
              />
            </div>
            <div>
              <Label htmlFor="balance-add">Starting Balance</Label>
              <Input
                id="balance-add"
                type="number"
                step="0.01"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="account-type-add">Account Type</Label>
              <Select value={accountType} onValueChange={(value: 'checking' | 'savings' | 'cash') => setAccountType(value)}>
                <SelectTrigger id="account-type-add">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include-in-totals-add"
                checked={includeInTotals}
                onChange={(e) => setIncludeInTotals(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="include-in-totals-add" className="cursor-pointer">
                Include in totals calculation
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAccount}>Add Account</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Are you sure you want to delete <strong>"{accountToDelete?.name}"</strong>?
                <div className="mt-2 text-sm text-muted-foreground">
                  Current balance: {accountToDelete && formatCurrency(accountToDelete.balance)}
                </div>
                <div className="mt-2 text-destructive font-semibold">
                  This action cannot be undone.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setAccountToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}


