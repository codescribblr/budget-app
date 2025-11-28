'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAIUsage } from '@/hooks/use-ai-usage';
import { useRotatingLoadingMessage } from '@/hooks/use-rotating-loading-message';

interface AICategorizeButtonProps {
  transactionIds: number[];
  onCategorized?: () => void;
  disabled?: boolean;
}

export function AICategorizeButton({
  transactionIds,
  onCategorized,
  disabled = false,
}: AICategorizeButtonProps) {
  const [loading, setLoading] = useState(false);
  const { stats, refreshStats } = useAIUsage();
  const loadingMessage = useRotatingLoadingMessage(3000, loading);

  const handleCategorize = async () => {
    if (transactionIds.length === 0) {
      toast.error('No transactions selected');
      return;
    }

    if (!stats || stats.categorization.used >= stats.categorization.limit) {
      toast.error('Daily categorization limit reached. Try again tomorrow.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 429) {
          toast.error(`Rate limit exceeded. ${error.remaining || 0} requests remaining.`);
        } else {
          toast.error(error.error || 'Failed to categorize transactions');
        }
        return;
      }

      const data = await response.json();
      toast.success(`AI categorized ${data.results?.length || 0} transactions`);
      refreshStats();
      onCategorized?.();
    } catch (error) {
      console.error('Error categorizing transactions:', error);
      toast.error('Failed to categorize transactions');
    } finally {
      setLoading(false);
    }
  };

  const canCategorize =
    !disabled &&
    !loading &&
    transactionIds.length > 0 &&
    stats &&
    stats.categorization.used < stats.categorization.limit;

  return (
    <Button
      onClick={handleCategorize}
      disabled={!canCategorize}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="max-w-[200px] truncate">{loadingMessage}</span>
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          AI Categorize ({transactionIds.length})
        </>
      )}
    </Button>
  );
}

