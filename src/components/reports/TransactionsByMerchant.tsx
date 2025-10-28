import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

interface TransactionsByMerchantProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
  includeSystemCategories: boolean;
  loading?: boolean;
  merchantStats?: MerchantGroupStat[];
  loadingMerchantStats?: boolean;
}

interface MerchantGroupStat {
  group_id: number;
  display_name: string;
  transaction_count: number;
  total_amount: number;
  average_amount: number;
  patterns: string[];
}

export default function TransactionsByMerchant({
  transactions,
  categories,
  includeSystemCategories,
  loading = false,
  merchantStats = [],
  loadingMerchantStats = false
}: TransactionsByMerchantProps) {
  const [selectedGroup, setSelectedGroup] = useState<MerchantGroupStat | null>(null);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  // Filter transactions based on system category toggle
  const filteredTransactions = includeSystemCategories
    ? transactions
    : transactions.filter(transaction => {
        // Exclude transactions that have any splits in system categories
        return !transaction.splits.some(split => {
          const category = categories.find(c => c.id === split.category_id);
          return category?.is_system;
        });
      });



  // Group transactions by description (merchant) - fallback for ungrouped
  const merchantSpending = new Map<string, { count: number; total: number }>();

  filteredTransactions.forEach(transaction => {
    const current = merchantSpending.get(transaction.description) || { count: 0, total: 0 };
    merchantSpending.set(transaction.description, {
      count: current.count + 1,
      total: current.total + transaction.total_amount,
    });
  });

  // Convert to array and sort by total spending
  const ungroupedMerchants = Array.from(merchantSpending.entries())
    .map(([description, data]) => ({
      description,
      count: data.count,
      total: data.total,
      average: data.total / data.count,
    }))
    .sort((a, b) => b.total - a.total);

  // Get top 10 merchant groups or fall back to ungrouped
  const displayMerchants = merchantStats.length > 0
    ? merchantStats.slice(0, 10)
    : ungroupedMerchants.slice(0, 10);

  const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0);

  const handleGroupClick = (group: MerchantGroupStat) => {
    setSelectedGroup(group);
    setShowGroupDetails(true);
  };

  const isLoading = loading || loadingMerchantStats;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Merchants</CardTitle>
          <CardDescription>Loading merchant data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (displayMerchants.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Merchants</CardTitle>
          <CardDescription>No transactions in selected period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isGrouped = merchantStats.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Top Merchants</CardTitle>
          <CardDescription>
            {isGrouped ? (
              <>
                Top 10 merchant groups by total spending
                <Badge variant="secondary" className="ml-2">Grouped</Badge>
              </>
            ) : (
              'Top 10 by total spending (ungrouped)'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant{isGrouped && ' Group'}</TableHead>
                <TableHead className="text-right">Transactions</TableHead>
                <TableHead className="text-right">Average</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {isGrouped && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isGrouped ? (
                displayMerchants.map((group: any) => (
                  <TableRow
                    key={group.group_id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleGroupClick(group)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center justify-between">
                        <span>{group.display_name}</span>
                        <span className="text-muted-foreground ml-2 font-semibold">
                          {formatCurrency(group.total_amount)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {group.transaction_count}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(group.average_amount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(group.total_amount)}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                displayMerchants.map((merchant: any, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      <div className="flex items-center justify-between">
                        <span>{merchant.description}</span>
                        <span className="text-muted-foreground ml-2 font-semibold">
                          {formatCurrency(merchant.total)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {merchant.count}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(merchant.average)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(merchant.total)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Group Details Dialog */}
      <Dialog open={showGroupDetails} onOpenChange={setShowGroupDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedGroup?.display_name}</DialogTitle>
            <DialogDescription>
              Merchant group details and transaction patterns
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Transactions</div>
                  <div className="text-2xl font-bold">{selectedGroup.transaction_count}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Average</div>
                  <div className="text-2xl font-bold">{formatCurrency(selectedGroup.average_amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-2xl font-bold">{formatCurrency(selectedGroup.total_amount)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Transaction Patterns ({selectedGroup.patterns.length})</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {selectedGroup.patterns.map((pattern, idx) => (
                    <div key={idx} className="text-sm p-2 bg-muted rounded">
                      {pattern}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

