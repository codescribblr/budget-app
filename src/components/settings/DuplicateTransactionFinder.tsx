'use client';

import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { Loader2, Search, AlertTriangle, GitMerge, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { parseLocalDate } from '@/lib/date-utils';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import type { DuplicateGroup, Category } from '@/lib/types';
import MergeTransactionDialog from '@/components/transactions/MergeTransactionDialog';

export default function DuplicateTransactionFinder() {
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [isSearching, setIsSearching] = useState(false);
  const [isMarkingReviewed, setIsMarkingReviewed] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [mergingGroup, setMergingGroup] = useState<DuplicateGroup | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    // Fetch categories when component mounts
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleSearch = async () => {
    setIsSearching(true);
    
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

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }) || dateStr;
  };

  const handleMerge = (group: DuplicateGroup) => {
    setMergingGroup(group);
  };

  const handleMergeSuccess = () => {
    setMergingGroup(null);
    handleSearch();
  };

  const handleMarkAsReviewed = async (group: DuplicateGroup) => {
    setIsMarkingReviewed(true);
    try {
      const transactionIds = group.transactions.map(t => t.id);
      const response = await fetch('/api/transactions/mark-duplicates-reviewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as reviewed');
      }

      toast.success('Group marked as reviewed');
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

            {duplicateGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
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
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMerge(group)}
                      disabled={!isEditor || permissionsLoading}
                    >
                      <GitMerge className="h-4 w-4 mr-1" />
                      Merge
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkAsReviewed(group)}
                      disabled={!isEditor || permissionsLoading || isMarkingReviewed}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Mark as Not Duplicates
                    </Button>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
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

      {mergingGroup && (
        <MergeTransactionDialog
          isOpen={!!mergingGroup}
          onClose={() => setMergingGroup(null)}
          duplicateGroup={mergingGroup}
          categories={categories}
          onSuccess={handleMergeSuccess}
        />
      )}
    </Card>
  );
}

