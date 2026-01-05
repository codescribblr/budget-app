import React from 'react';
import { User, TrendingUp, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExampleBoxProps {
  title: string;
  persona?: string;
  situation?: string;
  children: React.ReactNode;
  variant?: 'default' | 'success';
}

export function ExampleBox({ title, persona, situation, children, variant = 'default' }: ExampleBoxProps) {
  return (
    <div
      className={cn(
        'my-6 rounded-lg border-2 p-6',
        variant === 'success'
          ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
          : 'bg-muted/50 border-border'
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className={cn(
            'flex-shrink-0 p-2 rounded-lg',
            variant === 'success'
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-primary/10'
          )}
        >
          <User
            className={cn(
              'h-5 w-5',
              variant === 'success'
                ? 'text-green-600 dark:text-green-400'
                : 'text-primary'
            )}
          />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{title}</h3>
          {persona && <p className="text-sm font-medium text-muted-foreground mt-1">{persona}</p>}
          {situation && <p className="text-sm text-muted-foreground mt-1">{situation}</p>}
        </div>
      </div>
      <div className="text-sm space-y-3">{children}</div>
    </div>
  );
}

interface ExampleStepsProps {
  title: string;
  steps: string[];
}

export function ExampleSteps({ title, steps }: ExampleStepsProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <ol className="space-y-2 ml-6">
        {steps.map((step, idx) => (
          <li key={idx} className="text-sm list-decimal">{step}</li>
        ))}
      </ol>
    </div>
  );
}

interface ExampleResultsProps {
  title: string;
  results: string[];
}

export function ExampleResults({ title, results }: ExampleResultsProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <ul className="space-y-2 ml-6">
        {results.map((result, idx) => (
          <li key={idx} className="text-sm list-disc">{result}</li>
        ))}
      </ul>
    </div>
  );
}


