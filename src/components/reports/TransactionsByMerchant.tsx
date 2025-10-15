import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits } from '@/lib/types';

interface TransactionsByMerchantProps {
  transactions: TransactionWithSplits[];
}

export default function TransactionsByMerchant({ transactions }: TransactionsByMerchantProps) {
  // Group transactions by description (merchant)
  const merchantSpending = new Map<string, { count: number; total: number }>();
  
  transactions.forEach(transaction => {
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

  const totalSpent = transactions.reduce((sum, t) => sum + t.total_amount, 0);

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
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Average</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {merchantsArray.map((merchant, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{merchant.description}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {merchant.count}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(merchant.total)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatCurrency(merchant.average)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

