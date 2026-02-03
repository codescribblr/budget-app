'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { clearBudgetAccountsCache } from '@/lib/budget-accounts-cache';

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const { isOwner, isLoading: permissionsLoading } = useAccountPermissions();

  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [accountCount, setAccountCount] = useState<number | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const [loadingAccountInfo, setLoadingAccountInfo] = useState(true);

  useEffect(() => {
    fetchAccountInfo();
  }, []);

  const fetchAccountInfo = async () => {
    try {
      const response = await fetch('/api/budget-accounts');
      if (response.ok) {
        const data = await response.json();
        const accounts = data.accounts || [];
        setAccountCount(accounts.length);
        setActiveAccountId(data.activeAccountId);
      }
    } catch (error) {
      console.error('Error fetching account info:', error);
    } finally {
      setLoadingAccountInfo(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!activeAccountId) {
      toast.error('No active account found');
      return;
    }

    setIsDeleting(true);

    try {
      // Delete the current budget account
      const response = await fetch(`/api/budget-accounts/${activeAccountId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete account');
      }

      const data = await response.json();
      const isOnlyAccount = data.isOnlyAccount;
      const remainingAccounts = data.remainingAccounts || 0;

      toast.success('Account deleted successfully');

      // Clear the budget accounts cache
      clearBudgetAccountsCache();

      if (isOnlyAccount) {
        // This was their only account - delete user account and log out
        try {
          const deleteUserResponse = await fetch('/api/user/delete-account', {
            method: 'DELETE',
          });

          if (!deleteUserResponse.ok) {
            // If user deletion fails, still log them out
            console.error('Failed to delete user account, but logging out anyway');
          }
        } catch (error) {
          console.error('Error deleting user account:', error);
        }

        // Sign out and redirect to login
        await supabase.auth.signOut();
        router.push('/login');
      } else if (remainingAccounts > 0) {
        // User has other accounts - redirect to account selection
        // The AccountSelectionGuard will handle showing the account chooser
        window.location.href = '/dashboard';
      } else {
        // No remaining accounts - redirect to login
        await supabase.auth.signOut();
        router.push('/login');
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible account actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div>
            <h3 className="font-semibold mb-2 text-destructive">Delete Account</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Permanently delete the current budget account and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAccountDialog(true)}
              disabled={!isOwner || permissionsLoading || loadingAccountInfo}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
            {!isOwner && !permissionsLoading && (
              <p className="text-sm text-muted-foreground mt-2">Only account owners can delete accounts</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account Permanently?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {accountCount === 1 ? (
                  <>
                    <p className="mb-2">
                      This will permanently delete your budget account and all associated data.
                    </p>
                    <p className="mb-2 font-semibold text-destructive">
                      Since this is your only account, your user account will also be deleted.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone. You will be logged out immediately.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mb-2">
                      This will permanently delete the current budget account and all associated data.
                    </p>
                    <p className="mb-2 text-sm text-muted-foreground">
                      You have {accountCount} account{accountCount !== 1 ? 's' : ''} total. After deletion, you'll be able to select another account.
                    </p>
                    <p className="text-sm font-semibold text-destructive">
                      This action cannot be undone.
                    </p>
                  </>
                )}
              </div>
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
    </>
  );
}


