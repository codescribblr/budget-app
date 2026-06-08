'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CreditCard, X } from 'lucide-react';
import CreateEmailImportDialog from './CreateEmailImportDialog';
import CreateTellerImportDialog from './CreateTellerImportDialog';

interface IntegrationSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function IntegrationSelector({
  open,
  onOpenChange,
  onCreated,
}: IntegrationSelectorProps) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showTellerDialog, setShowTellerDialog] = useState(false);

  const handleEmailSelected = () => {
    setShowEmailDialog(true);
    // Close the integration selector dialog when Email is selected
    onOpenChange(false);
  };

  const handleTellerSelected = () => {
    setShowTellerDialog(true);
    // Close the integration selector dialog when Teller is selected
    onOpenChange(false);
  };

  const handleIntegrationCreated = () => {
    setShowEmailDialog(false);
    setShowTellerDialog(false);
    onCreated();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showEmailDialog && !showTellerDialog} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Choose Import Method</DialogTitle>
            <DialogDescription>
              Select how you want to import transactions automatically
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleEmailSelected}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Mail className="h-6 w-6 text-blue-600" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">Email Import</CardTitle>
                    <CardDescription>
                      Forward bank statement emails with PDF/CSV attachments
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-medium">Free</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Setup:</span>
                    <span className="font-medium">Easy</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Compatibility:</span>
                    <span className="font-medium">Any bank</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleTellerSelected}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">Teller Integration</CardTitle>
                    <CardDescription>
                      Connect directly via Teller API for automatic transaction sync
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cost:</span>
                    <span className="font-medium">$0.10-0.20/transaction</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Setup:</span>
                    <span className="font-medium">Quick OAuth</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Compatibility:</span>
                    <span className="font-medium">100+ US banks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateEmailImportDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        onCreated={handleIntegrationCreated}
      />

      <CreateTellerImportDialog
        open={showTellerDialog}
        onOpenChange={setShowTellerDialog}
        onCreated={handleIntegrationCreated}
      />
    </>
  );
}

