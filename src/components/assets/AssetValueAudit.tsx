'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditRecord {
  id: number;
  asset_id: number;
  old_value: number;
  new_value: number;
  change_amount: number;
  change_type: string;
  user_id: string | null;
  user_email: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
}

interface AssetValueAuditProps {
  assetId: number;
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  manual_edit: 'Manual Edit',
  value_update: 'Value Update',
  appreciation: 'Appreciation',
  depreciation: 'Depreciation',
};

export default function AssetValueAudit({ assetId }: AssetValueAuditProps) {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const fetchAuditTrail = async (offset: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const response = await fetch(`/api/non-cash-assets/${assetId}/audit?limit=${pageSize}&offset=${offset}`);
      
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
  }, [assetId]);

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
        <h2 className="text-lg font-semibold mb-4">Value History</h2>
        <div className="text-sm text-muted-foreground">No value changes recorded yet.</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Value History</h2>
          {total > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing {records.length} of {total} records
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {records.map((record) => {
          const isIncrease = record.change_amount > 0;
          const isDecrease = record.change_amount < 0;
          const changeTypeLabel = CHANGE_TYPE_LABELS[record.change_type] || record.change_type;

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
                </div>

                {record.description && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {record.description}
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
                  <span>
                    {formatCurrency(record.old_value)} → {formatCurrency(record.new_value)}
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
    </Card>
  );
}
