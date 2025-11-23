'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface WasThisHelpfulProps {
  articlePath: string;
}

export function WasThisHelpful({ articlePath }: WasThisHelpfulProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not-helpful' | null>(null);
  const [showTextarea, setShowTextarea] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = async (isHelpful: boolean) => {
    setFeedback(isHelpful ? 'helpful' : 'not-helpful');
    
    if (!isHelpful) {
      setShowTextarea(true);
    } else {
      await submitFeedback(isHelpful, '');
    }
  };

  const submitFeedback = async (isHelpful: boolean, text: string) => {
    try {
      // TODO: Implement API call to save feedback
      // await fetch('/api/help/feedback', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     articlePath,
      //     wasHelpful: isHelpful,
      //     feedbackText: text,
      //   }),
      // });
      
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const handleSubmitText = async () => {
    await submitFeedback(false, feedbackText);
  };

  if (submitted) {
    return (
      <div className="border rounded-lg p-6 text-center bg-muted/50">
        <p className="text-sm font-medium">Thank you for your feedback!</p>
        <p className="text-xs text-muted-foreground mt-1">
          We use your feedback to improve our documentation.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6">
      <p className="text-sm font-medium mb-4">Was this article helpful?</p>
      
      {feedback === null ? (
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFeedback(true)}
            className="flex-1"
          >
            <ThumbsUp className="h-4 w-4 mr-2" />
            Yes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleFeedback(false)}
            className="flex-1"
          >
            <ThumbsDown className="h-4 w-4 mr-2" />
            No
          </Button>
        </div>
      ) : showTextarea ? (
        <div className="space-y-3">
          <Textarea
            placeholder="What could we improve? (optional)"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmitText}>
              Submit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => submitFeedback(false, '')}
            >
              Skip
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

