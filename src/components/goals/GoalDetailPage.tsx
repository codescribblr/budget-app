'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';
import { formatCurrency } from '@/lib/utils';
import { parseLocalDate } from '@/lib/date-utils';
import type { GoalWithDetails } from '@/lib/types';
import type { EnvelopeGoalBreakdown } from '@/lib/goals/calculations';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/api-error-handler';
import { ArrowLeft } from 'lucide-react';

interface GoalDetailPageProps {
  goalId: string;
}

export function GoalDetailContent({
  goal,
  breakdown,
}: {
  goal: GoalWithDetails;
  breakdown: EnvelopeGoalBreakdown | null;
}) {
  const current = goal.current_balance || 0;
  const progress = goal.progress_percentage || 0;
  const leftover = breakdown?.leftover ?? goal.envelope_leftover ?? 0;
  const paid = breakdown?.categorized_spending ?? goal.categorized_spending ?? 0;
  const statusLabel = goal.status.charAt(0).toUpperCase() + goal.status.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" asChild>
          <Link href="/goals">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Goals
          </Link>
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-bold">{goal.name}</h1>
          <Badge>{statusLabel}</Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          {formatCurrency(current)} of {formatCurrency(goal.target_amount)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
          <CardDescription>
            {progress.toFixed(1)}% toward {formatCurrency(goal.target_amount)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={Math.min(progress, 100)} className="h-2" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Toward goal</div>
              <div className="font-semibold">{formatCurrency(current)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Remaining</div>
              <div className="font-semibold">{formatCurrency(goal.remaining_amount || 0)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Monthly</div>
              <div className="font-semibold">{formatCurrency(goal.monthly_contribution)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Target date</div>
              <div className="font-semibold">
                {goal.target_date
                  ? parseLocalDate(goal.target_date)?.toLocaleDateString()
                  : 'None'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {goal.goal_type === 'envelope' && (
        <Card>
          <CardHeader>
            <CardTitle>How this total is calculated</CardTitle>
            <CardDescription>
              Money still in the envelope plus payments still categorized here.
              Moving money to another envelope does not count.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Still in envelope</div>
                <div className="font-semibold">{formatCurrency(leftover)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Paid from this category</div>
                <div className="font-semibold">{formatCurrency(paid)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Goal total</div>
                <div className="font-semibold">{formatCurrency(current)}</div>
              </div>
            </div>

            {breakdown && breakdown.items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>What counted</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.items.map((item, index) => (
                    <TableRow key={`${item.kind}-${item.transaction_id ?? index}`}>
                      <TableCell>
                        {item.date
                          ? parseLocalDate(item.date)?.toLocaleDateString()
                          : 'Current'}
                      </TableCell>
                      <TableCell>
                        {item.kind === 'leftover' && goal.linked_category ? (
                          <Link
                            href={`/categories/${goal.linked_category.id}`}
                            className="hover:underline"
                          >
                            {item.description}
                          </Link>
                        ) : (
                          item.description
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell />
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(current)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No money in this envelope and no payments in this category yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {goal.goal_type === 'account-linked' && goal.linked_account && (
        <Card>
          <CardHeader>
            <CardTitle>How this total is calculated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This goal tracks the balance of {goal.linked_account.name}:{' '}
              {formatCurrency(goal.linked_account.balance)}.
            </p>
          </CardContent>
        </Card>
      )}

      {goal.goal_type === 'debt-paydown' && (
        <Card>
          <CardHeader>
            <CardTitle>How this total is calculated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This goal tracks remaining debt
              {goal.linked_credit_card
                ? ` on ${goal.linked_credit_card.name}`
                : goal.linked_loan
                  ? ` on ${goal.linked_loan.name}`
                  : ''}
              . The total shown is how much is left to pay, not money in an envelope.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function GoalDetailPage({ goalId }: GoalDetailPageProps) {
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<GoalWithDetails | null>(null);
  const [breakdown, setBreakdown] = useState<EnvelopeGoalBreakdown | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const [goalRes, progressRes] = await Promise.all([
          fetch(`/api/goals/${goalId}`),
          fetch(`/api/goals/${goalId}/progress`),
        ]);

        if (!goalRes.ok) {
          if (goalRes.status === 403) return;
          const msg = await handleApiError(goalRes, 'Failed to load goal');
          throw new Error(msg || 'Failed to load goal');
        }

        const goalData = await goalRes.json();
        setGoal(goalData);

        if (progressRes.ok) {
          const progressData = await progressRes.json();
          setBreakdown(progressData.breakdown || null);
        }
      } catch (error: any) {
        console.error('Error fetching goal detail:', error);
        toast.error(error.message || 'Failed to load goal');
        setGoal(null);
      } finally {
        setLoading(false);
      }
    };

    if (goalId) {
      fetchDetail();
    }
  }, [goalId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!goal) {
    return (
      <PremiumFeatureGate
        featureName="Goals & Debt Tracking"
        featureDescription="Track your savings goals and see how progress is calculated"
      >
        <div className="space-y-4">
          <Button variant="outline" asChild>
            <Link href="/goals">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Goals
            </Link>
          </Button>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">Goal not found.</div>
          </Card>
        </div>
      </PremiumFeatureGate>
    );
  }

  return (
    <PremiumFeatureGate
      featureName="Goals & Debt Tracking"
      featureDescription="Track your savings goals and see how progress is calculated"
    >
      <GoalDetailContent goal={goal} breakdown={breakdown} />
    </PremiumFeatureGate>
  );
}
