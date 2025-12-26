'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Trash2, Edit, Mail, AlertCircle, CheckCircle2, RefreshCw, CreditCard, Settings, Loader2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import TellerAccountMappingDialog from './TellerAccountMappingDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AccountMapping {
  teller_account_id: string;
  enabled: boolean;
  is_historical?: boolean;
  target_account_id?: number | null;
  target_credit_card_id?: number | null;
  account_name?: string;
}

interface ImportSetup {
  id: number;
  source_type: string;
  integration_name: string | null;
  bank_name: string | null;
  is_active: boolean;
  is_historical: boolean; // Deprecated, kept for backwards compatibility
  last_successful_fetch_at: string | null;
  last_error: string | null;
  error_count: number;
  estimated_monthly_cost: number | null;
  source_config?: {
    account_mappings?: AccountMapping[];
    [key: string]: any;
  };
}

interface ImportSetupCardProps {
  setup: ImportSetup;
  onDeleted: () => void;
  onUpdated: () => void;
}

export default function ImportSetupCard({ setup, onDeleted, onUpdated }: ImportSetupCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isActive, setIsActive] = useState(setup.is_active);
  const [updating, setUpdating] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [showEditAccounts, setShowEditAccounts] = useState(false);
  const [findingBatchForAccount, setFindingBatchForAccount] = useState<string | null>(null);
  const [mappingData, setMappingData] = useState<{
    enrollmentId: string;
    institutionName: string;
    accessToken: string;
    accounts: any[];
    currentMappings: any[];
  } | null>(null);
  const [accountNames, setAccountNames] = useState<Record<number, string>>({});
  const [creditCardNames, setCreditCardNames] = useState<Record<number, string>>({});

  // Get account mappings for Teller integrations
  const accountMappings = setup.source_config?.account_mappings || [];
  const hasAccountMappings = accountMappings.length > 0;

  // Fetch account and credit card names for display
  useEffect(() => {
    if (hasAccountMappings) {
      const accountIds = accountMappings
        .map(m => m.target_account_id)
        .filter((id): id is number => id !== null && id !== undefined);
      const creditCardIds = accountMappings
        .map(m => m.target_credit_card_id)
        .filter((id): id is number => id !== null && id !== undefined);

      if (accountIds.length > 0) {
        fetch('/api/accounts')
          .then(res => res.json())
          .then(accounts => {
            const names: Record<number, string> = {};
            accounts.forEach((acc: any) => {
              if (accountIds.includes(acc.id)) {
                names[acc.id] = acc.name;
              }
            });
            setAccountNames(names);
          })
          .catch(console.error);
      }

      if (creditCardIds.length > 0) {
        fetch('/api/credit-cards')
          .then(res => res.json())
          .then(cards => {
            const names: Record<number, string> = {};
            cards.forEach((card: any) => {
              if (creditCardIds.includes(card.id)) {
                names[card.id] = card.name;
              }
            });
            setCreditCardNames(names);
          })
          .catch(console.error);
      }
    }
  }, [hasAccountMappings, accountMappings]);

  const handleToggleActive = async (checked: boolean) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/automatic-imports/setups/${setup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: checked }),
      });

      if (!response.ok) throw new Error('Failed to update setup');
      setIsActive(checked);
      onUpdated();
    } catch (error) {
      console.error('Error updating setup:', error);
      alert('Failed to update setup');
    } finally {
      setUpdating(false);
    }
  };


  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/automatic-imports/setups/${setup.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete setup');
      setShowDeleteDialog(false);
      onDeleted();
    } catch (error) {
      console.error('Error deleting setup:', error);
      alert('Failed to delete setup');
    }
  };

  const handleManualFetch = async () => {
    if (setup.source_type !== 'teller') {
      alert('Manual fetch is only available for Teller integrations');
      return;
    }

    setFetching(true);
    try {
      const response = await fetch(`/api/automatic-imports/setups/${setup.id}/fetch`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch transactions');
      }

      const data = await response.json();
      alert(`Fetched ${data.fetched} transactions, queued ${data.queued} for review`);
      onUpdated();
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      alert(error.message || 'Failed to fetch transactions');
    } finally {
      setFetching(false);
    }
  };

  const handleEditAccounts = async () => {
    if (setup.source_type !== 'teller') {
      return;
    }

    setLoadingMappings(true);
    try {
      const response = await fetch(`/api/automatic-imports/teller/${setup.id}/accounts`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch account mappings' }));
        const errorMessage = errorData.error || `HTTP ${response.status}: Failed to fetch account mappings`;
        
        // Show user-friendly error message
        if (response.status === 403) {
          alert('You do not have permission to edit this import setup. Only editors and owners can modify import configurations.');
        } else {
          alert(errorMessage);
        }
        console.error('Error fetching account mappings:', errorMessage, response.status);
        return;
      }

      const data = await response.json();
      setMappingData(data);
      setShowEditAccounts(true);
    } catch (error: any) {
      console.error('Error fetching account mappings:', error);
      alert(error.message || 'Failed to fetch account mappings');
    } finally {
      setLoadingMappings(false);
    }
  };

  const handleMappingUpdateSuccess = () => {
    setShowEditAccounts(false);
    setMappingData(null);
    onUpdated();
  };

  const handleRemapLatestBatch = async () => {
    setFindingBatchForAccount('__global__');
    try {
      // Find the latest pending/reviewing batch for this setup
      const response = await fetch(`/api/automatic-imports/queue?importSetupId=${setup.id}&status=pending&limit=1`);
      if (!response.ok) throw new Error('Failed to fetch batches');
      
      const data = await response.json();
      const imports = data.imports || [];
      
      if (imports.length === 0) {
        // Try reviewing status
        const reviewingResponse = await fetch(`/api/automatic-imports/queue?importSetupId=${setup.id}&status=reviewing&limit=1`);
        if (reviewingResponse.ok) {
          const reviewingData = await reviewingResponse.json();
          const reviewingImports = reviewingData.imports || [];
          if (reviewingImports.length > 0) {
            const batchId = reviewingImports[0].source_batch_id;
            if (batchId) {
              router.push(`/import/map-columns?remap=true&batchId=${encodeURIComponent(batchId)}`);
              return;
            }
          }
        }
        alert('No pending batches found for this import setup. All transactions may have already been imported.');
        return;
      }
      
      const batchId = imports[0].source_batch_id;
      if (batchId) {
        router.push(`/import/map-columns?remap=true&batchId=${encodeURIComponent(batchId)}`);
      } else {
        alert('No batch ID found');
      }
    } catch (error: any) {
      console.error('Error finding batch:', error);
      alert(error.message || 'Failed to find batch');
    } finally {
      setFindingBatchForAccount(null);
    }
  };

  const handleRemapAccountBatch = async (mapping: AccountMapping) => {
    setFindingBatchForAccount(mapping.teller_account_id);
    try {
      // Find batches for this specific account
      // We need to filter by target_account_id or target_credit_card_id
      const accountId = mapping.target_account_id;
      const creditCardId = mapping.target_credit_card_id;
      
      if (!accountId && !creditCardId) {
        alert('This account is not mapped to a budget account yet. Please configure the account mapping first.');
        return;
      }

      // Get all batches and filter client-side (since API doesn't support filtering by target_account_id)
      const response = await fetch(`/api/automatic-imports/queue?importSetupId=${setup.id}&status=pending`);
      if (!response.ok) {
        // Try reviewing status
        const reviewingResponse = await fetch(`/api/automatic-imports/queue?importSetupId=${setup.id}&status=reviewing`);
        if (!reviewingResponse.ok) throw new Error('Failed to fetch batches');
        
        const reviewingData = await reviewingResponse.json();
        const reviewingImports = reviewingData.imports || [];
        
        // Filter by account
        const accountBatches = reviewingImports.filter((qi: any) => 
          (accountId && qi.target_account_id === accountId) ||
          (creditCardId && qi.target_credit_card_id === creditCardId)
        );
        
        if (accountBatches.length === 0) {
          alert('No pending batches found for this account. All transactions may have already been imported.');
          return;
        }
        
        // Get the latest batch
        const latestBatch = accountBatches.sort((a: any, b: any) => 
          new Date(b.source_fetched_at).getTime() - new Date(a.source_fetched_at).getTime()
        )[0];
        
        if (latestBatch.source_batch_id) {
          router.push(`/import/map-columns?remap=true&batchId=${encodeURIComponent(latestBatch.source_batch_id)}`);
        }
        return;
      }
      
      const data = await response.json();
      const imports = data.imports || [];
      
      // Filter by account
      const accountBatches = imports.filter((qi: any) => 
        (accountId && qi.target_account_id === accountId) ||
        (creditCardId && qi.target_credit_card_id === creditCardId)
      );
      
      if (accountBatches.length === 0) {
        // Try reviewing status
        const reviewingResponse = await fetch(`/api/automatic-imports/queue?importSetupId=${setup.id}&status=reviewing`);
        if (reviewingResponse.ok) {
          const reviewingData = await reviewingResponse.json();
          const reviewingImports = reviewingData.imports || [];
          const reviewingAccountBatches = reviewingImports.filter((qi: any) => 
            (accountId && qi.target_account_id === accountId) ||
            (creditCardId && qi.target_credit_card_id === creditCardId)
          );
          
          if (reviewingAccountBatches.length > 0) {
            const latestBatch = reviewingAccountBatches.sort((a: any, b: any) => 
              new Date(b.source_fetched_at).getTime() - new Date(a.source_fetched_at).getTime()
            )[0];
            
            if (latestBatch.source_batch_id) {
              router.push(`/import/map-columns?remap=true&batchId=${encodeURIComponent(latestBatch.source_batch_id)}`);
              return;
            }
          }
        }
        alert('No pending batches found for this account. All transactions may have already been imported.');
        return;
      }
      
      // Get the latest batch
      const latestBatch = accountBatches.sort((a: any, b: any) => 
        new Date(b.source_fetched_at).getTime() - new Date(a.source_fetched_at).getTime()
      )[0];
      
      if (latestBatch.source_batch_id) {
        router.push(`/import/map-columns?remap=true&batchId=${encodeURIComponent(latestBatch.source_batch_id)}`);
      } else {
        alert('No batch ID found');
      }
    } catch (error: any) {
      console.error('Error finding batch:', error);
      alert(error.message || 'Failed to find batch');
    } finally {
      setFindingBatchForAccount(null);
    }
  };

  const getSourceIcon = () => {
    switch (setup.source_type) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'teller':
        return <CreditCard className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const getSourceBadge = () => {
    const colors: Record<string, string> = {
      email: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      plaid: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      finicity: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      mx: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      teller: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    return colors[setup.source_type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {getSourceIcon()}
              <div>
                <CardTitle className="text-lg">
                  {setup.integration_name || `${setup.source_type} Import`}
                </CardTitle>
                <CardDescription>
                  {setup.bank_name && `${setup.bank_name} • `}
                  <Badge className={getSourceBadge()}>{setup.source_type}</Badge>
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={`active-${setup.id}`} className="text-sm">
                  Active
                </Label>
                <Switch
                  id={`active-${setup.id}`}
                  checked={isActive}
                  onCheckedChange={handleToggleActive}
                  disabled={updating}
                />
              </div>
              {setup.source_type === 'teller' && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleEditAccounts}
                    disabled={loadingMappings}
                    title="Edit Account Mappings"
                  >
                    {loadingMappings ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Settings className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleManualFetch}
                    disabled={fetching || !isActive}
                    title="Fetch transactions now"
                  >
                    <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Show account mappings for Teller integrations */}
            {setup.source_type === 'teller' && hasAccountMappings ? (
              <div className="space-y-3">
                <div className="text-sm font-medium text-muted-foreground">Linked Accounts:</div>
                {accountMappings.map((mapping, index) => {
                  const isEnabled = mapping.enabled;
                  const isHistorical = mapping.is_historical || false;
                  const tellerAccountName = mapping.account_name || `Account ${index + 1}`;
                  const mappedAccountName = mapping.target_account_id 
                    ? accountNames[mapping.target_account_id] 
                    : null;
                  const mappedCreditCardName = mapping.target_credit_card_id 
                    ? creditCardNames[mapping.target_credit_card_id] 
                    : null;
                  
                  return (
                    <div key={mapping.teller_account_id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{tellerAccountName}</span>
                          {isEnabled ? (
                            <Badge variant="default" className="text-xs">Syncing</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          )}
                          {isHistorical && (
                            <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
                              Historical
                            </Badge>
                          )}
                        </div>
                        {mappedAccountName && (
                          <div className="text-xs text-muted-foreground">
                            → {mappedAccountName}
                          </div>
                        )}
                        {mappedCreditCardName && (
                          <div className="text-xs text-muted-foreground">
                            → {mappedCreditCardName}
                          </div>
                        )}
                        {!mappedAccountName && !mappedCreditCardName && isEnabled && (
                          <div className="text-xs text-muted-foreground italic">
                            Not mapped to a budget account
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {isEnabled && (mappedAccountName || mappedCreditCardName) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemapAccountBatch(mapping)}
                            disabled={findingBatchForAccount !== null}
                            title="Remap transactions for this account"
                          >
                            {findingBatchForAccount === mapping.teller_account_id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Finding...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-3 w-3 mr-1.5" />
                                Re-map
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : setup.source_type === 'teller' ? (
              <div className="text-sm text-muted-foreground">
                No accounts linked. Click the settings icon to configure account mappings.
              </div>
            ) : null}

            {/* Legacy: Show global historical flag for non-Teller integrations */}
            {setup.source_type !== 'teller' && setup.is_historical && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <span className="font-medium">Historical transactions</span>
                <span className="text-muted-foreground">(won't affect current budget)</span>
              </div>
            )}

            {/* Remap and Queue Actions - Only show for non-Teller setups or as fallback */}
            {setup.source_type !== 'teller' && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemapLatestBatch}
                  disabled={findingBatchForAccount !== null}
                >
                  {findingBatchForAccount === '__global__' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Finding...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Remap Latest Batch
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/imports/queue')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Queue
                </Button>
              </div>
            )}
            
            {/* For Teller setups, show View Queue button below account list */}
            {setup.source_type === 'teller' && (
              <div className="flex items-center gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/imports/queue')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Queue
                </Button>
              </div>
            )}

            {/* Global status info */}
            <div className="flex items-center justify-between text-sm pt-2">
              <span className="text-muted-foreground">Last successful fetch:</span>
              <span>{setup.last_successful_fetch_at ? formatDate(setup.last_successful_fetch_at) : 'Never'}</span>
            </div>
            
            {setup.error_count > 0 && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{setup.error_count} error(s)</span>
                {setup.last_error && (
                  <span className="text-muted-foreground">• {setup.last_error.substring(0, 50)}...</span>
                )}
              </div>
            )}

            {setup.error_count === 0 && setup.last_successful_fetch_at && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Working correctly</span>
              </div>
            )}

            {setup.estimated_monthly_cost && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated monthly cost:</span>
                <span>${setup.estimated_monthly_cost.toFixed(2)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Import Setup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this import setup. Any queued transactions from this setup will also be deleted.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Account Mappings Dialog */}
      {mappingData && (
          <TellerAccountMappingDialog
            open={showEditAccounts}
            onOpenChange={setShowEditAccounts}
            enrollmentId={mappingData.enrollmentId}
            institutionName={mappingData.institutionName}
            accessToken={mappingData.accessToken}
            accounts={mappingData.accounts}
            onSuccess={handleMappingUpdateSuccess}
            existingMappings={mappingData.currentMappings}
            setupId={setup.id}
          />
      )}
    </>
  );
}
