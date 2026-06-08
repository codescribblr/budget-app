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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Trash2, Edit2, Check, X } from 'lucide-react';
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
  const [accountName, setAccountName] = useState<string>('');
  const [editingName, setEditingName] = useState(false);
  const [newAccountName, setNewAccountName] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState(false);
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
        
        // Find the current account name
        if (data.activeAccountId) {
          const currentAccount = accounts.find(
            (acc: any) => acc.accountId === data.activeAccountId
          );
          if (currentAccount) {
            setAccountName(currentAccount.accountName || '');
            setNewAccountName(currentAccount.accountName || '');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching account info:', error);
    } finally {
      setLoadingAccountInfo(false);
    }
  };

  const handleStartRename = () => {
    setNewAccountName(accountName);
    setEditingName(true);
  };

  const handleCancelRename = () => {
    setNewAccountName(accountName);
    setEditingName(false);
  };

  const handleSaveRename = async () => {
    if (!activeAccountId) {
      toast.error('No active account found');
      return;
    }

    const trimmedName = newAccountName.trim();
    if (!trimmedName) {
      toast.error('Account name cannot be empty');
      return;
    }

    if (trimmedName === accountName) {
      setEditingName(false);
      return;
    }

    setIsRenaming(true);

    try {
      const response = await fetch(`/api/budget-accounts/${activeAccountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to rename account');
      }

      const data = await response.json();
      setAccountName(data.account.name);
      setEditingName(false);
      toast.success('Account renamed successfully');
      
      // Clear cache and trigger account switcher refresh
      clearBudgetAccountsCache();
      
      // Dispatch event to update account switcher and other components
      window.dispatchEvent(new CustomEvent('accountRenamed', { 
        detail: { accountId: activeAccountId, newName: data.account.name }
      }));
      
      router.refresh();
    } catch (error: any) {
      console.error('Error renaming account:', error);
      toast.error(error.message || 'Failed to rename account');
    } finally {
      setIsRenaming(false);
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
            const errorData = await deleteUserResponse.json().catch(() => ({}));
            const errorMessage = errorData.error || 'Unknown error';
            console.error('Failed to delete user account:', errorMessage);
            
            // Show error to user and don't log out - they still have an account
            toast.error('Failed to delete user account', {
              description: errorMessage,
            });
            setIsDeleting(false);
            setShowDeleteAccountDialog(false);
            return; // Don't proceed with logout if deletion failed
          }

          // Verify user account was actually deleted by trying to get user info
          // If deletion succeeded, this should fail
          try {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              // User still exists - deletion didn't work
              console.error('User account still exists after deletion attempt');
              toast.error('Failed to delete user account', {
                description: 'User account deletion did not complete. Please contact support.',
              });
              setIsDeleting(false);
              setShowDeleteAccountDialog(false);
              return;
            }
          } catch (authError) {
            // Expected - user should not exist, so getUser should fail
            // This means deletion succeeded
          }

          // User account deletion succeeded - now log out
          toast.success('Account and user deleted successfully');
          await supabase.auth.signOut();
          router.push('/login');
        } catch (error) {
          console.error('Error deleting user account:', error);
          toast.error('Failed to delete user account', {
            description: 'An unexpected error occurred. Please try again.',
          });
          setIsDeleting(false);
          return; // Don't proceed with logout if deletion failed
        }
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
      {/* Account Name Section */}
      {isOwner && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Name</CardTitle>
            <CardDescription>Change the name of your budget account</CardDescription>
          </CardHeader>
          <CardContent>
            {editingName ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input
                    id="account-name"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    disabled={isRenaming || permissionsLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveRename();
                      } else if (e.key === 'Escape') {
                        handleCancelRename();
                      }
                    }}
                    className="mt-2"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveRename}
                    disabled={isRenaming || permissionsLoading || !newAccountName.trim()}
                    size="sm"
                  >
                    {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Check className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                  <Button
                    onClick={handleCancelRename}
                    disabled={isRenaming || permissionsLoading}
                    variant="outline"
                    size="sm"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{accountName || 'Loading...'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This name appears in the account switcher and throughout the app
                  </p>
                </div>
                <Button
                  onClick={handleStartRename}
                  disabled={permissionsLoading || loadingAccountInfo}
                  variant="outline"
                  size="sm"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Rename
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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


