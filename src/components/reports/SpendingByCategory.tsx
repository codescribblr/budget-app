import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import type { TransactionWithSplits, Category } from '@/lib/types';

interface SpendingByCategoryProps {
  transactions: TransactionWithSplits[];
  categories: Category[];
  onCategoryClick?: (categoryId: number) => void;
  loading?: boolean;
  startDate?: string;
  endDate?: string;
}

export default function SpendingByCategory({ transactions, categories, onCategoryClick, loading = false, startDate, endDate }: SpendingByCategoryProps) {
  // Calculate spending by category
  const categorySpending = new Map<number, number>();

  transactions.forEach(transaction => {
    transaction.splits.forEach(split => {
      const current = categorySpending.get(split.category_id) || 0;
      categorySpending.set(split.category_id, current + split.amount);
    });
  });

  // Create array of categories with spending (exclude system categories like Transfer)
  const categoriesWithSpending = categories
    .filter(cat => !cat.is_system)
    .map(category => {
      const spent = categorySpending.get(category.id) || 0;
      const budget = category.monthly_amount;
      const variance = budget - spent;

      return {
        ...category,
        spent,
        budget,
        variance,
      };
    })
    .filter(cat => cat.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const totalSpent = categoriesWithSpending.reduce((sum, cat) => sum + cat.spent, 0);
  const totalBudget = categoriesWithSpending.reduce((sum, cat) => sum + cat.budget, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>Loading spending data...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

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
          Total spent: {formatCurrency(totalSpent)} | Budget: {formatCurrency(totalBudget)} |
          <span className={totalSpent > totalBudget ? 'text-red-600' : 'text-green-600'}>
            {' '}{totalSpent > totalBudget ? 'Over' : 'Under'} by {formatCurrency(Math.abs(totalBudget - totalSpent))}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriesWithSpending.map((category) => {
                const isOverBudget = category.spent > category.budget;

                return (
                  <TableRow
                    key={category.id}
                    className={onCategoryClick ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => onCategoryClick?.(category.id)}
                  >
                    <TableCell>
                      <div className="font-medium">{category.name}</div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(category.spent)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(category.budget)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                      {isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(category.variance))}
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

