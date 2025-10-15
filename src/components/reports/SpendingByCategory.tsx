import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';

interface SpendingByCategoryProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
}

export default function SpendingByCategory({ transactions, categories }: SpendingByCategoryProps) {
  // Calculate spending by category
  const categorySpending = new Map<number, number>();
  
  transactions.forEach(transaction => {
    transaction.splits.forEach(split => {
      const current = categorySpending.get(split.category_id) || 0;
      categorySpending.set(split.category_id, current + split.amount);
    });
  });

  // Create array of categories with spending
  const categoriesWithSpending = categories
    .map(category => ({
      ...category,
      spent: categorySpending.get(category.id) || 0,
    }))
    .filter(cat => cat.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const totalSpent = categoriesWithSpending.reduce((sum, cat) => sum + cat.spent, 0);

  if (categoriesWithSpending.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>No transactions in selected period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>
          Total spent: {formatCurrency(totalSpent)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">% of Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriesWithSpending.map((category) => {
                const percentage = (category.spent / totalSpent) * 100;
                
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <Progress value={percentage} className="h-2 mt-1" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(category.spent)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

