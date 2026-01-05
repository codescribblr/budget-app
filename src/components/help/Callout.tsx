import React from 'react';
import { AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalloutType = 'info' | 'tip' | 'warning' | 'important';

interface CalloutProps {
  type: CalloutType;
  title?: string;
  children: React.ReactNode;
}

const calloutConfig = {
  info: {
    icon: Info,
    className: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    iconClassName: 'text-blue-600 dark:text-blue-400',
  },
  tip: {
    icon: CheckCircle,
    className: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    iconClassName: 'text-green-600 dark:text-green-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
    iconClassName: 'text-yellow-600 dark:text-yellow-400',
  },
  important: {
    icon: AlertCircle,
    className: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
    iconClassName: 'text-red-600 dark:text-red-400',
  },
};

export function Callout({ type, title, children }: CalloutProps) {
  const config = calloutConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn('border rounded-lg p-4 my-4', config.className)}>
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconClassName)} />
        <div className="flex-1">
          {title && (
            <div className="font-semibold mb-1">{title}</div>
          )}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}


