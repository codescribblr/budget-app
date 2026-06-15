'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, Minus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TransactionDetailDialog from '@/components/transactions/TransactionDetailDialog';

interface AuditRecord {
  id: number;
  category_id: number;
  old_balance: number;
  new_balance: number;
  change_amount: number;
  change_type: string;
  transaction_id: number | null;
  transaction: {
    id: number;
    description: string;
    date: string;
    total_amount: number;
    transaction_type: string;
  } | null;
  user_id: string | null;
  user_email: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
  transaction_date?: string | null;
}

interface CategoryBalanceAuditProps {
  categoryId: number;
  currentBalance?: number;
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  transaction_create: 'Transaction Created',
  transaction_update: 'Transaction Updated',
  transaction_delete: 'Transaction Deleted',
  transaction_import: 'Transaction Imported',
  allocation_batch: 'Batch Allocation',
  allocation_manual: 'Manual Allocation',
  allocation_income: 'Income Allocation',
  transfer_from: 'Transfer Out',
  transfer_to: 'Transfer In',
  manual_edit: 'Manual Edit',
  transaction_merge: 'Transaction Merged',
  income_buffer_fund: 'Income Buffer Funded',
};

function getChangeTypeLabel(record: AuditRecord): string {
  const base = CHANGE_TYPE_LABELS[record.change_type] || record.change_type;
  const phase = record.metadata?.update_phase;

  if (record.change_type === 'transaction_update' && phase === 'reverse') {
    return `${base} (removed from category)`;
  }
  if (record.change_type === 'transaction_update' && phase === 'apply') {
    return `${base} (assigned to category)`;
  }

  return base;
}

function getTransactionDateLabel(record: AuditRecord): string | null {
  const dateValue = record.transaction?.date || record.transaction_date;
  if (!dateValue) return null;

  try {
    return format(new Date(dateValue), 'MMM d, yyyy');
  } catch {
    return null;
  }
}

export default function CategoryBalanceAudit({
  categoryId,
  currentBalance,
}: CategoryBalanceAuditProps) {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [resolvedCurrentBalance, setResolvedCurrentBalance] = useState<number | null>(
    currentBalance ?? null
  );
  const [viewingTransactionId, setViewingTransactionId] = useState<number | null>(null);
  const pageSize = 20;

  const fetchAuditTrail = async (offset: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const response = await fetch(`/api/categories/${categoryId}/audit?limit=${pageSize}&offset=${offset}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit trail');
      }

      const data = await response.json();
      
      if (append) {
        setRecords(prev => [...prev, ...(data.records || [])]);
      } else {
        setRecords(data.records || []);
      }
      
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
      if (typeof data.current_balance === 'number') {
        setResolvedCurrentBalance(data.current_balance);
      }
    } catch (err) {
      console.error('Error fetching audit trail:', err);
      setError('Failed to load audit trail');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    fetchAuditTrail(records.length, true);
  };

  useEffect(() => {
    setResolvedCurrentBalance(currentBalance ?? null);
  }, [currentBalance]);

  useEffect(() => {
    fetchAuditTrail(0, false);
  }, [categoryId]);

  const displayCurrentBalance =
    resolvedCurrentBalance ?? currentBalance ?? records[0]?.new_balance ?? null;

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">{error}</div>
      </Card>
    );
  }

  if (records.length === 0 && !loading) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Balance History</h2>
        {displayCurrentBalance !== null && (
          <p className="text-sm text-muted-foreground mb-4">
            Current balance: <span className="font-medium text-foreground">{formatCurrency(displayCurrentBalance)}</span>
          </p>
        )}
        <div className="text-sm text-muted-foreground">No balance changes recorded yet.</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold">Balance History</h2>
          {displayCurrentBalance !== null && (
            <p className="text-sm text-muted-foreground mt-1">
              Current balance:{' '}
              <span className="font-medium text-foreground">{formatCurrency(displayCurrentBalance)}</span>
            </p>
          )}
          {total > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing {records.length} of {total} records · most recent changes first
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {records.map((record) => {
          const isIncrease = record.change_amount > 0;
          const isDecrease = record.change_amount < 0;
          const changeTypeLabel = getChangeTypeLabel(record);
          const transactionDateLabel = getTransactionDateLabel(record);

          return (
            <div
              key={record.id}
              className="flex items-start justify-between gap-4 p-3 border rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isIncrease && <ArrowUp className="h-4 w-4 text-green-600" />}
                  {isDecrease && <ArrowDown className="h-4 w-4 text-red-600" />}
                  {!isIncrease && !isDecrease && <Minus className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium text-sm">{changeTypeLabel}</span>
                  {record.transaction && (
                    <button
                      onClick={() => setViewingTransactionId(record.transaction!.id)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View transaction
                    </button>
                  )}
                </div>

                {record.transaction && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {record.transaction.description}
                    {transactionDateLabel && (
                      <span className="ml-2">(Transaction date: {transactionDateLabel})</span>
                    )}
                  </div>
                )}

                {record.metadata?.transfer_category_name && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {record.change_type === 'transfer_from' ? 'To' : 'From'}: {record.metadata.transfer_category_name}
                  </div>
                )}

                {record.metadata?.import_file_name && (
                  <div className="text-xs text-muted-foreground mb-1">
                    Imported from: {record.metadata.import_file_name}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                  <span>
                    {formatCurrency(record.old_balance)} → {formatCurrency(record.new_balance)}
                  </span>
                  <span className="font-medium">
                    {isIncrease ? '+' : ''}
                    {formatCurrency(Math.abs(record.change_amount))}
                  </span>
                  <span>
                    {format(new Date(record.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                  {record.user_email && (
                    <span className="text-xs">
                      by {record.user_email}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-4 text-center">
          <Button 
            variant="outline" 
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Loading...
              </>
            ) : (
              `Load More (${total - records.length} remaining)`
            )}
          </Button>
        </div>
      )}

      {viewingTransactionId && (
        <TransactionDetailDialog
          isOpen={!!viewingTransactionId}
          onClose={() => setViewingTransactionId(null)}
          transactionId={viewingTransactionId}
        />
      )}
    </Card>
  );
}
