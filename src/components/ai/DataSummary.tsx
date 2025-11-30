'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DataSummaryProps {
  transactionCount: number;
  dateRange: { start: string; end: string };
  categoriesSearched: number;
  merchantsSearched: number;
  goalsAccessed?: number;
  loansAccessed?: number;
  accountsAccessed?: number;
  incomeBufferAccessed?: boolean;
  incomeSettingsAccessed?: boolean;
}

export function DataSummary({
  transactionCount,
  dateRange,
  categoriesSearched,
  merchantsSearched,
  goalsAccessed,
  loansAccessed,
  accountsAccessed,
  incomeBufferAccessed,
  incomeSettingsAccessed,
}: DataSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const hasData = transactionCount > 0 || 
    categoriesSearched > 0 || 
    merchantsSearched > 0 ||
    (goalsAccessed !== undefined && goalsAccessed > 0) ||
    (loansAccessed !== undefined && loansAccessed > 0) ||
    (accountsAccessed !== undefined && accountsAccessed > 0) ||
    incomeBufferAccessed ||
    incomeSettingsAccessed;

  return (
    <div className="mt-2 border-t border-muted pt-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        <Database className="h-3 w-3 mr-1" />
        Data Used
        {expanded ? (
          <ChevronUp className="h-3 w-3 ml-1" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-1" />
        )}
      </Button>
      {expanded && (
        <div className="mt-2 text-xs text-muted-foreground space-y-1 pl-4">
          {transactionCount > 0 && (
            <>
              <div>• {transactionCount} transactions analyzed</div>
              <div>• Date range: {dateRange.start} to {dateRange.end}</div>
            </>
          )}
          {categoriesSearched > 0 && (
            <div>• {categoriesSearched} categories searched</div>
          )}
          {merchantsSearched > 0 && (
            <div>• {merchantsSearched} unique merchants searched</div>
          )}
          {goalsAccessed !== undefined && goalsAccessed > 0 && (
            <div>• {goalsAccessed} goal{goalsAccessed !== 1 ? 's' : ''} accessed</div>
          )}
          {loansAccessed !== undefined && loansAccessed > 0 && (
            <div>• {loansAccessed} loan{loansAccessed !== 1 ? 's' : ''} accessed</div>
          )}
          {accountsAccessed !== undefined && accountsAccessed > 0 && (
            <div>• {accountsAccessed} account{accountsAccessed !== 1 ? 's' : ''} accessed</div>
          )}
          {incomeBufferAccessed && (
            <div>• Income buffer accessed</div>
          )}
          {incomeSettingsAccessed && (
            <div>• Income settings accessed</div>
          )}
        </div>
      )}
    </div>
  );
}

