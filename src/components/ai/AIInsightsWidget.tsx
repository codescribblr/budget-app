'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAIUsage } from '@/hooks/use-ai-usage';
import { Skeleton } from '@/components/ui/skeleton';
import type { MonthlyInsights } from '@/lib/ai/types';

export function AIInsightsWidget() {
  const [insights, setInsights] = useState<MonthlyInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { stats, refreshStats } = useAIUsage();

  const fetchInsights = async (regenerate = false) => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: new Date().toISOString().slice(0, 7),
          regenerate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          toast.error('Daily insights limit reached. Try again tomorrow.');
        } else {
          toast.error(error.error || 'Failed to load insights');
        }
        return;
      }

      const data = await response.json();
      setInsights(data.insights);
      if (!data.cached) {
        refreshStats();
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
      toast.error('Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    try {
      await fetchInsights(true);
      toast.success('Insights generated successfully');
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const canGenerate = stats ? stats.insights.used < stats.insights.limit : false;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Insights
          </CardTitle>
          {canGenerate && (
            <Button
              size="sm"
              variant="outline"
              onClick={generateInsights}
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : insights ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{insights.summary}</p>

            {insights.insights.slice(0, 3).map((insight, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  insight.type === 'positive'
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                    : insight.type === 'warning'
                    ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
                    : 'border-muted bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-semibold text-sm">{insight.title}</h4>
                  <Badge
                    variant={
                      insight.type === 'positive'
                        ? 'default'
                        : insight.type === 'warning'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className="text-xs"
                  >
                    {insight.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                {insight.action && (
                  <p className="text-xs font-medium text-primary">{insight.action}</p>
                )}
              </div>
            ))}

            {insights.insights.length > 3 && (
              <Button variant="link" className="w-full">
                View All Insights ({insights.insights.length})
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No insights available yet.</p>
            {canGenerate && (
              <Button
                size="sm"
                variant="outline"
                onClick={generateInsights}
                className="mt-4"
                disabled={generating}
              >
                Generate Insights
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

