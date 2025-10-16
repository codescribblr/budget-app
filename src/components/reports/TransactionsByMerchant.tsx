import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';

interface TransactionsByMerchantProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
  includeSystemCategories: boolean;
}

export default function TransactionsByMerchant({ transactions, categories, includeSystemCategories }: TransactionsByMerchantProps) {
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

  // Group transactions by description (merchant)
  const merchantSpending = new Map<string, { count: number; total: number }>();

  filteredTransactions.forEach(transaction => {
    const current = merchantSpending.get(transaction.description) || { count: 0, total: 0 };
    merchantSpending.set(transaction.description, {
      count: current.count + 1,
      total: current.total + transaction.total_amount,
    });
  });

  // Convert to array and sort by total spending
  const merchantsArray = Array.from(merchantSpending.entries())
    .map(([description, data]) => ({
      description,
      count: data.count,
      total: data.total,
      average: data.total / data.count,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // Top 10

  const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.total_amount, 0);

  if (merchantsArray.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Merchants</CardTitle>
          <CardDescription>No transactions in selected period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Merchants</CardTitle>
        <CardDescription>
          Top 10 by total spending
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant/Description</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead className="text-right">Average</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchantsArray.map((merchant, index) => (
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
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

