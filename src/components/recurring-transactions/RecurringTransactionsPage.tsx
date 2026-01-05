'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Edit, 
  Trash2, 
  MoreVertical, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Calendar,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { useShiftClickSelection } from '@/hooks/useShiftClickSelection';

interface RecurringTransaction {
  id: number;
  merchant_name: string;
  frequency: string;
  expected_amount: number;
  transaction_type: 'income' | 'expense';
  next_expected_date: string | null;
  last_occurrence_date: string | null;
  is_active: boolean;
  is_confirmed: boolean;
  confidence_score: number;
  occurrence_count: number;
  reminder_enabled: boolean;
  reminder_days_before: number;
}

export default function RecurringTransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<RecurringTransaction | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTransactionsDialog, setShowTransactionsDialog] = useState(false);
  const [matchingTransactions, setMatchingTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Filters from URL
  const isActiveParam = searchParams.get('isActive');
  const isConfirmedParam = searchParams.get('isConfirmed');
  const frequencyParam = searchParams.get('frequency');
  const transactionTypeParam = searchParams.get('transactionType');

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/recurring-transactions?${params.toString()}`);
  };

  const fetchRecurringTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (isActiveParam !== null) params.set('isActive', isActiveParam);
      if (isConfirmedParam !== null) params.set('isConfirmed', isConfirmedParam);

      const response = await fetch(`/api/recurring-transactions?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setRecurringTransactions(data.recurringTransactions || []);
      } else {
        toast.error('Failed to fetch recurring transactions');
      }
    } catch (error) {
      console.error('Error fetching recurring transactions:', error);
      toast.error('Failed to fetch recurring transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurringTransactions();
  }, [isActiveParam, isConfirmedParam]);

  const handleDetect = async () => {
    try {
      setIsDetecting(true);
      const response = await fetch('/api/recurring-transactions/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookbackMonths: 24 }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.saved > 0) {
          toast.success(
            `Detected and saved ${data.saved} recurring transaction${data.saved === 1 ? '' : 's'}. Please review and confirm them.`,
            { duration: 5000 }
          );
          // Auto-filter to show unconfirmed ones
          updateFilters({ isConfirmed: 'false' });
        } else if (data.skipped > 0) {
          toast.info(`Found ${data.patterns.length} patterns, but ${data.skipped} already exist`);
        } else if (data.patterns.length === 0) {
          toast.info('No recurring patterns found in your transactions');
        } else {
          toast.success(`Found ${data.patterns.length} potential recurring transactions`);
        }
        await fetchRecurringTransactions();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to detect recurring transactions');
      }
    } catch (error) {
      console.error('Error detecting recurring transactions:', error);
      toast.error('Failed to detect recurring transactions');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleViewTransactions = async (recurringTransaction: RecurringTransaction) => {
    try {
      setSelectedTransaction(recurringTransaction);
      setLoadingTransactions(true);
      setShowTransactionsDialog(true);

      const response = await fetch(`/api/recurring-transactions/${recurringTransaction.id}/transactions`);
      if (response.ok) {
        const data = await response.json();
        setMatchingTransactions(data.transactions || []);
      } else {
        toast.error('Failed to fetch matching transactions');
        setMatchingTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching matching transactions:', error);
      toast.error('Failed to fetch matching transactions');
      setMatchingTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_confirmed: true }),
      });

      if (response.ok) {
        toast.success('Recurring transaction confirmed');
        await fetchRecurringTransactions();
      } else {
        toast.error('Failed to confirm recurring transaction');
      }
    } catch (error) {
      console.error('Error confirming recurring transaction:', error);
      toast.error('Failed to confirm recurring transaction');
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/recurring-transactions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (response.ok) {
        toast.success(`Recurring transaction ${!isActive ? 'activated' : 'deactivated'}`);
        await fetchRecurringTransactions();
      } else {
        toast.error('Failed to update recurring transaction');
      }
    } catch (error) {
      console.error('Error updating recurring transaction:', error);
      toast.error('Failed to update recurring transaction');
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/recurring-transactions/${selectedTransaction.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Stopped tracking recurring transaction');
        setShowDeleteDialog(false);
        setSelectedTransaction(null);
        await fetchRecurringTransactions();
      } else {
        toast.error('Failed to stop tracking recurring transaction');
      }
    } catch (error) {
      console.error('Error deleting recurring transaction:', error);
      toast.error('Failed to stop tracking recurring transaction');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      setIsDeleting(true);
      const response = await fetch('/api/recurring-transactions/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Stopped tracking ${data.deleted} recurring transaction${data.deleted === 1 ? '' : 's'}`);
        setShowDeleteDialog(false);
        setSelectedTransaction(null);
        setSelectedIds(new Set());
        setBulkMode(false);
        await fetchRecurringTransactions();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || 'Failed to delete recurring transactions');
      }
    } catch (error) {
      console.error('Error bulk deleting:', error);
      toast.error('Failed to delete recurring transactions');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkConfirm = async () => {
    if (selectedIds.size === 0) return;

    try {
      const confirmPromises = Array.from(selectedIds).map(id =>
        fetch(`/api/recurring-transactions/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_confirmed: true }),
        })
      );

      const results = await Promise.all(confirmPromises);
      const successCount = results.filter(r => r.ok).length;

      if (successCount === selectedIds.size) {
        toast.success(`Confirmed ${successCount} recurring transaction${successCount === 1 ? '' : 's'}`);
        setSelectedIds(new Set());
        setBulkMode(false);
        await fetchRecurringTransactions();
      } else {
        toast.error(`Failed to confirm some transactions. ${successCount} of ${selectedIds.size} confirmed.`);
      }
    } catch (error) {
      console.error('Error bulk confirming:', error);
      toast.error('Failed to confirm recurring transactions');
    }
  };


  const unconfirmedCount = recurringTransactions.filter(rt => !rt.is_confirmed).length;

  const filteredTransactions = useMemo(() => {
    let filtered = [...recurringTransactions];

    // Status filters
    if (isActiveParam === 'true') {
      filtered = filtered.filter(t => t.is_active);
    } else if (isActiveParam === 'false') {
      filtered = filtered.filter(t => !t.is_active);
    }

    if (isConfirmedParam === 'true') {
      filtered = filtered.filter(t => t.is_confirmed);
    } else if (isConfirmedParam === 'false') {
      filtered = filtered.filter(t => !t.is_confirmed);
    }

    // Frequency filter
    if (frequencyParam) {
      filtered = filtered.filter(t => t.frequency === frequencyParam);
    }

    // Transaction type filter
    if (transactionTypeParam) {
      filtered = filtered.filter(t => t.transaction_type === transactionTypeParam);
    }

    // Search
    const query = searchQuery.toLowerCase();
    if (query) {
      filtered = filtered.filter(t => 
        t.merchant_name.toLowerCase().includes(query)
      );
    }

    // Sort by next expected date
    filtered.sort((a, b) => {
      if (!a.next_expected_date && !b.next_expected_date) return 0;
      if (!a.next_expected_date) return 1;
      if (!b.next_expected_date) return -1;
      return new Date(a.next_expected_date).getTime() - new Date(b.next_expected_date).getTime();
    });

    return filtered;
  }, [recurringTransactions, isActiveParam, isConfirmedParam, frequencyParam, transactionTypeParam, searchQuery]);

  // Shift-click selection handler
  const handleCheckboxClick = useShiftClickSelection(
    filteredTransactions,
    (rt) => rt.id,
    selectedIds,
    setSelectedIds
  );

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      daily: 'Daily',
      weekly: 'Weekly',
      biweekly: 'Biweekly',
      monthly: 'Monthly',
      bimonthly: 'Bimonthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      custom: 'Custom',
    };
    return labels[frequency] || frequency;
  };

  const getConfidenceBadge = (score: number) => {
    if (score >= 0.8) return <Badge variant="default" className="bg-green-500">High</Badge>;
    if (score >= 0.5) return <Badge variant="default" className="bg-yellow-500">Medium</Badge>;
    return <Badge variant="default" className="bg-gray-500">Low</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Recurring Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your recurring expenses and income
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleDetect}
          disabled={isDetecting}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isDetecting ? 'animate-spin' : ''}`} />
          Detect Recurring
        </Button>
      </div>

      {/* Unconfirmed Banner */}
      {unconfirmedCount > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                  {unconfirmedCount} Unconfirmed Recurring Transaction{unconfirmedCount === 1 ? '' : 's'}
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  Please review and confirm these detected patterns. Delete any that aren't actually recurring.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateFilters({ isConfirmed: 'false' })}
                >
                  Review Unconfirmed
                </Button>
                {!bulkMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkMode(true)}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Select Multiple
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBulkMode(false);
                      setSelectedIds(new Set());
                    }}
                  >
                    Done
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {bulkMode && selectedIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedIds.size}</span> selected
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkConfirm}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const selected = filteredTransactions.filter(rt => selectedIds.has(rt.id));
                    if (selected.length > 0) {
                      if (selected.length === 1) {
                        setSelectedTransaction(selected[0]);
                      } else {
                        // For multiple, set the first one as representative for the dialog
                        setSelectedTransaction(selected[0]);
                      }
                      setShowDeleteDialog(true);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedIds.size})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>Recurring Transactions</CardTitle>
              <CardDescription>
                {filteredTransactions.length} of {recurringTransactions.length} transactions
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search merchants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-full sm:w-64"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuCheckboxItem
                    checked={isActiveParam === 'true'}
                    onCheckedChange={(checked) => updateFilters({ isActive: checked ? 'true' : null })}
                  >
                    Active Only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={isConfirmedParam === 'true'}
                    onCheckedChange={(checked) => updateFilters({ isConfirmed: checked ? 'true' : null })}
                  >
                    Confirmed Only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={isConfirmedParam === 'false'}
                    onCheckedChange={(checked) => updateFilters({ isConfirmed: checked ? 'false' : null })}
                  >
                    Unconfirmed Only
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No recurring transactions found matching your search' : 'No recurring transactions yet. Click "Detect Recurring" to find patterns in your transactions.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {bulkMode && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedIds(new Set(filteredTransactions.map(rt => rt.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                      />
                    </TableHead>
                  )}
                  <TableHead>Merchant</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((rt) => (
                  <TableRow 
                    key={rt.id} 
                    className={`${!rt.is_confirmed ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''} ${!bulkMode ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                    onClick={() => !bulkMode && handleViewTransactions(rt)}
                  >
                    {bulkMode && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(rt.id)}
                          onClick={(e) => {
                            const checked = !selectedIds.has(rt.id);
                            handleCheckboxClick(rt.id, e, checked);
                          }}
                          onCheckedChange={() => {}} // Required for controlled checkbox
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{rt.merchant_name}</TableCell>
                    <TableCell>{getFrequencyLabel(rt.frequency)}</TableCell>
                    <TableCell className="text-right">
                      <span className={rt.transaction_type === 'expense' ? 'text-red-600' : 'text-green-600'}>
                        {rt.transaction_type === 'expense' ? '-' : '+'}
                        {formatCurrency(Math.abs(rt.expected_amount || 0))}
                      </span>
                    </TableCell>
                    <TableCell>
                      {rt.next_expected_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {new Date(rt.next_expected_date).toLocaleDateString()}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getConfidenceBadge(rt.confidence_score)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {rt.is_active ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            Inactive
                          </Badge>
                        )}
                        {!rt.is_confirmed && (
                          <Badge variant="outline" className="text-yellow-600">
                            Unconfirmed
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/recurring-transactions/${rt.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {!rt.is_confirmed && (
                            <DropdownMenuItem onClick={() => handleConfirm(rt.id)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Confirm
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleToggleActive(rt.id, rt.is_active)}>
                            {rt.is_active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTransaction(rt);
                              setShowDeleteDialog(true);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Stop Tracking Recurring Transaction{selectedIds.size > 1 ? 's' : ''}</CardTitle>
              <CardDescription>
                {selectedIds.size > 1 ? (
                  <>
                    Are you sure you want to stop tracking {selectedIds.size} recurring transaction patterns? 
                    <br /><br />
                    <strong>This will not delete any actual transactions</strong> from your transaction history. 
                    You're only removing the recurring pattern tracking.
                  </>
                ) : (
                  <>
                    Are you sure you want to stop tracking the recurring pattern for <strong>{selectedTransaction.merchant_name}</strong>?
                    <br /><br />
                    <strong>This will not delete any actual transactions</strong> from your transaction history. 
                    You're only removing the recurring pattern tracking.
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setSelectedTransaction(null);
                    if (selectedIds.size > 1) {
                      setSelectedIds(new Set());
                      setBulkMode(false);
                    }
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={async () => {
                    if (selectedIds.size > 1) {
                      await handleBulkDelete();
                      // Dialog will be closed in handleBulkDelete if successful
                    } else if (selectedTransaction) {
                      await handleDelete();
                      // Dialog will be closed in handleDelete if successful
                    }
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Stopping...
                    </>
                  ) : (
                    `Stop Tracking${selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog to show matching transactions */}
      <Dialog open={showTransactionsDialog} onOpenChange={setShowTransactionsDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] md:max-w-[95vw] lg:max-w-[1400px] xl:max-w-[1600px] 2xl:max-w-[1800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Matching Transactions - {selectedTransaction?.merchant_name}
            </DialogTitle>
            <DialogDescription>
              These are the transactions that were used to detect this recurring pattern.
              Review them to verify the pattern is correct and check the transaction types.
            </DialogDescription>
          </DialogHeader>
          {loadingTransactions ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : matchingTransactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="mb-2">No matching transactions found.</p>
              <p className="text-sm">
                This pattern may have been created before transaction matching was implemented, or the matches weren't saved during detection.
                <br />
                Try deleting this recurring transaction and running "Detect Recurring" again to populate the matches.
              </p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Account</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchingTransactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell>
                        {new Date(txn.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="truncate" title={txn.description || '—'}>
                          {txn.description && txn.description.length > 30 
                            ? `${txn.description.substring(0, 30)}...` 
                            : (txn.description || '—')}
                        </div>
                      </TableCell>
                      <TableCell>{(txn.merchant_groups as any)?.display_name || '—'}</TableCell>
                      <TableCell className="text-right">
                        <span className={txn.transaction_type === 'expense' ? 'text-red-600' : 'text-green-600'}>
                          {txn.transaction_type === 'expense' ? '-' : '+'}
                          {formatCurrency(Math.abs(txn.total_amount || 0))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={txn.transaction_type === 'expense' ? 'destructive' : 'default'}>
                          {txn.transaction_type === 'expense' ? 'Expense' : 'Income'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(txn.accounts as any)?.name || (txn.credit_cards as any)?.name || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Pattern Summary:</strong> {matchingTransactions.length} transaction{matchingTransactions.length === 1 ? '' : 's'} 
                  {' '}detected as {selectedTransaction?.transaction_type === 'expense' ? 'expense' : 'income'} 
                  {' '}with expected amount of {selectedTransaction?.transaction_type === 'expense' ? '-' : '+'}
                  {formatCurrency(Math.abs(selectedTransaction?.expected_amount || 0))}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}




