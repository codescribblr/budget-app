'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Search, AlertTriangle, GitMerge, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { parseLocalDate } from '@/lib/date-utils';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import type { DuplicateGroup, Category } from '@/lib/types';
import MergeTransactionDialog from '@/components/transactions/MergeTransactionDialog';
import TransactionDetailDialog from '@/components/transactions/TransactionDetailDialog';

export default function DuplicateTransactionFinder() {
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [isSearching, setIsSearching] = useState(false);
  const [isMarkingReviewed, setIsMarkingReviewed] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [mergingGroup, setMergingGroup] = useState<DuplicateGroup | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  // Track selected transactions per group: Map<groupIndex, Set<transactionId>>
  const [selectedTransactions, setSelectedTransactions] = useState<Map<number, Set<number>>>(new Map());
  const [viewingTransactionId, setViewingTransactionId] = useState<number | null>(null);

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingCategoriesRef = useRef(false);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    // Fetch categories when component mounts
    const fetchCategories = async () => {
      // Prevent duplicate calls
      if (fetchingCategoriesRef.current || hasMountedRef.current) {
        return;
      }
      hasMountedRef.current = true;
      fetchingCategoriesRef.current = true;

      try {
        const response = await fetch('/api/categories?includeArchived=all');
        if (response.ok) {
          const data = await response.json();
          
          // Ensure categories is always an array
          if (Array.isArray(data)) {
            setCategories(data);
          } else {
            console.error('Invalid categories data:', data);
            setCategories([]);
          }
        } else {
          setCategories([]);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]); // Set empty array on error
      } finally {
        fetchingCategoriesRef.current = false;
      }
    };
    fetchCategories();
  }, []);

  const handleSearch = async () => {
    setIsSearching(true);
    setSelectedTransactions(new Map()); // Clear selections
    
    try {
      const response = await fetch('/api/transactions/find-duplicates');
      
      if (!response.ok) {
        throw new Error('Failed to search for duplicates');
      }

      const data = await response.json();
      
      // Ensure duplicateGroups is always an array
      if (data && Array.isArray(data.duplicateGroups)) {
        setDuplicateGroups(data.duplicateGroups);
      } else {
        console.error('Invalid duplicateGroups data:', data);
        setDuplicateGroups([]);
      }
      
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

  const handleToggleTransaction = (groupIndex: number, transactionId: number) => {
    const newSelected = new Map(selectedTransactions);
    const groupSelected = new Set(newSelected.get(groupIndex) || []);
    
    if (groupSelected.has(transactionId)) {
      groupSelected.delete(transactionId);
    } else {
      groupSelected.add(transactionId);
    }
    
    if (groupSelected.size === 0) {
      newSelected.delete(groupIndex);
    } else {
      newSelected.set(groupIndex, groupSelected);
    }
    
    setSelectedTransactions(newSelected);
  };

  const handleToggleGroup = (groupIndex: number, group: DuplicateGroup, checked: boolean) => {
    const newSelected = new Map(selectedTransactions);
    
    if (checked) {
      const allIds = new Set(group.transactions.map(t => t.id));
      newSelected.set(groupIndex, allIds);
    } else {
      newSelected.delete(groupIndex);
    }
    
    setSelectedTransactions(newSelected);
  };

  const getSelectedCount = (groupIndex: number): number => {
    return selectedTransactions.get(groupIndex)?.size || 0;
  };

  const isGroupFullySelected = (groupIndex: number, group: DuplicateGroup): boolean => {
    const selected = selectedTransactions.get(groupIndex);
    if (!selected) return false;
    return group.transactions.every(txn => selected.has(txn.id));
  };

  const isGroupPartiallySelected = (groupIndex: number, group: DuplicateGroup): boolean => {
    const selectedCount = getSelectedCount(groupIndex);
    return selectedCount > 0 && selectedCount < group.transactions.length;
  };

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) || dateStr;
  };

  const handleMerge = (groupIndex: number, group: DuplicateGroup) => {
    const selected = selectedTransactions.get(groupIndex);
    if (!selected || selected.size < 2) {
      toast.error('Please select at least 2 transactions to merge');
      return;
    }
    
    // Create a filtered group with only selected transactions
    const filteredGroup: DuplicateGroup = {
      ...group,
      transactions: group.transactions.filter(t => selected.has(t.id)),
    };
    
    setMergingGroup(filteredGroup);
  };

  const handleMergeSuccess = () => {
    setMergingGroup(null);
    handleSearch();
  };

  const handleMarkAsReviewed = async (groupIndex: number, group: DuplicateGroup) => {
    const selected = selectedTransactions.get(groupIndex);
    if (!selected || selected.size === 0) {
      toast.error('Please select at least one transaction to mark as reviewed');
      return;
    }
    
    setIsMarkingReviewed(true);
    try {
      const transactionIds = Array.from(selected);
      const response = await fetch('/api/transactions/mark-duplicates-reviewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as reviewed');
      }

      toast.success('Selected transactions marked as reviewed');
      await handleSearch();
    } catch (error) {
      console.error('Error marking as reviewed:', error);
      toast.error('Failed to mark as reviewed');
    } finally {
      setIsMarkingReviewed(false);
    }
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
          Merge duplicate transactions to combine their data, or mark groups as reviewed if they're not duplicates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleSearch}
            disabled={isSearching || !isEditor || permissionsLoading}
          >
            {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Search className="mr-2 h-4 w-4" />
            Search for Duplicates
          </Button>

        </div>
        {!isEditor && !permissionsLoading && (
          <p className="text-sm text-muted-foreground">Only editors and owners can search for and merge duplicate transactions</p>
        )}

        {duplicateGroups.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                Found {duplicateGroups.length} group(s) of potential duplicates. 
                Review carefully and merge them to combine their data, or mark as reviewed if they're not duplicates.
              </p>
            </div>

            {duplicateGroups.map((group, groupIndex) => {
              const selectedCount = getSelectedCount(groupIndex);
              const isFullySelected = isGroupFullySelected(groupIndex, group);
              const isPartiallySelected = isGroupPartiallySelected(groupIndex, group);
              
              return (
                <div key={groupIndex} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isFullySelected}
                        onCheckedChange={(checked) => handleToggleGroup(groupIndex, group, checked as boolean)}
                        className={isPartiallySelected ? 'data-[state=checked]:bg-gray-500' : ''}
                      />
                      <div>
                        <h3 className="font-semibold">
                          Duplicate Group {groupIndex + 1}
                          {group.isReviewed && (
                            <Badge variant="outline" className="ml-2">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Reviewed
                            </Badge>
                          )}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Amount: {formatCurrency(group.amount)} • {group.transactions.length} transactions
                          {selectedCount > 0 && (
                            <span className="ml-2">• {selectedCount} selected</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {selectedCount > 0 && (
                      <div className="flex items-center gap-2">
                        {selectedCount >= 2 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMerge(groupIndex, group)}
                            disabled={!isEditor || permissionsLoading}
                          >
                            <GitMerge className="h-4 w-4 mr-1" />
                            Merge Selected ({selectedCount})
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkAsReviewed(groupIndex, group)}
                          disabled={!isEditor || permissionsLoading || isMarkingReviewed}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Mark as Not Duplicates ({selectedCount})
                        </Button>
                      </div>
                    )}
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
                    {group.transactions.map((txn) => {
                      const isSelected = selectedTransactions.get(groupIndex)?.has(txn.id) || false;
                      return (
                        <TableRow 
                          key={txn.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={(e) => {
                            // Don't open dialog if clicking checkbox
                            if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) {
                              return;
                            }
                            setViewingTransactionId(txn.id);
                          }}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleTransaction(groupIndex, txn.id)}
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
                            {txn.is_historical && (
                              <Badge variant="outline" className="ml-1 text-xs">Historical</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              );
            })}
          </div>
        )}

        {!isSearching && duplicateGroups.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Click "Search for Duplicates" to find potential duplicate transactions</p>
          </div>
        )}
      </CardContent>

      {mergingGroup && (
        <MergeTransactionDialog
          isOpen={!!mergingGroup}
          onClose={() => setMergingGroup(null)}
          duplicateGroup={mergingGroup}
          categories={categories}
          onSuccess={handleMergeSuccess}
        />
      )}

      {viewingTransactionId && (
        <TransactionDetailDialog
          isOpen={!!viewingTransactionId}
          onClose={() => setViewingTransactionId(null)}
          transactionId={viewingTransactionId}
        />
      )}
    </Card>
  );
}


