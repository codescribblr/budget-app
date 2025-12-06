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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Mail, Copy, Check } from 'lucide-react';

interface CreateEmailImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateEmailImportDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateEmailImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [isHistorical, setIsHistorical] = useState(false);
  const [emailAddress, setEmailAddress] = useState<string>('');
  const [emailCopied, setEmailCopied] = useState(false);
  const [receivingDomain, setReceivingDomain] = useState<string>('');

  // Fetch receiving domain on mount
  useEffect(() => {
    fetchReceivingDomain();
  }, []);

  const fetchReceivingDomain = async () => {
    try {
      const response = await fetch('/api/automatic-imports/email-domain');
      if (response.ok) {
        const data = await response.json();
        setReceivingDomain(data.domain);
      }
    } catch (error) {
      console.error('Error fetching receiving domain:', error);
    }
  };

  const handleCreate = async () => {
    if (!targetAccountId || targetAccountId === 'none') {
      toast.error('Please select a target account');
      return;
    }

    setLoading(true);
    try {
      const accountIdNum = parseInt(targetAccountId, 10);
      if (isNaN(accountIdNum)) {
        toast.error('Invalid account selected');
        return;
      }

      const response = await fetch('/api/automatic-imports/setups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: 'email',
          // source_identifier will be generated server-side using RESEND_RECEIVING_DOMAIN
          target_account_id: accountIdNum,
          is_historical: isHistorical,
          integration_name: 'Email Import',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create import setup');
      }

      const data = await response.json();
      
      // Email address is now generated server-side, extract from response
      const actualEmail = data.setup.source_identifier || data.setup.source_config?.email_address;
      if (actualEmail) {
        setEmailAddress(actualEmail);
      }

      toast.success('Email import setup created successfully');

      onCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating email import:', error);
      toast.error(error.message || 'Failed to create import setup');
    } finally {
      setLoading(false);
    }
  };

  const copyEmailToClipboard = () => {
    if (emailAddress) {
      navigator.clipboard.writeText(emailAddress);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(data || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Email Import Setup</DialogTitle>
          <DialogDescription>
            Set up email forwarding to automatically import transactions from bank statements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Target Account</Label>
            <Select value={targetAccountId} onValueChange={setTargetAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.length === 0 ? (
                  <SelectItem value="no-accounts" disabled>No accounts available</SelectItem>
                ) : (
                  accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="historical"
              checked={isHistorical}
              onCheckedChange={(checked) => setIsHistorical(checked === true)}
            />
            <Label htmlFor="historical" className="text-sm font-normal cursor-pointer">
              Mark transactions as historical (won't affect current budget)
            </Label>
          </div>

          {emailAddress ? (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <Label>Forward emails to:</Label>
              <div className="flex items-center gap-2">
                <Input value={emailAddress} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyEmailToClipboard}
                >
                  {emailCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Forward bank statement emails to this address. Attached PDF or CSV files will be automatically processed.
              </p>
            </div>
          ) : receivingDomain && (
            <div className="text-sm text-muted-foreground">
              Email address will be generated after setup creation: <code className="text-xs">setup-{'{id}'}@{receivingDomain}</code>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={loading || !targetAccountId}>
              {loading ? 'Creating...' : 'Create Setup'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
