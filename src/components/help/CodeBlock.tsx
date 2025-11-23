import React from 'react';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  return (
    <pre className={cn(
      'bg-muted rounded-lg p-4 overflow-x-auto my-4',
      'border border-border',
      className
    )}>
      <code className="text-sm font-mono">{children}</code>
    </pre>
  );
}

interface InlineCodeProps {
  children: React.ReactNode;
}

export function InlineCode({ children }: InlineCodeProps) {
  return (
    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono border border-border">
      {children}
    </code>
  );
}

