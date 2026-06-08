'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';

interface DataSummaryProps {
  transactionCount: number;
  transactionTotal?: number;
  ytdTransactionCount?: number;
  ytdTransactionTotal?: number;
  dateRange: { start: string; end: string };
  ytdDateRange?: { start: string; end: string };
  categoriesSearched: number;
  merchantsSearched: number;
  goalsAccessed?: number;
  loansAccessed?: number;
  accountsAccessed?: number;
  creditCardsAccessed?: number;
  incomeBufferAccessed?: boolean;
  incomeSettingsAccessed?: boolean;
}

export function DataSummary({
  transactionCount,
  transactionTotal,
  ytdTransactionCount,
  ytdTransactionTotal,
  dateRange,
  ytdDateRange,
  categoriesSearched,
  merchantsSearched,
  goalsAccessed,
  loansAccessed,
  accountsAccessed,
  creditCardsAccessed,
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
    (creditCardsAccessed !== undefined && creditCardsAccessed > 0) ||
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
          <div>• Date range: {dateRange.start} to {dateRange.end}</div>
          {transactionCount > 0 && transactionTotal !== undefined ? (
            <>
              <div>• {transactionCount} transaction{transactionCount !== 1 ? 's' : ''} analyzed this month (Total: {formatCurrency(transactionTotal)})</div>
            </>
          ) : (
            <div>• No transactions found this month</div>
          )}
          {ytdTransactionCount !== undefined && ytdTransactionCount > 0 && ytdTransactionTotal !== undefined ? (
            <>
              <div>• {ytdTransactionCount} transaction{ytdTransactionCount !== 1 ? 's' : ''} analyzed year-to-date {ytdDateRange ? `(${ytdDateRange.start} to ${ytdDateRange.end})` : ''} (Total: {formatCurrency(ytdTransactionTotal)})</div>
            </>
          ) : ytdTransactionCount !== undefined && ytdTransactionCount === 0 ? (
            <div>• No transactions found year-to-date</div>
          ) : null}
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
          {creditCardsAccessed !== undefined && creditCardsAccessed > 0 && (
            <div>• {creditCardsAccessed} credit card{creditCardsAccessed !== 1 ? 's' : ''} accessed</div>
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


