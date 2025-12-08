import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  // Calculate spending by category (expenses add, income subtracts)
  const categorySpending = new Map<number, number>();

  transactions.forEach(transaction => {
    if (!transaction.splits || transaction.splits.length === 0) {
      return; // Skip transactions without splits
    }
    transaction.splits.forEach(split => {
      if (!split.category_id) {
        return; // Skip splits without category_id
      }
      const current = categorySpending.get(split.category_id) || 0;
      const amount = transaction.transaction_type === 'expense'
        ? split.amount      // Expenses add to spending
        : -split.amount;     // Income subtracts from spending
      categorySpending.set(split.category_id, current + amount);
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

  // Calculate transaction breakdown (excluding system-only transactions from total)
  const categorizedTransactions = transactions.filter(t =>
    t.splits.some(split => {
      const category = categories.find(c => c.id === split.category_id);
      return category && !category.is_system;
    })
  ).length;

  const systemTransactions = transactions.filter(t =>
    t.splits.every(split => {
      const category = categories.find(c => c.id === split.category_id);
      return category?.is_system;
    })
  ).length;

  const uncategorizedTransactions = transactions.filter(t => {
    const hasCategorizedSplit = t.splits.some(split => {
      const category = categories.find(c => c.id === split.category_id);
      return category && !category.is_system;
    });
    const isSystemOnly = t.splits.every(split => {
      const category = categories.find(c => c.id === split.category_id);
      return category?.is_system;
    });
    return !hasCategorizedSplit && !isSystemOnly;
  }).length;

  // Total excludes system-only transactions
  const totalTransactions = categorizedTransactions + uncategorizedTransactions;

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
    // Check if there are any transactions at all
    const hasTransactions = transactions.length > 0;
    
    // Check for non-system transactions more accurately
    // First, get all unique category IDs from transaction splits
    const transactionCategoryIds = new Set<number>();
    transactions.forEach(t => {
      t.splits.forEach(split => {
        if (split.category_id) {
          transactionCategoryIds.add(split.category_id);
        }
      });
    });
    
    // Then check if any of those categories exist and are non-system
    const hasNonSystemTransactions = Array.from(transactionCategoryIds).some(categoryId => {
      const category = categories.find(c => c.id === categoryId);
      return category && !category.is_system;
    });
    
    // Also check what categories actually have spending calculated
    const categoriesWithAnySpending = Array.from(categorySpending.entries())
      .filter(([categoryId, spent]) => spent !== 0)
      .map(([categoryId, spent]) => {
        const category = categories.find(c => c.id === categoryId);
        return { categoryId, spent, categoryName: category?.name || 'Unknown', isSystem: category?.is_system || false };
      });
    
    let message = 'No transactions in selected period';
    if (hasTransactions) {
      if (categories.length === 0) {
        message = 'Categories not loaded yet';
      } else if (!hasNonSystemTransactions && transactionCategoryIds.size > 0) {
        message = `All ${transactionCategoryIds.size} transaction categories are system categories`;
      } else if (categoriesWithAnySpending.length === 0) {
        message = 'Transactions exist but all have zero spending (income equals expenses)';
      } else if (categoriesWithAnySpending.every(cat => cat.spent <= 0)) {
        message = 'All transactions in selected period are income (no expenses)';
      } else {
        message = 'No categories with positive spending in selected period';
      }
    }
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dotted border-muted-foreground">
                  Total spent: {formatCurrency(totalSpent)}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-semibold">Transaction Breakdown</div>
                  <div className="text-sm">
                    <div>Total Transactions: {totalTransactions}</div>
                    <div className="ml-2 space-y-0.5 mt-1">
                      <div>• Categorized: {categorizedTransactions}</div>
                      <div>• Uncategorized: {uncategorizedTransactions}</div>
                      <div>• System: {systemTransactions}</div>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {' | '}Budget: {formatCurrency(totalBudget)} |
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

