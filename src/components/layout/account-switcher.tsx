"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Plus, Check } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Account {
  id: number
  name: string
  role: 'owner' | 'editor' | 'viewer'
  isOwner: boolean
}

export function AccountSwitcher() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null)
  const [hasOwnAccount, setHasOwnAccount] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAccountName, setNewAccountName] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
        setActiveAccountId(data.activeAccountId)
        setHasOwnAccount(data.hasOwnAccount || false)
      }
    } catch (error) {
      console.error('Error loading accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchAccount = async (accountId: number) => {
    try {
      const response = await fetch('/api/accounts/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })

      if (response.ok) {
        setActiveAccountId(accountId)
        router.refresh()
      }
    } catch (error) {
      console.error('Error switching account:', error)
    }
  }

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return

    setCreating(true)
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAccountName.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setShowCreateDialog(false)
        setNewAccountName("")
        await loadAccounts()
        // Switch to new account
        if (data.account?.id) {
          await handleSwitchAccount(data.account.id)
        }
      }
    } catch (error) {
      console.error('Error creating account:', error)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <div className="h-9 w-32 animate-pulse bg-muted rounded" />
  }

  const activeAccount = accounts.find(a => a.id === activeAccountId)
  const roleBadgeColor = activeAccount?.role === 'owner' ? 'default' : activeAccount?.role === 'editor' ? 'secondary' : 'outline'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-auto min-w-[200px] justify-between">
            <span className="truncate">
              {activeAccount?.name || 'Select Account'}
            </span>
            {activeAccount && (
              <Badge variant={roleBadgeColor} className="ml-2 text-xs">
                {activeAccount.role}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="start">
          <DropdownMenuLabel>Switch Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {accounts.map((account) => (
            <DropdownMenuItem
              key={account.id}
              onClick={() => handleSwitchAccount(account.id)}
              className="flex items-center justify-between"
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="truncate">{account.name}</span>
                <span className="text-xs text-muted-foreground">
                  {account.isOwner ? 'Owner' : account.role}
                </span>
              </div>
              {account.id === activeAccountId && (
                <Check className="ml-2 h-4 w-4" />
              )}
            </DropdownMenuItem>
          ))}
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
            <div className="space-y-2">
              <Label htmlFor="account-name">Account Name</Label>
              <Input
                id="account-name"
                placeholder="My Budget"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
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

