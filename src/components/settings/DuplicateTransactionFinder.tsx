'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Search, Trash2, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DuplicateGroup {
  amount: number;
  transactions: Array<{
    id: number;
    date: string;
    description: string;
    total_amount: number;
    created_at: string;
    splits: Array<{
      id: number;
      category_id: number;
      amount: number;
      category_name: string;
    }>;
  }>;
}

export default function DuplicateTransactionFinder() {
  const [isSearching, setIsSearching] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    setSelectedTransactions(new Set());
    
    try {
      const response = await fetch('/api/transactions/find-duplicates');
      
      if (!response.ok) {
        throw new Error('Failed to search for duplicates');
      }

      const data = await response.json();
      setDuplicateGroups(data.duplicateGroups || []);
      
      if (data.duplicateGroups.length === 0) {
        toast.success('No duplicate transactions found!');
      } else {
        toast.success(`Found ${data.duplicateGroups.length} group(s) of potential duplicates`);
      }
    } catch (error) {
      console.error('Error searching for duplicates:', error);
      toast.error('Failed to search for duplicates');
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleTransaction = (transactionId: number) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleToggleGroup = (group: DuplicateGroup, checked: boolean) => {
    const newSelected = new Set(selectedTransactions);
    group.transactions.forEach(txn => {
      if (checked) {
        newSelected.add(txn.id);
      } else {
        newSelected.delete(txn.id);
      }
    });
    setSelectedTransactions(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedTransactions.size === 0) {
      toast.error('No transactions selected');
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch('/api/transactions/delete-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: Array.from(selectedTransactions),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete transactions');
      }

      const data = await response.json();
      
      toast.success(`Deleted ${data.deleted} transaction(s)`);
      
      // Refresh the duplicate search
      setShowDeleteDialog(false);
      setSelectedTransactions(new Set());
      await handleSearch();
    } catch (error) {
      console.error('Error deleting transactions:', error);
      toast.error('Failed to delete transactions');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isGroupFullySelected = (group: DuplicateGroup) => {
    return group.transactions.every(txn => selectedTransactions.has(txn.id));
  };

  const isGroupPartiallySelected = (group: DuplicateGroup) => {
    const selectedCount = group.transactions.filter(txn => selectedTransactions.has(txn.id)).length;
    return selectedCount > 0 && selectedCount < group.transactions.length;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Find Duplicate Transactions
        </CardTitle>
        <CardDescription>
          Search for transactions with the same amount and date (±1 day). 
          Useful for finding duplicates that were imported multiple times.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Search className="mr-2 h-4 w-4" />
            Search for Duplicates
          </Button>

          {duplicateGroups.length > 0 && selectedTransactions.size > 0 && (
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedTransactions.size})
            </Button>
          )}
        </div>

        {duplicateGroups.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                Found {duplicateGroups.length} group(s) of potential duplicates. 
                Review carefully and select which transactions to delete.
              </p>
            </div>

            {duplicateGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isGroupFullySelected(group)}
                      onCheckedChange={(checked) => handleToggleGroup(group, checked as boolean)}
                      className={isGroupPartiallySelected(group) ? 'data-[state=checked]:bg-gray-500' : ''}
                    />
                    <div>
                      <h3 className="font-semibold">
                        Duplicate Group {groupIndex + 1}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Amount: {formatCurrency(group.amount)} • {group.transactions.length} transactions
                      </p>
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Imported</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.transactions.map((txn) => (
                      <TableRow key={txn.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTransactions.has(txn.id)}
                            onCheckedChange={() => handleToggleTransaction(txn.id)}
                          />
                        </TableCell>
                        <TableCell>{formatDate(txn.date)}</TableCell>
                        <TableCell className="max-w-xs truncate">{txn.description}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {txn.splits.map((split, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {split.category_name}: {formatCurrency(split.amount)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(txn.total_amount)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(txn.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}

        {!isSearching && duplicateGroups.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click "Search for Duplicates" to find potential duplicate transactions</p>
          </div>
        )}
      </CardContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Transactions?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete {selectedTransactions.size} transaction(s). 
              This will reverse the category balance changes and remove the transactions from your records.
              <br /><br />
              <strong>Note:</strong> The import records will be preserved to prevent these transactions 
              from being re-imported in the future.
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete {selectedTransactions.size} Transaction(s)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

