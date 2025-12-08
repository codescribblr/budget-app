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
import TellerAccountMappingDialog from './TellerAccountMappingDialog';
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
  const [tellerConnecting, setTellerConnecting] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [mappingData, setMappingData] = useState<{
    enrollmentId: string;
    institutionName: string;
    accessToken: string;
    accounts: any[];
  } | null>(null);

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
      // Fetch accounts from Teller
      const response = await fetch('/api/automatic-imports/teller/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: enrollment.accessToken,
          enrollmentId: enrollment.enrollmentId,
          institutionName: enrollment.institutionName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch Teller accounts');
      }

      const data = await response.json();
      
      // Close the connect dialog and show mapping dialog
      setTellerConnecting(false);
      onOpenChange(false); // Close the "Connect Bank Account" dialog
      setMappingData({
        enrollmentId: data.enrollmentId,
        institutionName: data.institutionName,
        accessToken: data.accessToken,
        accounts: data.accounts,
      });
      setShowMappingDialog(true);
    } catch (error: any) {
      console.error('Error fetching Teller accounts:', error);
      toast.error(error.message || 'Failed to fetch accounts from Teller');
      setTellerConnecting(false);
      // Reopen the dialog on error so user can try again
      onOpenChange(true);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingSuccess = () => {
    setShowMappingDialog(false);
    setMappingData(null);
    onCreated();
    onOpenChange(false);
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
            <p className="text-sm text-muted-foreground">
              After connecting, you'll be able to map each account individually, choose which accounts to sync, and set whether transactions are historical on a per-account basis.
            </p>

            <Button
              onClick={handleStartTellerConnection}
              disabled={loading}
              className="w-full"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Connect Bank Account
            </Button>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Account Mapping Dialog */}
      {mappingData && (
        <TellerAccountMappingDialog
          open={showMappingDialog}
          onOpenChange={setShowMappingDialog}
          enrollmentId={mappingData.enrollmentId}
          institutionName={mappingData.institutionName}
          accessToken={mappingData.accessToken}
          accounts={mappingData.accounts}
          onSuccess={handleMappingSuccess}
        />
      )}
    </>
  );
}
