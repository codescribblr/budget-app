'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import TellerConnect from './providers/TellerConnect';
import { CreditCard, Loader2 } from 'lucide-react';

interface CreateTellerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateTellerImportDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateTellerImportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [isHistorical, setIsHistorical] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ id: number; name: string }>>([]);
  const [tellerConnected, setTellerConnected] = useState(false);
  const [tellerConnecting, setTellerConnecting] = useState(false);

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

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStartTellerConnection = () => {
    // Set connecting state - TellerConnect will be rendered in a portal overlay
    // Dialog will automatically close via `open && !tellerConnecting`
    setTellerConnecting(true);
  };

  const handleTellerSuccess = async (enrollment: {
    accessToken: string;
    enrollmentId: string;
    institutionName: string;
    userId: string;
  }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/automatic-imports/teller/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: enrollment.accessToken,
          enrollmentId: enrollment.enrollmentId,
          institutionName: enrollment.institutionName,
          target_account_id: targetAccountId && targetAccountId !== 'none' ? parseInt(targetAccountId) : null,
          is_historical: isHistorical,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create Teller import setup');
      }

      toast.success(`Connected ${enrollment.institutionName} via Teller successfully`);

      setTellerConnected(true);
      setTellerConnecting(false);
      setTimeout(() => {
        onCreated();
        onOpenChange(false);
        setTellerConnected(false);
      }, 1500);
    } catch (error: any) {
      console.error('Error creating Teller import:', error);
      toast.error(error.message || 'Failed to create import setup');
      setTellerConnecting(false);
      // Reopen the dialog on error so user can try again
      onOpenChange(true);
    } finally {
      setLoading(false);
    }
  };

  const handleTellerError = (error: Error) => {
    toast.error(error.message || 'Failed to connect with Teller');
    setTellerConnecting(false);
    // Reopen the dialog on error so user can try again
    onOpenChange(true);
  };

  const handleTellerExit = () => {
    // User exited Teller Connect without completing
    setTellerConnecting(false);
    // Reopen the dialog so user can try again
    onOpenChange(true);
  };

  return (
    <>
      {/* Render TellerConnect in a portal overlay when connecting to avoid z-index conflicts */}
      {tellerConnecting && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6">
            <TellerConnect
              onExit={handleTellerExit}
              onSuccess={handleTellerSuccess}
              onError={handleTellerError}
              targetAccountId={targetAccountId && targetAccountId !== 'none' ? parseInt(targetAccountId) : undefined}
              isHistorical={isHistorical}
              autoOpen={true}
            />
          </div>
        </div>,
        document.body
      )}
      
      <Dialog open={open && !tellerConnecting} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Connect Bank Account with Teller</DialogTitle>
            <DialogDescription>
              Securely connect your bank account via Teller. Transactions will be automatically fetched and queued for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Target Account (Optional)</Label>
              <Select value={targetAccountId || undefined} onValueChange={setTargetAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (use default)</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Optionally map imported transactions to a specific account
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="historical-teller"
                checked={isHistorical}
                onCheckedChange={(checked) => setIsHistorical(checked === true)}
              />
              <Label htmlFor="historical-teller" className="text-sm font-normal cursor-pointer">
                Mark transactions as historical (won't affect current budget)
              </Label>
            </div>

            {tellerConnected ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Successfully connected! Setting up import...
                </p>
              </div>
            ) : (
              <Button
                onClick={handleStartTellerConnection}
                disabled={loading}
                className="w-full"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Connect Bank Account
              </Button>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
