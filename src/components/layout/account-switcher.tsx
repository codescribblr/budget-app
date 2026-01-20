"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Plus, Check, ChevronDown, Shield } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface Account {
  accountId: number
  accountName: string
  role: 'owner' | 'editor' | 'viewer'
  isOwner: boolean
}

import { fetchBudgetAccounts, clearBudgetAccountsCache } from '@/lib/budget-accounts-cache';

export function AccountSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const { state } = useSidebar()
  const [mounted, setMounted] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null)
  const [hasOwnAccount, setHasOwnAccount] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAccountName, setNewAccountName] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    loadAccounts()
  }, [])

  // Use default icon during SSR to prevent hydration mismatch
  const logoSrc = mounted && resolvedTheme === "dark" ? "/icon-darkmode.svg" : "/icon.svg"

  const loadAccounts = async () => {
    try {
      const data = await fetchBudgetAccounts();
      console.log('[AccountSwitcher] Received data:', { 
        isAdmin: data.isAdmin, 
        accountsCount: data.accounts?.length 
      });
      setAccounts(data.accounts);
      setActiveAccountId(data.activeAccountId);
      setHasOwnAccount(data.hasOwnAccount);
      setIsAdmin(data.isAdmin || false);

      // Auto-select if only one account and none is currently selected
      if (data.accounts.length === 1 && !data.activeAccountId) {
        await handleSwitchAccount(data.accounts[0].accountId);
      }
    } catch (error) {
      console.error('Error loading budget accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSwitchAccount = async (accountId: number | 'admin') => {
    try {
      if (accountId === 'admin') {
        // Navigate to admin dashboard
        router.push('/admin')
        return
      }

      const response = await fetch('/api/budget-accounts/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })

      if (response.ok) {
        // If we're currently on an admin page, navigate to dashboard instead of reloading
        if (pathname?.startsWith('/admin')) {
          window.location.href = '/dashboard'
        } else {
          // Full page reload to ensure all data, features, permissions, and contexts
          // are refreshed for the new account. This ensures:
          // - All server-side data is re-fetched
          // - All client-side state is reset
          // - All hooks and contexts re-initialize
          // - Permissions are re-checked
          // - Subscription status is re-fetched
          // - Feature flags are re-evaluated
          window.location.reload()
        }
      }
    } catch (error) {
      console.error('Error switching budget account:', error)
    }
  }

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return

    setCreating(true)
    setCreateError(null)
    try {
      const response = await fetch('/api/budget-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAccountName.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setShowCreateDialog(false)
        setNewAccountName("")
        setCreateError(null)
        // Clear cache and reload
        clearBudgetAccountsCache();
        await loadAccounts()
        // Switch to new account - this will trigger a full page reload
        // via handleSwitchAccount to ensure all data, features, permissions,
        // and contexts are refreshed for the new account
        if (data.account?.id) {
          await handleSwitchAccount(data.account.id)
        }
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({ error: 'Failed to create account' }))
        setCreateError(errorData.error || 'Failed to create account. Please try again.')
      }
    } catch (error) {
      console.error('Error creating account:', error)
      setCreateError('An unexpected error occurred. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="h-8 w-8 animate-pulse bg-muted rounded-lg" />
        {state === "expanded" && (
          <div className="flex flex-col gap-1">
            <div className="h-4 w-24 animate-pulse bg-muted rounded" />
            <div className="h-3 w-32 animate-pulse bg-muted rounded" />
          </div>
        )}
      </div>
    )
  }

  const activeAccount = accounts.find(a => a.accountId === activeAccountId)
  const roleBadgeColor = activeAccount?.role === 'owner' ? 'default' : activeAccount?.role === 'editor' ? 'secondary' : 'outline'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className={cn(
              "flex items-center hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full h-auto py-2",
              state === "expanded" 
                ? "gap-2 px-2 justify-start" 
                : "justify-center px-1"
            )}
          >
            <div className={cn(
              "flex items-center justify-center rounded-lg overflow-hidden shrink-0",
              state === "expanded" ? "h-8 w-8" : "h-7 w-7"
            )}>
              <Image
                src={logoSrc}
                alt="Budget App"
                width={32}
                height={32}
                className={state === "expanded" ? "h-8 w-8" : "h-7 w-7"}
                priority
              />
            </div>
            {state === "expanded" && (
              <>
                <div className="flex flex-col items-start flex-1 min-w-0 gap-1">
                  <span className="text-sm font-semibold leading-none">Budget App</span>
                  <span className="text-xs text-muted-foreground leading-none truncate w-full text-left">
                    {pathname?.startsWith('/admin')
                      ? 'Admin'
                      : activeAccount?.accountName || 'Select Account'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start" sideOffset={4}>
          <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.accountId}
              onClick={() => handleSwitchAccount(account.accountId)}
              className="flex items-center justify-between"
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="truncate">{account.accountName}</span>
                <span className="text-xs text-muted-foreground">
                  {account.isOwner ? 'Owner' : account.role}
                </span>
              </div>
              {account.accountId === activeAccountId && (
                <Check className="ml-2 h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleSwitchAccount('admin')}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="truncate">Admin</span>
                </div>
                {pathname?.startsWith('/admin') && (
                  <Check className="ml-2 h-4 w-4" />
                )}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          {!hasOwnAccount && (
            <DropdownMenuItem onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create My Own Account</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Your Own Account</DialogTitle>
            <DialogDescription>
              Create a new budget account that you will own and manage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {createError && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {createError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                placeholder="My Budget"
                value={newAccountName}
                onChange={(e) => {
                  setNewAccountName(e.target.value)
                  setCreateError(null) // Clear error when user types
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateAccount()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setNewAccountName("")
                setCreateError(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateAccount} disabled={!newAccountName.trim() || creating}>
              {creating ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


