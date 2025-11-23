'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Database, Download, Trash2 } from 'lucide-react';

export default function DataPage() {
  const router = useRouter();

  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [showImportDefaultsDialog, setShowImportDefaultsDialog] = useState(false);

  const [isClearing, setIsClearing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleClearData = async () => {
    setIsClearing(true);

    try {
      const response = await fetch('/api/user/clear-data', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to clear data');

      toast.success('All data cleared successfully');

      setShowClearDataDialog(false);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  const handleImportDefaults = async () => {
    setIsImporting(true);

    try {
      const response = await fetch('/api/user/import-defaults', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to import defaults');

      const data = await response.json();

      toast.success(`Imported ${data.counts.categories} categories, ${data.counts.accounts} accounts, ${data.counts.creditCards} credit cards`);

      setShowImportDefaultsDialog(false);
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error importing defaults:', error);
      toast.error('Failed to import default data');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Manage your budget data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Import Default Data</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Import a pre-configured set of categories, accounts, and credit cards to get started quickly.
            </p>
            <Button
              variant="outline"
              onClick={() => setShowImportDefaultsDialog(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Import Defaults
            </Button>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2 text-destructive">Clear All Data</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Delete all your categories, accounts, transactions, and other data. This cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowClearDataDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clear Data Confirmation Dialog */}
      <AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                This will permanently delete all your data including:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All categories and budgets</li>
                  <li>All accounts and balances</li>
                  <li>All credit cards</li>
                  <li>All transactions</li>
                  <li>All settings</li>
                </ul>
                <div className="mt-2 font-semibold">This action cannot be undone.</div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Clear All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Defaults Confirmation Dialog */}
      <AlertDialog open={showImportDefaultsDialog} onOpenChange={setShowImportDefaultsDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import Default Data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                This will import:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>41 budget categories (40 regular + 1 system category &quot;Transfer&quot;)</li>
                  <li>4 accounts (Wells Main Checking, Cash on Hand, Rental Checking, Rental Savings)</li>
                  <li>5 credit cards (Lowe&apos;s, Citi, Gold, Chase, Chase Freedom)</li>
                  <li>3 settings (Annual salary, Tax rate, Pre-tax deductions)</li>
                </ul>
                <div className="mt-2 text-sm">
                  <strong>Total Monthly Budget:</strong> $8,114.08
                </div>
                <div className="mt-2">
                  This imports your actual budget setup. You can modify or delete any imported data later.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportDefaults} disabled={isImporting}>
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import Defaults
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

