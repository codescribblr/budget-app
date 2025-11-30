'use client';

import { Sparkles } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useAIUsage } from '@/hooks/use-ai-usage';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

export function AIUsageIndicator() {
  const { stats, loading } = useAIUsage();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const totalUsed = Object.values(stats).reduce((sum, s) => sum + s.used, 0);
  const totalLimit = Object.values(stats).reduce((sum, s) => sum + s.limit, 0);
  const percentage = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  const getColor = () => {
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'default';
    return 'default';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <div className="flex flex-col">
              <div className="text-xs text-muted-foreground">AI Credits</div>
              <div className="flex items-center gap-2">
                <Progress value={percentage} className="w-20 h-2" />
                <span className="text-xs font-medium">
                  {totalUsed}/{totalLimit}
                </span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <div>Chat: {stats.chat.used}/{stats.chat.limit}</div>
            <div>Categorization: {stats.categorization.used}/{stats.categorization.limit}</div>
            <div>Insights: {stats.insights.used}/{stats.insights.limit}</div>
            <div>Reports: {stats.reports.used}/{stats.reports.limit}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

