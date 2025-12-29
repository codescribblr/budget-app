'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Brain, RefreshCw, Loader2, Sparkles, Crown, ChevronUp, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { useAIUsage } from '@/hooks/use-ai-usage';
import { useRotatingLoadingMessage } from '@/hooks/use-rotating-loading-message';
import { useFeature } from '@/contexts/FeatureContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { DataSummary } from '@/components/ai/DataSummary';
import type { MonthlyInsights } from '@/lib/ai/types';

export function AIInsightsWidget() {
  const router = useRouter();
  const aiChatEnabled = useFeature('ai_chat');
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const [insights, setInsights] = useState<MonthlyInsights | null>(null);
  const [insightId, setInsightId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [metadata, setMetadata] = useState<{
    transactionCount?: number;
    transactionTotal?: number;
    ytdTransactionCount?: number;
    ytdTransactionTotal?: number;
    dateRange?: { start: string; end: string };
    ytdDateRange?: { start: string; end: string };
    categoriesSearched?: number;
    goalsAccessed?: number;
    accountsAccessed?: number;
    creditCardsAccessed?: number;
    loansAccessed?: number;
    incomeBufferAccessed?: boolean;
    incomeSettingsAccessed?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isOpen, setIsOpen] = useLocalStorage('dashboard-card-ai-insights', true);
  const [showAllInsights, setShowAllInsights] = useState(false);
  const { stats, refreshStats } = useAIUsage();
  const loadingMessage = useRotatingLoadingMessage(5000, generating);

  // Only show insights if user has premium AND feature is enabled
  const canAccess = isPremium && aiChatEnabled;

  // Load cached insights on mount (don't auto-generate)
  useEffect(() => {
    if (canAccess && !subscriptionLoading) {
      loadCachedInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess, subscriptionLoading]);

  const loadCachedInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: new Date().toISOString().slice(0, 7),
          regenerate: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.insights) {
          setInsights(data.insights);
          // Metadata might be in data.metadata or data.insights.metadata
          setMetadata(data.metadata || data.insights?.metadata || null);
          setInsightId(data.insightId || null);
          setFeedback(data.feedback || null);
        } else {
          // No cached insights - ensure state is cleared
          setInsights(null);
          setMetadata(null);
          setInsightId(null);
          setFeedback(null);
        }
      }
    } catch (error) {
      console.error('Error loading cached insights:', error);
      // On error, ensure state is cleared
      setInsights(null);
      setMetadata(null);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: new Date().toISOString().slice(0, 7),
          regenerate: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          toast.error('Daily insights limit reached. Try again tomorrow.');
        } else {
          toast.error(error.error || 'Failed to generate insights');
        }
        return;
      }

      const data = await response.json();
      if (data.insights) {
        setInsights(data.insights);
        // Metadata might be in data.metadata or data.insights.metadata
        setMetadata(data.metadata || data.insights?.metadata || null);
        setInsightId(data.insightId || null);
        setFeedback(data.feedback || null);
      }
      refreshStats();
      toast.success('Insights generated successfully');
    } catch (error) {
      console.error('Error generating insights:', error);
      toast.error('Failed to generate insights');
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = stats ? stats.dashboard_insights.used < stats.dashboard_insights.limit : false;
  const remainingInsights = stats ? stats.dashboard_insights.limit - stats.dashboard_insights.used : 0;

  const handleFeedback = async (feedbackType: 'positive' | 'negative') => {
    if (!insightId) return;

    setSubmittingFeedback(true);
    try {
      const response = await fetch('/api/ai/insights/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          insightId,
          feedback: feedbackType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Failed to save feedback');
        return;
      }

      const data = await response.json();
      setFeedback(data.feedback);
      toast.success('Thank you for your feedback!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to save feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // If feature is disabled, hide widget completely (don't show upgrade prompt for premium users who disabled it)
  if (!canAccess) {
    // Only show upgrade prompt if user doesn't have premium
    if (!isPremium) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Insights
            </CardTitle>
            <CardDescription>Get intelligent insights about your finances</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-4 space-y-4">
            <p className="text-muted-foreground">
              AI Insights is a premium feature
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
        </Card>
      );
    }
    // Premium user disabled the feature - hide widget completely
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="relative">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer">
                <Brain className="h-5 w-5 text-purple-500" />
                <CardTitle>AI Insights</CardTitle>
              </div>
            </CollapsibleTrigger>
            <div className="flex flex-col items-end gap-1">
              {insights && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateInsights}
                    disabled={generating || !canGenerate}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="max-w-[200px] truncate">{loadingMessage}</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </>
                    )}
                  </Button>
                  {stats && (
                    <p className="text-xs text-muted-foreground">
                      {remainingInsights} insight{remainingInsights !== 1 ? 's' : ''} remaining today
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pb-8">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : generating ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground italic py-4">
                  <Sparkles className="h-4 w-4 animate-pulse text-purple-500" />
                  {loadingMessage}
                </div>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : insights ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{insights.summary}</p>

                {(showAllInsights ? insights.insights : insights.insights.slice(0, 3)).map((insight, i) => (
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
                  <Button 
                    variant="link" 
                    className="w-full"
                    onClick={() => setShowAllInsights(!showAllInsights)}
                  >
                    {showAllInsights 
                      ? 'Show Less'
                      : `View All Insights (${insights.insights.length})`
                    }
                  </Button>
                )}

                {metadata && (
                  <DataSummary
                    transactionCount={metadata.transactionCount || 0}
                    transactionTotal={metadata.transactionTotal}
                    ytdTransactionCount={metadata.ytdTransactionCount}
                    ytdTransactionTotal={metadata.ytdTransactionTotal}
                    dateRange={metadata.dateRange || { start: '', end: '' }}
                    ytdDateRange={metadata.ytdDateRange}
                    categoriesSearched={metadata.categoriesSearched || 0}
                    merchantsSearched={0}
                    goalsAccessed={metadata.goalsAccessed}
                    accountsAccessed={metadata.accountsAccessed}
                    creditCardsAccessed={metadata.creditCardsAccessed}
                    loansAccessed={metadata.loansAccessed}
                    incomeBufferAccessed={metadata.incomeBufferAccessed}
                    incomeSettingsAccessed={metadata.incomeSettingsAccessed}
                  />
                )}

                {/* Feedback buttons - only show if no feedback has been provided */}
                {insightId && !feedback && (
                  <div className="mt-4 pt-4 border-t border-muted">
                    <p className="text-xs text-muted-foreground mb-2 text-center">
                      Was this insight helpful?
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFeedback('positive')}
                        disabled={submittingFeedback}
                        className="flex items-center gap-2"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        Yes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFeedback('negative')}
                        disabled={submittingFeedback}
                        className="flex items-center gap-2"
                      >
                        <ThumbsDown className="h-4 w-4" />
                        No
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm mb-4">No insights available yet.</p>
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
                        <span className="max-w-[200px] truncate">{loadingMessage}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Insights
                      </>
                    )}
                  </Button>
                )}
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

