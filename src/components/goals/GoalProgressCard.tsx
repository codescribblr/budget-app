'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GoalWithDetails } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { MoreVertical, Edit, Trash2, Play, Pause, Target, Calendar, TrendingUp, CreditCard } from 'lucide-react';
import { parseLocalDate } from '@/lib/date-utils';

interface GoalProgressCardProps {
  goal: GoalWithDetails;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: GoalWithDetails['status']) => void;
}

export default function GoalProgressCard({
  goal,
  onEdit,
  onDelete,
  onStatusChange,
}: GoalProgressCardProps) {
  const currentBalance = goal.current_balance || 0;
  const progress = goal.progress_percentage || 0;
  const remaining = goal.remaining_amount || 0;
  const isOnTrack = goal.is_on_track ?? true;

  const getStatusBadge = () => {
    switch (goal.status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'overdue':
        return <Badge className="bg-red-500">Overdue</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500">Paused</Badge>;
      default:
        return <Badge className="bg-blue-500">Active</Badge>;
    }
  };

  const getProgressColor = () => {
    if (goal.goal_type === 'debt-paydown') {
      // Debt paydown: use red/orange colors
      if (goal.status === 'completed') return 'bg-green-500';
      if (goal.status === 'overdue') return 'bg-red-600';
      if (!isOnTrack) return 'bg-orange-500';
      return 'bg-red-500';
    } else {
      // Savings goals: use green/blue colors
      if (goal.status === 'completed') return 'bg-green-500';
      if (goal.status === 'overdue') return 'bg-red-500';
      if (!isOnTrack) return 'bg-yellow-500';
      return 'bg-blue-500';
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{goal.name}</CardTitle>
            <CardDescription className="mt-1">
              {getStatusBadge()}
              {goal.goal_type === 'account-linked' && goal.linked_account && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Linked to {goal.linked_account.name}
                </span>
              )}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {goal.status === 'active' && (
                <DropdownMenuItem onClick={() => onStatusChange('paused')}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </DropdownMenuItem>
              )}
              {goal.status === 'paused' && (
                <DropdownMenuItem onClick={() => onStatusChange('active')}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">
              {goal.goal_type === 'debt-paydown' 
                ? `Paid Off: ${formatCurrency(goal.target_amount - currentBalance)} / ${formatCurrency(goal.target_amount)}`
                : `${formatCurrency(currentBalance)} / ${formatCurrency(goal.target_amount)}`}
            </span>
            <span className="text-sm text-muted-foreground">
              {progress.toFixed(1)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div
            className={`h-2 rounded-full transition-all ${getProgressColor()}`}
            style={{ width: `${Math.min(progress, 100)}%`, marginTop: '-8px' }}
          />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">
              {goal.goal_type === 'debt-paydown' ? 'Remaining Debt' : 'Remaining'}
            </div>
            <div className="font-semibold">{formatCurrency(remaining)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">
              {goal.goal_type === 'debt-paydown' ? 'Monthly Payment' : 'Monthly'}
            </div>
            <div className="font-semibold">{formatCurrency(goal.monthly_contribution)}</div>
          </div>
        </div>

        {/* Timeline Info */}
        {goal.target_date && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Target:</span>
            <span className="font-medium">
              {parseLocalDate(goal.target_date)?.toLocaleDateString()}
            </span>
            {goal.months_remaining !== null && goal.months_remaining !== undefined && goal.months_remaining > 0 && (
              <span className="text-muted-foreground ml-auto">
                {goal.months_remaining} months left
              </span>
            )}
          </div>
        )}

        {/* On Track Indicator */}
        {goal.status === 'active' && (
          <div className="flex items-center gap-2 text-sm">
            {isOnTrack ? (
              <>
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-green-700 dark:text-green-400">On track</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 text-yellow-500 rotate-180" />
                <span className="text-yellow-700 dark:text-yellow-400">
                  Need {formatCurrency(goal.required_monthly_contribution || 0)}/month
                </span>
              </>
            )}
          </div>
        )}

        {/* Projected Completion */}
        {!goal.target_date && goal.projected_completion_date && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>
              Projected: {parseLocalDate(goal.projected_completion_date)?.toLocaleDateString()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

