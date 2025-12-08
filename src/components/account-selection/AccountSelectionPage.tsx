"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Account {
  accountId: number
  accountName: string
  role: 'owner' | 'editor' | 'viewer'
  isOwner: boolean
}

export function AccountSelectionPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/budget-accounts')
      if (response.ok) {
        const data = await response.json()
        const accountsList = data.accounts || []
        setAccounts(accountsList)

        // Auto-select if only one account
        if (accountsList.length === 1) {
          await handleSelectAccount(accountsList[0].accountId)
        }
      }
    } catch (error) {
      console.error('Error loading budget accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAccount = async (accountId: number) => {
    setSelecting(true)
    try {
      const response = await fetch('/api/budget-accounts/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })

      if (response.ok) {
        // Small delay to ensure cookie is set
        await new Promise(resolve => setTimeout(resolve, 100))
        // Full page reload to ensure all data, features, permissions, and contexts
        // are refreshed for the new account
        window.location.href = '/dashboard'
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to select account')
        setSelecting(false)
      }
    } catch (error) {
      console.error('Error selecting account:', error)
      toast.error('Failed to select account')
      setSelecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Accounts Found</CardTitle>
            <CardDescription>
              You don't have access to any budget accounts yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select an Account</CardTitle>
          <CardDescription>
            Please select which budget account you'd like to access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {accounts.map((account) => (
            <Button
              key={account.accountId}
              variant="outline"
              className="w-full justify-between h-auto py-3"
              onClick={() => handleSelectAccount(account.accountId)}
              disabled={selecting}
            >
              <div className="flex flex-col items-start flex-1">
                <span className="font-medium">{account.accountName}</span>
                <span className="text-xs text-muted-foreground">
                  {account.isOwner ? 'Owner' : account.role}
                </span>
              </div>
              <Badge variant={account.isOwner ? 'default' : account.role === 'editor' ? 'secondary' : 'outline'}>
                {account.isOwner ? 'Owner' : account.role}
              </Badge>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

