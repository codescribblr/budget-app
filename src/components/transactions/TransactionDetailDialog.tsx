'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { parseLocalDate } from '@/lib/date-utils';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TransactionDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: number;
}

interface TransactionDetails {
  transaction: {
    id: number;
    date: string;
    description: string;
    total_amount: number;
    transaction_type: 'income' | 'expense';
    merchant_group_id: number | null;
    merchant_name: string | null;
    account_id: number | null;
    account_name: string | null;
    account_type: string | null;
    credit_card_id: number | null;
    credit_card_name: string | null;
    is_historical: boolean;
    created_at: string;
    updated_at: string;
  };
  splits: Array<{
    id: number;
    category_id: number;
    category_name: string;
    category_is_system: boolean;
    amount: number;
    created_at: string;
  }>;
  importMetadata: Array<{
    link_created_at: string;
    imported_transaction: {
      id: number;
      import_date: string;
      source_type: string;
      source_identifier: string;
      transaction_date: string;
      merchant: string;
      description: string;
      amount: number;
      hash: string;
      imported_at: string;
      metadata: {
        originalRow?: any;
        suggestedCategory?: number | null;
        suggestedMerchant?: string | null;
        [key: string]: any;
      };
    } | null;
  }>;
}

export default function TransactionDetailDialog({
  isOpen,
  onClose,
  transactionId,
}: TransactionDetailDialogProps) {
  const [details, setDetails] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && transactionId) {
      setLoading(true);
      setError(null);
      
      fetch(`/api/transactions/${transactionId}/details`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch transaction details');
          }
          return res.json();
        })
        .then(data => {
          setDetails(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error fetching transaction details:', err);
          setError(err.message || 'Failed to load transaction details');
          setLoading(false);
        });
    } else {
      setDetails(null);
      setError(null);
    }
  }, [isOpen, transactionId]);

  const formatDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    if (!date) return dateStr;
    
    // Try to parse as ISO string first
    if (dateStr.includes('T')) {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaction Details</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}

        {details && !loading && (
          <div className="space-y-6">
            {/* Basic Transaction Info */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Transaction Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-medium">{details.transaction.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(details.transaction.date)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{details.transaction.description}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(details.transaction.total_amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge variant={details.transaction.transaction_type === 'income' ? 'default' : 'secondary'}>
                    {details.transaction.transaction_type === 'income' ? 'Income' : 'Expense'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Historical</p>
                  <Badge variant={details.transaction.is_historical ? 'outline' : 'default'}>
                    {details.transaction.is_historical ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {details.transaction.merchant_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Merchant</p>
                    <p className="font-medium">{details.transaction.merchant_name}</p>
                  </div>
                )}
                {details.transaction.account_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Account</p>
                    <p className="font-medium">
                      {details.transaction.account_name}
                      {details.transaction.account_type && (
                        <span className="text-muted-foreground ml-2">
                          ({details.transaction.account_type})
                        </span>
                      )}
                    </p>
                  </div>
                )}
                {details.transaction.credit_card_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Credit Card</p>
                    <p className="font-medium">{details.transaction.credit_card_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium text-sm">{formatDate(details.transaction.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium text-sm">{formatDate(details.transaction.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Category Splits */}
            {details.splits.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Category Splits</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.splits.map((split) => (
                      <TableRow key={split.id}>
                        <TableCell>
                          {split.category_name}
                          {split.category_is_system && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              System
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(split.amount)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {formatDate(split.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-2 text-right">
                  <p className="text-sm text-muted-foreground">
                    Total: <span className="font-medium">{formatCurrency(
                      details.splits.reduce((sum, s) => sum + s.amount, 0)
                    )}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Import Metadata */}
            {details.importMetadata.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Import Information</h3>
                {details.importMetadata.map((meta, idx) => (
                  <div key={idx} className="border rounded-lg p-4 mb-4 space-y-3">
                    {meta.imported_transaction ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Import Date</p>
                            <p className="font-medium">{formatDate(meta.imported_transaction.import_date)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Imported At</p>
                            <p className="font-medium text-sm">{formatDate(meta.imported_transaction.imported_at)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Source Type</p>
                            <p className="font-medium">{meta.imported_transaction.source_type}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Source File</p>
                            <p className="font-medium text-sm break-all">{meta.imported_transaction.source_identifier}</p>
                          </div>
                          {meta.imported_transaction.metadata?.suggestedCategory && (
                            <div>
                              <p className="text-sm text-muted-foreground">Suggested Category ID</p>
                              <p className="font-medium">{meta.imported_transaction.metadata.suggestedCategory}</p>
                            </div>
                          )}
                          {meta.imported_transaction.metadata?.suggestedMerchant && (
                            <div>
                              <p className="text-sm text-muted-foreground">Suggested Merchant</p>
                              <p className="font-medium">{meta.imported_transaction.metadata.suggestedMerchant}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-muted-foreground">Original Transaction Date</p>
                            <p className="font-medium">{formatDate(meta.imported_transaction.transaction_date)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Original Merchant</p>
                            <p className="font-medium">{meta.imported_transaction.merchant}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Original Description</p>
                            <p className="font-medium">{meta.imported_transaction.description}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Original Amount</p>
                            <p className="font-medium">{formatCurrency(meta.imported_transaction.amount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Hash</p>
                            <p className="font-mono text-xs break-all">{meta.imported_transaction.hash}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Linked At</p>
                            <p className="font-medium text-sm">{formatDate(meta.link_created_at)}</p>
                          </div>
                        </div>
                        
                        {/* Original Row Data */}
                        {meta.imported_transaction.metadata?.originalRow && (
                          <div className="mt-4 pt-4 border-t">
                            <h4 className="font-semibold mb-2">Original CSV Row Data</h4>
                            <div className="bg-muted p-3 rounded-md overflow-x-auto">
                              <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                                {JSON.stringify(meta.imported_transaction.metadata.originalRow, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Import metadata not available</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {details.importMetadata.length === 0 && (
              <div className="text-sm text-muted-foreground italic">
                This transaction was not imported (likely created manually)
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

