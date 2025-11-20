'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { GoalWithDetails } from '@/lib/types';
import { Target, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function GoalsWidget() {
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

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
    fetchGoals();
  }, []);

  if (loading) {
    return null;
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goals
          </CardTitle>
          <CardDescription>Track your savings goals</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            No active goals. Create your first goal to start tracking your progress.
          </p>
          <Link href="/goals">
            <Button variant="outline" size="sm">
              Create Goal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goals
            </CardTitle>
            <CardDescription>
              {goals.length} active goal{goals.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Link href="/goals">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
                          {new Date(goal.target_date).toLocaleDateString()}
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
                ({new Date(nextDeadline.target_date!).toLocaleDateString()})
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

