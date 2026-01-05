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

      // If no accounts found, check for pending invitations sent to user's email
      if (accounts.length === 0) {
        try {
          const inviteResponse = await fetch('/api/invitations/my-invitations')
          if (inviteResponse.ok) {
            const inviteData = await inviteResponse.json()
            // If there are pending invitations, redirect to accept the first one
            if (inviteData.invitations && inviteData.invitations.length > 0) {
              const firstInvite = inviteData.invitations[0]
              window.location.href = `/invite/${firstInvite.token}`
              return
            }
          }
        } catch (err) {
          console.error('Error checking invitations:', err)
        }
        // No accounts and no invitations - user needs to create an account
        console.warn('No budget accounts found for user')
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


