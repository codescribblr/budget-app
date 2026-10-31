'use client';

import { useResourceVersion } from '@/components/new-look/use-resource-version';
import { fetchBudgetAccounts, clearBudgetAccountsCache } from '@/lib/budget-accounts-cache';
import { useState, useEffect } from 'react';

export interface AccountPermissions {
  role: 'owner' | 'editor' | 'viewer' | null;
  isOwner: boolean;
  isEditor: boolean;
  isViewer: boolean;
  isLoading: boolean;
}

/**
 * Hook to get the current user's role and permissions for the active account
 */
export function useAccountPermissions(): AccountPermissions {
  const version = useResourceVersion("settings");
  const [permissions, setPermissions] = useState<AccountPermissions>({
    role: null,
    isOwner: false,
    isEditor: false,
    isViewer: false,
    isLoading: true,
  });

  useEffect(() => {
    let active = true;
    async function fetchPermissions() {
      try {
        const data = await fetchBudgetAccounts();
        if (!active) return;
        const activeAccount = data.accounts?.find(
          (acc: any) => acc.accountId === data.activeAccountId
        );

        if (activeAccount) {
          const role = activeAccount.role || 'viewer';
          setPermissions({
            role,
            isOwner: role === 'owner',
            isEditor: role === 'editor' || role === 'owner',
            isViewer: role === 'viewer',
            isLoading: false,
          });
        } else {
          setPermissions({
            role: null,
            isOwner: false,
            isEditor: false,
            isViewer: false,
            isLoading: false,
          });
        }
      } catch (error) {
        if (!active) return;
        console.error('Error fetching account permissions:', error);
        setPermissions({
          role: null,
          isOwner: false,
          isEditor: false,
          isViewer: false,
          isLoading: false,
        });
      }
    }

    fetchPermissions();
    return () => { active = false; };
  }, [version]);

  return permissions;
}










