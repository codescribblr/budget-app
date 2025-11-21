'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2, Trash2, Database, Download, Key } from 'lucide-react';
import MerchantGroupsSettings from '@/components/settings/MerchantGroupsSettings';
import DuplicateTransactionFinder from '@/components/settings/DuplicateTransactionFinder';
import DataBackup from '@/components/settings/DataBackup';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showImportDefaultsDialog, setShowImportDefaultsDialog] = useState(false);

  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Update password
  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success('Password updated successfully');

      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Clear all data
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

  // Import default data
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

  // Delete account
  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete account');

      toast.success('Account deleted successfully');

      // Sign out and redirect to login
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Account Settings</h1>

      {/* Duplicate Transaction Finder */}
      <div className="mb-6">
        <DuplicateTransactionFinder />
      </div>

      {/* Merchant Grouping Section */}
      <div className="mb-6">
        <MerchantGroupsSettings />
      </div>

      {/* Data Backup Section */}
      <div className="mb-6">
        <DataBackup />
      </div>

      {/* Password Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          <Button
            onClick={handleUpdatePassword}
            disabled={isUpdatingPassword || !newPassword || !confirmPassword}
          >
            {isUpdatingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Data Management Section */}
      <Card className="mb-6">
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

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible account actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <h3 className="font-semibold mb-2 text-destructive">Delete Account</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAccountDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clear Data Confirmation Dialog */}
      <AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All categories and budgets</li>
                <li>All accounts and balances</li>
                <li>All credit cards</li>
                <li>All transactions</li>
                <li>All settings</li>
              </ul>
              <p className="mt-2 font-semibold">This action cannot be undone.</p>
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
            <AlertDialogDescription>
              This will import:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>41 budget categories (40 regular + 1 system category "Transfer")</li>
                <li>4 accounts (Wells Main Checking, Cash on Hand, Rental Checking, Rental Savings)</li>
                <li>5 credit cards (Lowe's, Citi, Gold, Chase, Chase Freedom)</li>
                <li>3 settings (Annual salary, Tax rate, Pre-tax deductions)</li>
              </ul>
              <p className="mt-2 text-sm">
                <strong>Total Monthly Budget:</strong> $8,114.08
              </p>
              <p className="mt-2">
                This imports your actual budget setup. You can modify or delete any imported data later.
              </p>
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

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data.
              <p className="mt-2 font-semibold text-destructive">
                This action cannot be undone. You will be logged out immediately.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

