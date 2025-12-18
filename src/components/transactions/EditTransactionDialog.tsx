import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '@/lib/utils';
import type { Category, TransactionWithSplits, MerchantGroup, Account, CreditCard } from '@/lib/types';
import { parseLocalDate, formatLocalDate, getTodayLocal } from '@/lib/date-utils';
import { handleApiError } from '@/lib/api-error-handler';
import TagSelector from '@/components/tags/TagSelector';

interface EditTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionWithSplits;
  categories: Category[];
  merchantGroups?: MerchantGroup[];
  onSuccess: () => void;
}

interface Split {
  category_id: number;
  amount: string;
}

export default function EditTransactionDialog({
  isOpen,
  onClose,
  transaction,
  categories,
  merchantGroups: parentMerchantGroups,
  onSuccess,
}: EditTransactionDialogProps) {
  const [date, setDate] = useState<Date>(getTodayLocal());
  const [description, setDescription] = useState('');
  const [merchantGroupId, setMerchantGroupId] = useState<number | null>(null);
  const [merchantGroups, setMerchantGroups] = useState<MerchantGroup[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedCreditCardId, setSelectedCreditCardId] = useState<number | null>(null);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showArchivedCategories, setShowArchivedCategories] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>(categories);

  useEffect(() => {
    if (transaction) {
      setDate(parseLocalDate(transaction.date) || getTodayLocal());
      setDescription(transaction.description);
      setMerchantGroupId(transaction.merchant_group_id || null);
      setSelectedAccountId(transaction.account_id || null);
      setSelectedCreditCardId(transaction.credit_card_id || null);
      setTransactionType(transaction.transaction_type || 'expense');
      setSelectedTagIds(transaction.tags?.map(t => t.id) || []);
      setSplits(
        transaction.splits.map((split) => ({
          category_id: split.category_id,
          amount: split.amount.toString(),
        }))
      );
      setIsSubmitting(false);
    }
  }, [transaction]);

  useEffect(() => {
    // Keep availableCategories in sync if parent categories change (when not explicitly showing archived)
    if (!showArchivedCategories) {
      setAvailableCategories(categories);
    }
  }, [categories, showArchivedCategories]);

  useEffect(() => {
    const ensureSelectedCategoriesPresent = async () => {
      if (!isOpen) return;
      if (!transaction) return;

      const base = showArchivedCategories ? availableCategories : categories;
      const existingIds = new Set(base.map((c) => c.id));
      const neededIds = Array.from(new Set(transaction.splits.map((s) => s.category_id))).filter(
        (id) => id && !existingIds.has(id)
      );

      if (neededIds.length === 0) {
        if (!showArchivedCategories) setAvailableCategories(categories);
        return;
      }

      try {
        const fetched = await Promise.all(
          neededIds.map(async (id) => {
            const res = await fetch(`/api/categories/${id}`);
            if (!res.ok) return null;
            return (await res.json()) as Category;
          })
        );
        const merged = [...base, ...fetched.filter(Boolean) as Category[]];
        setAvailableCategories(merged);
      } catch (e) {
        console.error('Failed to load archived categories for edit:', e);
        setAvailableCategories(base);
      }
    };

    ensureSelectedCategoriesPresent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, transaction?.id, showArchivedCategories]);

  useEffect(() => {
    const fetchAllIfNeeded = async () => {
      if (!isOpen) return;
      if (!showArchivedCategories) return;
      try {
        const res = await fetch('/api/categories?excludeGoals=true&includeArchived=all');
        if (!res.ok) return;
        const data = await res.json();
        setAvailableCategories(Array.isArray(data) ? data : categories);
      } catch (e) {
        console.error('Failed to load archived categories:', e);
      }
    };
    fetchAllIfNeeded();
  }, [isOpen, showArchivedCategories]);

  useEffect(() => {
    // Use parent merchant groups if provided, otherwise fetch
    if (isOpen) {
      if (parentMerchantGroups && parentMerchantGroups.length > 0) {
        setMerchantGroups(parentMerchantGroups);
      } else {
        // Only fetch if not provided by parent
        const fetchMerchantGroups = async () => {
          try {
            const response = await fetch('/api/merchant-groups');
            const data = await response.json();
            setMerchantGroups(data);
          } catch (error) {
            console.error('Error fetching merchant groups:', error);
          }
        };
        fetchMerchantGroups();
      }
      fetchAccounts();
      fetchCreditCards();
    }
  }, [isOpen, parentMerchantGroups]);

  const fetchAccounts = async () => {
    const response = await fetch('/api/accounts');
    const data = await response.json();
    setAccounts(data);
  };

  const fetchCreditCards = async () => {
    const response = await fetch('/api/credit-cards');
    const data = await response.json();
    setCreditCards(data);
  };

  const handleAccountChange = (value: string) => {
    if (value === 'none') {
      setSelectedAccountId(null);
      setSelectedCreditCardId(null);
    } else if (value.startsWith('account-')) {
      setSelectedAccountId(parseInt(value.replace('account-', '')));
      setSelectedCreditCardId(null);
    } else if (value.startsWith('card-')) {
      setSelectedCreditCardId(parseInt(value.replace('card-', '')));
      setSelectedAccountId(null);
    }
  };

  const getAccountValue = (): string => {
    if (selectedAccountId) return `account-${selectedAccountId}`;
    if (selectedCreditCardId) return `card-${selectedCreditCardId}`;
    return 'none';
  };

  const handleAddSplit = () => {
    setSplits([...splits, { category_id: 0, amount: '' }]);
  };

  const handleRemoveSplit = (index: number) => {
    if (splits.length === 1) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleSplitChange = (index: number, field: keyof Split, value: string | number) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  const calculateTotal = () => {
    return splits.reduce((sum, split) => sum + (parseFloat(split.amount) || 0), 0);
  };

  const handleSubmit = async () => {
    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    // Validation
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    const validSplits = splits.filter(s => s.category_id > 0 && parseFloat(s.amount) > 0);
    if (validSplits.length === 0) {
      alert('Please add at least one category with an amount');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formatLocalDate(date),
          description,
          transaction_type: transactionType,
          merchant_group_id: merchantGroupId,
          account_id: selectedAccountId || null,
          credit_card_id: selectedCreditCardId || null,
          tag_ids: selectedTagIds,
          splits: validSplits.map(s => ({
            category_id: s.category_id,
            amount: parseFloat(s.amount),
          })),
        }),
      });

      if (!response.ok) {
        const errorMessage = await handleApiError(response, 'Failed to update transaction');
        throw new Error(errorMessage || 'Failed to update transaction');
      }

      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating transaction:', error);
      setIsSubmitting(false);
      // Error toast already shown by handleApiError
      // Button will be re-enabled so user can try again
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <DatePicker
                id="date"
                date={date}
                onDateChange={(newDate) => setDate(newDate || new Date())}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Grocery shopping at Walmart"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="transactionType">Transaction Type</Label>
            <Select
              value={transactionType}
              onValueChange={(value) => setTransactionType(value as 'income' | 'expense')}
            >
              <SelectTrigger id="transactionType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="merchant">Merchant (Optional)</Label>
            <Select
              value={merchantGroupId?.toString() || 'none'}
              onValueChange={(value) => setMerchantGroupId(value === 'none' ? null : parseInt(value))}
            >
              <SelectTrigger id="merchant">
                <SelectValue placeholder="Select merchant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No merchant</SelectItem>
                {merchantGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id.toString()}>
                    {group.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="account">Account/Card (Optional)</Label>
            <Select value={getAccountValue()} onValueChange={handleAccountChange}>
              <SelectTrigger id="account">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Accounts</div>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={`account-${account.id}`}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </>
                )}
                {creditCards.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Credit Cards</div>
                    {creditCards.map((card) => (
                      <SelectItem key={card.id} value={`card-${card.id}`}>
                        {card.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <TagSelector
              selectedTagIds={selectedTagIds}
              onChange={setSelectedTagIds}
              transactionDescription={description}
              categoryIds={splits.map(s => s.category_id).filter(id => id > 0)}
              merchantGroupId={merchantGroupId}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Category Splits</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-archived-categories"
                    checked={showArchivedCategories}
                    onCheckedChange={(v) => setShowArchivedCategories(!!v)}
                  />
                  <Label htmlFor="show-archived-categories" className="text-xs text-muted-foreground font-normal">
                    Show archived categories
                  </Label>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddSplit}>
                Add Split
              </Button>
            </div>

            {splits.map((split, index) => (
              <div key={index} className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label htmlFor={`category-${index}`}>Category</Label>
                  <Select
                    value={split.category_id.toString()}
                    onValueChange={(value) => handleSplitChange(index, 'category_id', parseInt(value))}
                  >
                    <SelectTrigger id={`category-${index}`}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories
                        .filter(cat => !cat.is_goal && !cat.is_buffer)
                        .filter(cat => (showArchivedCategories ? true : !cat.is_archived))
                        .map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          <div className="flex items-center gap-2">
                            {category.name}
                            {category.is_archived && (
                              <span className="text-muted-foreground" title="Archived category">Archived</span>
                            )}
                            {category.is_system && (
                              <span className="text-muted-foreground" title="System category">⚙️</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label htmlFor={`amount-${index}`}>Amount</Label>
                  <Input
                    id={`amount-${index}`}
                    type="number"
                    step="0.01"
                    value={split.amount}
                    onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                {splits.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSplit(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 bg-muted rounded-md">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Amount:</span>
              <span className="text-xl font-bold">{formatCurrency(calculateTotal())}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

