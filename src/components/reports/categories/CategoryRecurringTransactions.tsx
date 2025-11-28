'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

export default function CategoryRecurringTransactions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recurring Transactions
        </CardTitle>
        <CardDescription>
          Track and manage recurring transactions for this category
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Recurring transaction tracking is coming soon. This feature will help you identify
            and manage regular expenses and income in this category.
          </p>
          <Badge variant="secondary" className="mt-4">
            Feature in Development
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

