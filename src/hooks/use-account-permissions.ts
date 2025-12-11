'use client';

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
  const [permissions, setPermissions] = useState<AccountPermissions>({
    role: null,
    isOwner: false,
    isEditor: false,
    isViewer: false,
    isLoading: true,
  });

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const response = await fetch('/api/budget-accounts');
        if (!response.ok) {
          throw new Error('Failed to fetch account permissions');
        }

        const data = await response.json();
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
  }, []);

  return permissions;
}








