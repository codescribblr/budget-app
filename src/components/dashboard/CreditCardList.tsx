import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import type { CreditCard } from '@/lib/types';

interface CreditCardListProps {
  creditCards: CreditCard[];
  onUpdate: () => void;
}

export default function CreditCardList({ creditCards, onUpdate }: CreditCardListProps) {
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [cardName, setCardName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [availableCredit, setAvailableCredit] = useState('');
  const [includeInTotals, setIncludeInTotals] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleUpdateCard = async () => {
    if (!editingCard) return;

    try {
      await fetch(`/api/credit-cards/${editingCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credit_limit: parseFloat(creditLimit),
          available_credit: parseFloat(availableCredit),
          include_in_totals: includeInTotals,
        }),
      });

      setIsEditDialogOpen(false);
      setEditingCard(null);
      setCardName('');
      setCreditLimit('');
      setAvailableCredit('');
      setIncludeInTotals(true);
      onUpdate();
    } catch (error) {
      console.error('Error updating credit card:', error);
    }
  };

  const handleAddCard = async () => {
    if (!cardName.trim()) {
      alert('Please enter a card name');
      return;
    }

    try {
      await fetch('/api/credit-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cardName,
          credit_limit: parseFloat(creditLimit) || 0,
          available_credit: parseFloat(availableCredit) || 0,
          include_in_totals: includeInTotals,
        }),
      });

      setIsAddDialogOpen(false);
      setCardName('');
      setCreditLimit('');
      setAvailableCredit('');
      setIncludeInTotals(true);
      onUpdate();
    } catch (error) {
      console.error('Error adding credit card:', error);
    }
  };

  const handleDeleteCard = async (card: CreditCard) => {
    if (!confirm(`Are you sure you want to delete "${card.name}"?`)) {
      return;
    }

    try {
      await fetch(`/api/credit-cards/${card.id}`, {
        method: 'DELETE',
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting credit card:', error);
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

  const totalBalance = creditCards.reduce((sum, card) => sum + card.current_balance, 0);

  return (
    <>
      <div className="mb-3">
        <Button onClick={openAddDialog} size="sm">
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
                {formatCurrency(card.available_credit)}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(card.current_balance)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(card)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCard(card)}
                  >
                    Delete
                  </Button>
                </div>
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
          </DialogHeader>
          <div className="space-y-4 pt-4">
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
          </DialogHeader>
          <div className="space-y-4 pt-4">
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
    </>
  );
}

