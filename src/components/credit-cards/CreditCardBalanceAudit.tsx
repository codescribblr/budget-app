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
  credit_card_id: number;
  old_available_credit: number;
  new_available_credit: number;
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
}

interface CreditCardBalanceAuditProps {
  creditCardId: number;
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  manual_edit: 'Manual Edit',
  transaction_create: 'Transaction Created',
  transaction_update: 'Transaction Updated',
  transaction_delete: 'Transaction Deleted',
  transaction_import: 'Transaction Imported',
  payment: 'Payment',
};

export default function CreditCardBalanceAudit({ creditCardId }: CreditCardBalanceAuditProps) {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
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
      
      const response = await fetch(`/api/credit-cards/${creditCardId}/audit?limit=${pageSize}&offset=${offset}`);
      
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
    fetchAuditTrail(0, false);
  }, [creditCardId]);

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
        <div className="text-sm text-muted-foreground">No balance changes recorded yet.</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Balance History</h2>
          {total > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing {records.length} of {total} records
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {records.map((record) => {
          // For credit cards, a decrease in available_credit means balance increased
          const isIncrease = record.change_amount < 0; // Negative change_amount = less available credit = more balance
          const isDecrease = record.change_amount > 0;
          const changeTypeLabel = CHANGE_TYPE_LABELS[record.change_type] || record.change_type;

          return (
            <div
              key={record.id}
              className="flex items-start justify-between gap-4 p-3 border rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isIncrease && <ArrowUp className="h-4 w-4 text-red-600" />}
                  {isDecrease && <ArrowDown className="h-4 w-4 text-green-600" />}
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
                    {record.transaction.date && (
                      <span className="ml-2">
                        ({format(new Date(record.transaction.date), 'MMM d, yyyy')})
                      </span>
                    )}
                  </div>
                )}

                {record.metadata?.import_file_name && (
                  <div className="text-xs text-muted-foreground mb-1">
                    Imported from: {record.metadata.import_file_name}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                  <span>
                    Available: {formatCurrency(record.old_available_credit)} → {formatCurrency(record.new_available_credit)}
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
