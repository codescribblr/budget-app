'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, CreditCard, Building2 } from 'lucide-react';

interface TellerAccount {
  id: string;
  name: string;
  type: string;
  currency?: string; // ISO 4217 currency code (e.g., "USD")
  account_number?: {
    number?: string;
  } | null;
  institution: {
    id: string;
    name: string;
  };
}

interface AccountMapping {
  teller_account_id: string;
  enabled: boolean;
  is_historical?: boolean; // Per-account historical flag
  target_account_id?: number | null;
  target_credit_card_id?: number | null;
  auto_create?: boolean;
  account_type?: 'checking' | 'savings' | 'cash' | 'credit_card';
  account_name?: string;
}

interface TellerAccountMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string;
  institutionName: string;
  accessToken: string; // Encrypted token
  accounts: TellerAccount[];
  onSuccess: () => void;
  existingMappings?: AccountMapping[]; // For editing existing setups
  setupId?: number; // For updating existing setups
}

export default function TellerAccountMappingDialog({
  open,
  onOpenChange,
  enrollmentId,
  institutionName,
  accessToken,
  accounts,
  onSuccess,
  existingMappings,
  setupId,
}: TellerAccountMappingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [budgetAccounts, setBudgetAccounts] = useState<Array<{ id: number; name: string }>>([]);
  const [budgetCreditCards, setBudgetCreditCards] = useState<Array<{ id: number; name: string }>>([]);
  const [mappings, setMappings] = useState<Record<string, AccountMapping>>({});

  useEffect(() => {
    if (open) {
      fetchBudgetAccounts();
      initializeMappings();
    }
  }, [open, accounts]);

  const fetchBudgetAccounts = async () => {
    try {
      // Fetch accounts
      const accountsResponse = await fetch('/api/accounts');
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setBudgetAccounts(accountsData || []);
      }

      // Fetch credit cards
      const cardsResponse = await fetch('/api/credit-cards');
      if (cardsResponse.ok) {
        const cardsData = await cardsResponse.json();
        setBudgetCreditCards(cardsData || []);
      }
    } catch (error) {
      console.error('Error fetching budget accounts:', error);
    }
  };

  const initializeMappings = () => {
    const initialMappings: Record<string, AccountMapping> = {};
    
    if (existingMappings && existingMappings.length > 0) {
      // Use existing mappings
      existingMappings.forEach(mapping => {
        initialMappings[mapping.teller_account_id] = mapping;
      });
      
        // Add any new accounts that weren't in existing mappings
      accounts.forEach(account => {
        if (!initialMappings[account.id]) {
          initialMappings[account.id] = {
            teller_account_id: account.id,
            enabled: true, // Enable new accounts by default
            is_historical: false, // Default to non-historical
            target_account_id: null,
            target_credit_card_id: null,
            auto_create: true, // Default to creating new account
            account_name: account.name, // Auto-fill with Teller account name
            account_type: account.type.toLowerCase().includes('credit') ? 'credit_card' : 'checking',
          };
        }
      });
    } else {
      // Initialize new mappings
      accounts.forEach(account => {
        initialMappings[account.id] = {
          teller_account_id: account.id,
          enabled: true, // Enable all by default
          is_historical: false, // Default to non-historical
          target_account_id: null,
          target_credit_card_id: null,
          auto_create: true, // Default to creating new account
          account_name: account.name, // Auto-fill with Teller account name
          account_type: account.type.toLowerCase().includes('credit') ? 'credit_card' : 'checking',
        };
      });
    }
    
    setMappings(initialMappings);
  };

  const updateMapping = (tellerAccountId: string, updates: Partial<AccountMapping>) => {
    setMappings(prev => ({
      ...prev,
      [tellerAccountId]: {
        ...prev[tellerAccountId],
        ...updates,
      },
    }));
  };

  const handleSave = async () => {
    // Validate that at least one account is enabled
    const enabledCount = Object.values(mappings).filter(m => m.enabled).length;
    if (enabledCount === 0) {
      toast.error('At least one account must be enabled');
      return;
    }

    // Validate that every enabled account is either mapped or set to auto-create
    for (const mapping of Object.values(mappings)) {
      if (mapping.enabled) {
        const hasMapping = mapping.target_account_id !== null || mapping.target_credit_card_id !== null;
        const isAutoCreate = mapping.auto_create === true;
        
        if (!hasMapping && !isAutoCreate) {
          toast.error(`${getTellerAccountName(mapping.teller_account_id)} must be mapped to an existing account or set to create a new one`);
          return;
        }
        
        // If mapping to existing, must have a selection
        if (!isAutoCreate && !hasMapping) {
          toast.error(`Please select an existing account for ${getTellerAccountName(mapping.teller_account_id)}`);
          return;
        }
        
        // Validate auto-create accounts have names
        if (isAutoCreate && !mapping.account_name?.trim()) {
          toast.error(`Account name is required for ${getTellerAccountName(mapping.teller_account_id)}`);
          return;
        }
      }
    }

    setLoading(true);
    try {
      let response;
      
      if (setupId) {
        // Update existing setup
        response = await fetch(`/api/automatic-imports/teller/${setupId}/accounts`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountMappings: Object.values(mappings),
          }),
        });
      } else {
        // Create new setup
        response = await fetch('/api/automatic-imports/teller/save-mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enrollmentId,
            institutionName,
            accessToken,
            accountMappings: Object.values(mappings),
          }),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save account mappings');
      }

      toast.success(setupId ? 'Account mappings updated successfully' : `Connected ${institutionName} via Teller successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving account mappings:', error);
      toast.error(error.message || 'Failed to save account mappings');
    } finally {
      setLoading(false);
    }
  };

  const getTellerAccountName = (tellerAccountId: string): string => {
    const account = accounts.find(a => a.id === tellerAccountId);
    return account?.name || 'Unknown Account';
  };

  const getTellerAccountType = (tellerAccountId: string): string => {
    const account = accounts.find(a => a.id === tellerAccountId);
    return account?.type || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Map Teller Accounts</DialogTitle>
          <DialogDescription>
            Map your Teller accounts to your budget accounts. Enable syncing for accounts you want to import transactions from, disable for accounts you want to skip. You can map to existing accounts, create new ones, or leave accounts disabled to skip syncing.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
          {accounts.map(tellerAccount => {
            const mapping = mappings[tellerAccount.id];
            if (!mapping) return null;

            const isCreditCard = tellerAccount.type.toLowerCase().includes('credit');
            const availableTargets = isCreditCard ? budgetCreditCards : budgetAccounts;

            return (
              <div key={tellerAccount.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isCreditCard ? (
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Label className="font-semibold text-base">{tellerAccount.name}</Label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium capitalize">{getTellerAccountType(tellerAccount.id)}</span>
                      {tellerAccount.account_number?.number && (
                        <span className="font-mono">•••• {tellerAccount.account_number.number.slice(-4)}</span>
                      )}
                      {tellerAccount.currency && (
                        <span className="uppercase">{tellerAccount.currency}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`enable-${tellerAccount.id}`} className="text-sm">
                      Sync
                    </Label>
                    <Switch
                      id={`enable-${tellerAccount.id}`}
                      checked={mapping.enabled}
                      onCheckedChange={(checked) => updateMapping(tellerAccount.id, { enabled: checked })}
                    />
                  </div>
                </div>

                {mapping.enabled && (
                  <div className="space-y-3 pl-6 border-l-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`historical-${tellerAccount.id}`}
                        checked={mapping.is_historical || false}
                        onCheckedChange={(checked) => {
                          updateMapping(tellerAccount.id, { is_historical: checked === true });
                        }}
                      />
                      <Label htmlFor={`historical-${tellerAccount.id}`} className="text-sm font-normal cursor-pointer">
                        Mark transactions as historical (won't affect current budget)
                      </Label>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Account Mapping</Label>
                      <RadioGroup
                        value={mapping.auto_create ? 'create' : 'map'}
                        onValueChange={(value) => {
                          if (value === 'create') {
                            updateMapping(tellerAccount.id, {
                              auto_create: true,
                              target_account_id: null,
                              target_credit_card_id: null,
                              account_name: mapping.account_name || tellerAccount.name, // Auto-fill if empty
                            });
                          } else {
                            updateMapping(tellerAccount.id, {
                              auto_create: false,
                              account_name: undefined,
                            });
                          }
                        }}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="map" id={`map-${tellerAccount.id}`} />
                            <Label htmlFor={`map-${tellerAccount.id}`} className="text-sm font-normal cursor-pointer">
                              Map to existing {isCreditCard ? 'credit card' : 'account'}
                            </Label>
                          </div>
                          {!mapping.auto_create && (
                            <div className="pl-6">
                              <Label htmlFor={`select-${tellerAccount.id}`} className="text-sm">
                                Select {isCreditCard ? 'credit card' : 'account'}
                              </Label>
                              <Select
                                value={
                                  mapping.target_account_id
                                    ? `account-${mapping.target_account_id}`
                                    : mapping.target_credit_card_id
                                    ? `card-${mapping.target_credit_card_id}`
                                    : ''
                                }
                                onValueChange={(value) => {
                                  if (value.startsWith('account-')) {
                                    updateMapping(tellerAccount.id, {
                                      target_account_id: parseInt(value.replace('account-', '')),
                                      target_credit_card_id: null,
                                    });
                                  } else if (value.startsWith('card-')) {
                                    updateMapping(tellerAccount.id, {
                                      target_account_id: null,
                                      target_credit_card_id: parseInt(value.replace('card-', '')),
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger id={`select-${tellerAccount.id}`}>
                                  <SelectValue placeholder={`Select ${isCreditCard ? 'credit card' : 'account'}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableTargets.length === 0 ? (
                                    <SelectItem value="none-available" disabled>
                                      No {isCreditCard ? 'credit cards' : 'accounts'} available
                                    </SelectItem>
                                  ) : (
                                    availableTargets.map((target) => (
                                      <SelectItem
                                        key={target.id}
                                        value={isCreditCard ? `card-${target.id}` : `account-${target.id}`}
                                      >
                                        {target.name}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="create" id={`create-${tellerAccount.id}`} />
                            <Label htmlFor={`create-${tellerAccount.id}`} className="text-sm font-normal cursor-pointer">
                              Create new {isCreditCard ? 'credit card' : 'account'}
                            </Label>
                          </div>
                          {mapping.auto_create && (
                            <div className="space-y-2 pl-6">
                              <div>
                                <Label htmlFor={`name-${tellerAccount.id}`} className="text-sm">
                                  Account Name
                                </Label>
                                <Input
                                  id={`name-${tellerAccount.id}`}
                                  value={mapping.account_name || tellerAccount.name}
                                  onChange={(e) => updateMapping(tellerAccount.id, { account_name: e.target.value })}
                                  placeholder={tellerAccount.name}
                                />
                              </div>
                              {!isCreditCard && (
                                <div>
                                  <Label htmlFor={`type-${tellerAccount.id}`} className="text-sm">
                                    Account Type
                                  </Label>
                                  <Select
                                    value={mapping.account_type || 'checking'}
                                    onValueChange={(value: 'checking' | 'savings' | 'cash') =>
                                      updateMapping(tellerAccount.id, { account_type: value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="checking">Checking</SelectItem>
                                      <SelectItem value="savings">Savings</SelectItem>
                                      <SelectItem value="cash">Cash</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Connect'
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


