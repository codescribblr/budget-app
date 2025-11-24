import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  text: string;
  subtext?: string;
}

interface VisualChecklistProps {
  title?: string;
  items: ChecklistItem[];
  variant?: 'default' | 'compact';
}

export function VisualChecklist({ title, items, variant = 'default' }: VisualChecklistProps) {
  return (
    <div className="my-6 rounded-lg border bg-card p-6">
      {title && <h3 className="font-semibold text-lg mb-4">{title}</h3>}
      <div className={cn('space-y-3', variant === 'compact' && 'space-y-2')}>
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex-1">
              <div className={cn('text-sm', variant === 'default' && 'font-medium')}>
                {item.text}
              </div>
              {item.subtext && (
                <div className="text-xs text-muted-foreground mt-1">{item.subtext}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

