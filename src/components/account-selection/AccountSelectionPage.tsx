"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

interface Account {
  accountId: number
  accountName: string
  role: 'owner' | 'editor' | 'viewer'
  isOwner: boolean
}

interface Invitation {
  id: number
  token: string
  account: {
    id: number
    name: string
  }
  role: string
  expires_at: string
}

export function AccountSelectionPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState<number | null>(null)
  const [accepting, setAccepting] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load accounts and invitations in parallel
      const [accountsResponse, invitationsResponse] = await Promise.all([
        fetch('/api/budget-accounts'),
        fetch('/api/invitations/my-invitations')
      ])

      if (accountsResponse.ok) {
        const data = await accountsResponse.json()
        setAccounts(data.accounts || [])
      }

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json()
        setInvitations(invitationsData.invitations || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAccount = async (accountId: number) => {
    setSelecting(accountId)
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
        setSelecting(null)
      }
    } catch (error) {
      console.error('Error selecting account:', error)
      toast.error('Failed to select account')
      setSelecting(null)
    }
  }

  const handleAcceptInvitation = async (token: string) => {
    setAccepting(token)
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Invitation accepted!')
        // Reload data to refresh accounts list
        await loadData()
        setAccepting(null)
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to accept invitation')
        setAccepting(null)
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      toast.error('Failed to accept invitation')
      setAccepting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Select an Account</h1>
        <p className="text-muted-foreground">
          Choose an account to access or accept a pending invitation.
        </p>
      </div>

      {(accounts.length > 0 || invitations.length > 0) ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Account Cards */}
          {accounts.map((account) => (
            <Card key={account.accountId} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg break-words">{account.accountName}</CardTitle>
                <CardDescription className="mt-1">
                  {account.isOwner ? 'You own this account' : `You are a ${account.role}`}
                </CardDescription>
                <div className="mt-2">
                  <Badge 
                    variant={account.isOwner ? 'default' : account.role === 'editor' ? 'secondary' : 'outline'}
                  >
                    {account.isOwner ? 'Owner' : account.role}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <Button
                  onClick={() => handleSelectAccount(account.accountId)}
                  disabled={selecting === account.accountId}
                  className="w-full"
                >
                  {selecting === account.accountId ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Activate Account
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Invitation Cards */}
          {invitations.map((invitation) => {
            const isExpired = new Date(invitation.expires_at) < new Date()
            return (
              <Card key={invitation.id} className="flex flex-col border-dashed">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 break-words">
                    <UserPlus className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="break-words">{invitation.account.name}</span>
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Invited as {invitation.role}
                    {isExpired && (
                      <span className="text-destructive block mt-1">This invitation has expired</span>
                    )}
                  </CardDescription>
                  <div className="mt-2">
                    <Badge variant="outline">Invitation</Badge>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button
                    onClick={() => handleAcceptInvitation(invitation.token)}
                    disabled={accepting === invitation.token || isExpired}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    variant={isExpired ? "outline" : "default"}
                  >
                    {accepting === invitation.token ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Accepting...
                      </>
                    ) : isExpired ? (
                      "Expired"
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Accept Invitation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
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
      )}
    </div>
  )
}


