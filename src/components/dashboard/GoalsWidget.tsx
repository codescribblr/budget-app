'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { GoalWithDetails } from '@/lib/types';
import { Target, Calendar, TrendingUp, ArrowRight, Crown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { parseLocalDate } from '@/lib/date-utils';
import { useFeature } from '@/contexts/FeatureContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface GoalsWidgetProps {
  disabled?: boolean;
}

export default function GoalsWidget({ disabled = false }: GoalsWidgetProps) {
  const router = useRouter();
  const goalsEnabled = useFeature('goals');
  const { isPremium } = useSubscription();
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useLocalStorage('dashboard-card-goals', true);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch('/api/goals?status=active');
        if (response.ok) {
          const data = await response.json();
          setGoals(data.slice(0, 3)); // Show top 3 active goals
        }
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if feature is enabled
    if (goalsEnabled) {
      fetchGoals();
    } else {
      setLoading(false);
    }
  }, [goalsEnabled]);

  if (loading) {
    return null;
  }

  // If feature is disabled, hide widget completely (don't show upgrade prompt for premium users who disabled it)
  if (!goalsEnabled) {
    // Only show upgrade prompt if user doesn't have premium
    if (!isPremium) {
      return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card className="relative">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Goals
                  </CardTitle>
                  <CardDescription>Track your savings goals</CardDescription>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pb-8 text-center py-4 space-y-4">
                <p className="text-muted-foreground">
                  Goals & Debt Tracking is a premium feature
                </p>
                <Button
                  onClick={() => router.push('/settings/subscription')}
                  size="sm"
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white border-0"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Upgrade to Premium
                </Button>
              </CardContent>
              {isOpen && (
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute bottom-4 right-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                  aria-label="Collapse card"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              )}
            </CollapsibleContent>
          </Card>
        </Collapsible>
      );
    }
    // Premium user disabled the feature - hide widget completely
    return null;
  }

  if (goals.length === 0) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="relative">
          <CardHeader>
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goals
                </CardTitle>
                <CardDescription>Track your savings goals</CardDescription>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pb-8">
              <p className="text-sm text-muted-foreground mb-4">
                No active goals. Create your first goal to start tracking your progress.
              </p>
              <Link href="/goals">
                <Button variant="outline" size="sm" disabled={disabled}>
                  Create Goal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
            {isOpen && (
              <button
                onClick={() => setIsOpen(false)}
                className="absolute bottom-4 right-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                aria-label="Collapse card"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
            )}
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + (g.current_balance || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  // Find next deadline
  const goalsWithDates = goals.filter(g => g.target_date);
  const nextDeadline = goalsWithDates.length > 0
    ? goalsWithDates.sort((a, b) => 
        new Date(a.target_date!).getTime() - new Date(b.target_date!).getTime()
      )[0]
    : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="relative">
        <CardHeader>
          <div className="flex flex-wrap items-start gap-2">
            <CollapsibleTrigger asChild>
              <div className="flex-1 min-w-[200px] cursor-pointer">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goals
                </CardTitle>
                <CardDescription>
                  {goals.length} active goal{goals.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </CollapsibleTrigger>
            <Link href="/goals" className="ml-auto">
              <Button variant="ghost" size="sm" className="shrink-0">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pb-8 space-y-4">
        {/* Overall Progress */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {formatCurrency(totalCurrent)} / {formatCurrency(totalTarget)}
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Goal List */}
        <div className="space-y-3">
          {goals.map((goal) => {
            const progress = goal.progress_percentage || 0;
            return (
              <div key={goal.id} className="space-y-1">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{goal.name}</span>
                      {goal.is_on_track === false && (
                        <Badge variant="outline" className="text-xs">
                          Behind
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{formatCurrency(goal.current_balance || 0)} / {formatCurrency(goal.target_amount)}</span>
                      {goal.target_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {parseLocalDate(goal.target_date)?.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            );
          })}
        </div>

        {/* Next Deadline */}
        {nextDeadline && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Next deadline:</span>
              <span className="font-medium">{nextDeadline.name}</span>
              <span className="text-muted-foreground">
                ({parseLocalDate(nextDeadline.target_date!)?.toLocaleDateString()})
              </span>
            </div>
          </div>
        )}
          </CardContent>
          {isOpen && (
            <button
              onClick={() => setIsOpen(false)}
              className="absolute bottom-4 right-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
              aria-label="Collapse card"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}


