"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { AccountSelectionPage } from "./AccountSelectionPage"
import { fetchBudgetAccounts, clearBudgetAccountsCache } from '@/lib/budget-accounts-cache';

interface AccountSelectionGuardProps {
  children: React.ReactNode
}

export function AccountSelectionGuard({ children }: AccountSelectionGuardProps) {
  const pathname = usePathname()
  const [needsAccountSelection, setNeedsAccountSelection] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkAccountSelection()
  }, [pathname])

  const checkAccountSelection = async () => {
    try {
      const data = await fetchBudgetAccounts();
      const accounts = data.accounts || [];
      const activeAccountId = data.activeAccountId;

      // If no accounts found but activeAccountId exists, account was just created
      // Refresh the accounts list to see the newly created account
      if (accounts.length === 0 && activeAccountId) {
        clearBudgetAccountsCache();
        // Account was just created by getActiveAccountId - refresh to see it
        try {
          // Small delay to ensure account_users entry is committed
          await new Promise(resolve => setTimeout(resolve, 100));
          const refreshedData = await fetchBudgetAccounts();
          if (refreshedData.accounts.length > 0) {
            // Account now exists - continue with normal flow
            setNeedsAccountSelection(false);
            setChecking(false);
            window.location.reload(); // Reload to ensure everything is in sync
            return;
          }
        } catch (err) {
          console.error('Error refreshing accounts:', err);
        }
        // If refresh failed, still allow rendering - account exists even if list is empty
        setNeedsAccountSelection(false);
        setChecking(false);
        return;
      }

      // If no accounts found, check for pending invitations sent to user's email
      if (accounts.length === 0) {
        try {
          const inviteResponse = await fetch('/api/invitations/my-invitations')
          if (inviteResponse.ok) {
            const inviteData = await inviteResponse.json()
            // If there are pending invitations, redirect to choice page
            if (inviteData.invitations && inviteData.invitations.length > 0) {
              window.location.href = '/invitations/choose'
              return
            }
          }
        } catch (err) {
          console.error('Error checking invitations:', err)
        }
        // No accounts and no invitations - account should have been created by getActiveAccountId
        // If we still have no accounts, there's an issue - don't allow dashboard to render
        console.error('No budget accounts found for user and no active account ID')
        setNeedsAccountSelection(false)
        setChecking(false)
        return
      }

      // If no active account and multiple accounts exist, show selection page
      if (!activeAccountId && accounts.length > 1) {
        setNeedsAccountSelection(true)
      } else if (!activeAccountId && accounts.length === 1) {
        // Auto-select the only account
        const switchResponse = await fetch('/api/budget-accounts/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: accounts[0].accountId }),
        })
        if (switchResponse.ok) {
          clearBudgetAccountsCache();
          setNeedsAccountSelection(false)
          window.location.reload() // Reload to refresh data
        } else {
          // If switch fails, still don't block - let user continue
          setNeedsAccountSelection(false)
        }
      } else {
        setNeedsAccountSelection(false)
      }
    } catch (error) {
      console.error('Error checking budget account selection:', error)
      setNeedsAccountSelection(false)
    } finally {
      setChecking(false)
    }
  }

  // Don't block on account selection page itself
  if (pathname === '/account-selection') {
    return <>{children}</>
  }

  if (checking) {
    return null // Or a loading spinner
  }

  if (needsAccountSelection) {
    return <AccountSelectionPage />
  }

  return <>{children}</>
}


