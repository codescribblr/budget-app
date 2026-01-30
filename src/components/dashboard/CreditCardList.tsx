import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatCurrency } from '@/lib/utils';
import type { CreditCard } from '@/lib/types';
import { toast } from 'sonner';
import { Check, X, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { handleApiError } from '@/lib/api-error-handler';
import Link from 'next/link';
import CreditCardDialog from '@/components/credit-cards/CreditCardDialog';

interface CreditCardListProps {
  creditCards: CreditCard[];
  onUpdate: (updatedCreditCards: CreditCard[]) => void;
  onUpdateSummary?: () => void;
  disabled?: boolean;
}

export default function CreditCardList({ creditCards, onUpdate, onUpdateSummary, disabled = false }: CreditCardListProps) {
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isCreditCardDialogOpen, setIsCreditCardDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);

  // Inline editing state
  const [editingAvailableId, setEditingAvailableId] = useState<number | null>(null);
  const [editingAvailableValue, setEditingAvailableValue] = useState('');

  const handleCreditCardSuccess = async () => {
    // Refetch credit cards after successful add/edit
    try {
      const response = await fetch('/api/credit-cards');
      if (response.ok) {
        const updatedCreditCards = await response.json();
        onUpdate(updatedCreditCards);
        if (onUpdateSummary) onUpdateSummary();
      }
    } catch (error) {
      console.error('Error fetching credit cards:', error);
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
    setIsCreditCardDialogOpen(true);
  };

  const openAddDialog = () => {
    setEditingCard(null);
    setIsCreditCardDialogOpen(true);
  };

  const handleCloseCreditCardDialog = () => {
    setIsCreditCardDialogOpen(false);
    setEditingCard(null);
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
      <div className="mb-3 flex items-center justify-between">
        <Button onClick={openAddDialog} size="sm" disabled={disabled}>
          Add Credit Card
        </Button>
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-semibold">{formatCurrency(totalBalance)}</span>
        </div>
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
              <TableCell>
                <Link href={`/credit-cards/${card.id}`} className="font-medium hover:underline">
                  {card.name}
                </Link>
              </TableCell>
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
        </TableBody>
      </Table>

      {/* Credit Card Dialog (used for both add and edit) */}
      <CreditCardDialog
        isOpen={isCreditCardDialogOpen}
        onClose={handleCloseCreditCardDialog}
        creditCard={editingCard}
        onSuccess={handleCreditCardSuccess}
      />

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


