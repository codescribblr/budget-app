import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparisonColumn {
  title: string;
  description?: string;
  items: {
    label: string;
    value: boolean | string;
  }[];
  highlighted?: boolean;
}

interface ComparisonTableProps {
  columns: ComparisonColumn[];
}

export function ComparisonTable({ columns }: ComparisonTableProps) {
  // Get all unique row labels
  const allLabels = Array.from(
    new Set(columns.flatMap((col) => col.items.map((item) => item.label)))
  );

  return (
    <div className="my-6 overflow-x-auto">
      <div className="inline-block min-w-full align-middle">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))` }}>
          {/* Headers */}
          {columns.map((column, idx) => (
            <div
              key={idx}
              className={cn(
                'rounded-t-lg border-2 p-4',
                column.highlighted
                  ? 'bg-primary/10 border-primary'
                  : 'bg-muted/50 border-border'
              )}
            >
              <h3 className="font-semibold text-lg mb-1">{column.title}</h3>
              {column.description && (
                <p className="text-sm text-muted-foreground">{column.description}</p>
              )}
            </div>
          ))}

          {/* Rows */}
          {allLabels.map((label, rowIdx) => (
            <React.Fragment key={rowIdx}>
              {columns.map((column, colIdx) => {
                const item = column.items.find((i) => i.label === label);
                const value = item?.value;

                return (
                  <div
                    key={colIdx}
                    className={cn(
                      'border-x-2 border-b-2 p-4',
                      rowIdx === allLabels.length - 1 && 'rounded-b-lg',
                      column.highlighted
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background'
                    )}
                  >
                    {colIdx === 0 && (
                      <div className="font-medium text-sm mb-2">{label}</div>
                    )}
                    <div className="flex items-center gap-2">
                      {typeof value === 'boolean' ? (
                        value ? (
                          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )
                      ) : (
                        <span className="text-sm">{value || '—'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

