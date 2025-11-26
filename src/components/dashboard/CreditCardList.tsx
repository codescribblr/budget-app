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
import type { CreditCard } from '@/lib/types';
import { toast } from 'sonner';
import { Check, X, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { handleApiError } from '@/lib/api-error-handler';

interface CreditCardListProps {
  creditCards: CreditCard[];
  onUpdate: (updatedCreditCards: CreditCard[]) => void;
  onUpdateSummary?: () => void;
  disabled?: boolean;
}

export default function CreditCardList({ creditCards, onUpdate, onUpdateSummary, disabled = false }: CreditCardListProps) {
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [cardName, setCardName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [availableCredit, setAvailableCredit] = useState('');
  const [includeInTotals, setIncludeInTotals] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

  // Inline editing state
  const [editingAvailableId, setEditingAvailableId] = useState<number | null>(null);
  const [editingAvailableValue, setEditingAvailableValue] = useState('');

  const handleUpdateCard = async () => {
    if (!editingCard) return;

    const newAvailableCredit = parseFloat(availableCredit);
    const newCreditLimit = parseFloat(creditLimit);
    const newCurrentBalance = newCreditLimit - newAvailableCredit;

    // Optimistic update
    const updatedCard: CreditCard = {
      ...editingCard,
      credit_limit: newCreditLimit,
      available_credit: newAvailableCredit,
      current_balance: newCurrentBalance,
      include_in_totals: includeInTotals,
    };
    const updatedCreditCards = creditCards.map(card => 
      card.id === editingCard.id ? updatedCard : card
    );
    onUpdate(updatedCreditCards);
    setIsEditDialogOpen(false);
    setEditingCard(null);
    setCardName('');
    setCreditLimit('');
    setAvailableCredit('');
    setIncludeInTotals(true);

    try {
      const response = await fetch(`/api/credit-cards/${editingCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credit_limit: newCreditLimit,
          available_credit: newAvailableCredit,
          include_in_totals: includeInTotals,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to update credit card');
        throw new Error(errorMessage || 'Failed to update credit card');
      }

      if (onUpdateSummary) onUpdateSummary();
    } catch (error) {
      // Revert on error
      onUpdate(creditCards);
      console.error('Error updating credit card:', error);
      // Error toast already shown by handleApiError
    }
  };

  const handleAddCard = async () => {
    if (!cardName.trim()) {
      alert('Please enter a card name');
      return;
    }

    try {
      const response = await fetch('/api/credit-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cardName,
          credit_limit: parseFloat(creditLimit) || 0,
          available_credit: parseFloat(availableCredit) || 0,
          include_in_totals: includeInTotals,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to add credit card');
        throw new Error(errorMessage || 'Failed to add credit card');
      }

      const newCard = await response.json();
      const updatedCreditCards = [...creditCards, newCard];
      onUpdate(updatedCreditCards);
      if (onUpdateSummary) onUpdateSummary();

      setIsAddDialogOpen(false);
      setCardName('');
      setCreditLimit('');
      setAvailableCredit('');
      setIncludeInTotals(true);
    } catch (error) {
      console.error('Error adding credit card:', error);
      // Error toast already shown by handleApiError
    }
  };

  const handleDeleteCard = (card: CreditCard) => {
    setCardToDelete(card);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCard = async () => {
    if (!cardToDelete) return;

    // Optimistic update
    const updatedCreditCards = creditCards.filter(card => card.id !== cardToDelete.id);
    onUpdate(updatedCreditCards);

    try {
      const response = await fetch(`/api/credit-cards/${cardToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to delete credit card');
        throw new Error(errorMessage || 'Failed to delete credit card');
      }
      toast.success('Credit card deleted');
      if (onUpdateSummary) onUpdateSummary();
      setDeleteDialogOpen(false);
      setCardToDelete(null);
    } catch (error) {
      // Revert on error
      onUpdate(creditCards);
      console.error('Error deleting credit card:', error);
      // Error toast already shown by handleApiError
    }
  };

  const openEditDialog = (card: CreditCard) => {
    setEditingCard(card);
    setCardName(card.name);
    setCreditLimit(card.credit_limit.toString());
    setAvailableCredit(card.available_credit.toString());
    setIncludeInTotals(card.include_in_totals);
    setIsEditDialogOpen(true);
  };

  const openAddDialog = () => {
    setCardName('');
    setCreditLimit('0');
    setAvailableCredit('0');
    setIncludeInTotals(true);
    setIsAddDialogOpen(true);
  };

  // Inline available credit editing handlers
  const startEditingAvailable = (card: CreditCard) => {
    setEditingAvailableId(card.id);
    setEditingAvailableValue(card.available_credit.toString());
  };

  const cancelEditingAvailable = () => {
    setEditingAvailableId(null);
    setEditingAvailableValue('');
  };

  const saveInlineAvailable = async (cardId: number) => {
    const newAvailableCredit = parseFloat(editingAvailableValue) || 0;
    const card = creditCards.find(c => c.id === cardId);
    if (!card) return;
    
    const newCurrentBalance = card.credit_limit - newAvailableCredit;
    
    // Optimistic update
    const updatedCreditCards = creditCards.map(c => 
      c.id === cardId 
        ? { ...c, available_credit: newAvailableCredit, current_balance: newCurrentBalance }
        : c
    );
    onUpdate(updatedCreditCards);
    setEditingAvailableId(null);
    setEditingAvailableValue('');

    try {
      const response = await fetch(`/api/credit-cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          available_credit: newAvailableCredit,
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to update available credit');
        throw new Error(errorMessage || 'Failed to update available credit');
      }

      toast.success('Available credit updated');
      if (onUpdateSummary) onUpdateSummary();
    } catch (error) {
      // Revert on error
      onUpdate(creditCards);
      setEditingAvailableId(cardId);
      setEditingAvailableValue(newAvailableCredit.toString());
      console.error('Error updating available credit:', error);
      // Error toast already shown by handleApiError
    }
  };

  const totalBalance = creditCards.reduce((sum, card) => sum + card.current_balance, 0);

  return (
    <>
      <div className="mb-3">
        <Button onClick={openAddDialog} size="sm" disabled={disabled}>
          Add Credit Card
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Card</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead className="text-right">Balance Owed</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {creditCards.map((card) => (
            <TableRow key={card.id}>
              <TableCell className="font-medium">{card.name}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {editingAvailableId === card.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={editingAvailableValue}
                      onChange={(e) => setEditingAvailableValue(e.target.value)}
                      className="w-28 h-8 text-right"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveInlineAvailable(card.id);
                        } else if (e.key === 'Escape') {
                          cancelEditingAvailable();
                        }
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => saveInlineAvailable(card.id)}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={cancelEditingAvailable}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className="cursor-pointer hover:bg-muted px-2 py-1 rounded"
                    onClick={() => startEditingAvailable(card)}
                  >
                    {formatCurrency(card.available_credit)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(card.current_balance)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditDialog(card)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteCard(card)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-muted/50">
            <TableCell>Total Owed</TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right">{formatCurrency(totalBalance)}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Edit Credit Card Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingCard?.name}</DialogTitle>
            <DialogDescription>
              Update the credit card limit and available credit.
            </DialogDescription>
          </DialogHeader>
          <div 
            className="space-y-4 pt-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUpdateCard();
              }
            }}
          >
            <div>
              <Label htmlFor="credit-limit">Credit Limit</Label>
              <Input
                id="credit-limit"
                type="number"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="available-credit">Available Credit</Label>
              <Input
                id="available-credit"
                type="number"
                step="0.01"
                value={availableCredit}
                onChange={(e) => setAvailableCredit(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm text-muted-foreground">Balance Owed (calculated)</div>
              <div className="text-lg font-semibold">
                {formatCurrency(parseFloat(creditLimit || '0') - parseFloat(availableCredit || '0'))}
              </div>
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
              <Button onClick={handleUpdateCard}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Credit Card Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Credit Card</DialogTitle>
            <DialogDescription>
              Add a new credit card to track your balances.
            </DialogDescription>
          </DialogHeader>
          <div 
            className="space-y-4 pt-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (cardName.trim()) {
                  handleAddCard();
                }
              }
            }}
          >
            <div>
              <Label htmlFor="card-name">Card Name</Label>
              <Input
                id="card-name"
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="e.g., Visa Rewards"
              />
            </div>
            <div>
              <Label htmlFor="credit-limit-add">Credit Limit</Label>
              <Input
                id="credit-limit-add"
                type="number"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="available-credit-add">Available Credit</Label>
              <Input
                id="available-credit-add"
                type="number"
                step="0.01"
                value={availableCredit}
                onChange={(e) => setAvailableCredit(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="p-3 bg-muted rounded-md">
              <div className="text-sm text-muted-foreground">Balance Owed (calculated)</div>
              <div className="text-lg font-semibold">
                {formatCurrency(parseFloat(creditLimit || '0') - parseFloat(availableCredit || '0'))}
              </div>
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
              <Button onClick={handleAddCard}>Add Credit Card</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Credit Card Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Card?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Are you sure you want to delete <strong>"{cardToDelete?.name}"</strong>?
                <div className="mt-2 text-sm text-muted-foreground">
                  Current balance: {cardToDelete && formatCurrency(cardToDelete.current_balance)}
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
              setCardToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Credit Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

