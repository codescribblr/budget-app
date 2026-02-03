"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, XCircle, User } from "lucide-react"
import Link from "next/link"

export default function AcceptInvitationPage() {
  const router = useRouter()
  const params = useParams()
  const token = params?.token as string

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitation, setInvitation] = useState<{
    account: { id: number; name: string; ownerEmail?: string | null }
    role: string
    userHasOwnAccount: boolean
    hasOtherAccounts?: boolean
    alreadyMember?: boolean
  } | null>(null)
  const [success, setSuccess] = useState(false)
  const [creatingAccount, setCreatingAccount] = useState(false)

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link")
      setLoading(false)
      return
    }

    checkInvitation()
  }, [token])

  const checkInvitation = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // User not logged in - check if user exists and redirect accordingly
        const checkResponse = await fetch(`/api/invitations/${token}/check`)
        
        if (!checkResponse.ok) {
          const checkData = await checkResponse.json()
          setError(checkData.error || "This invitation is no longer valid. Please contact the account owner for a new invitation.")
          setLoading(false)
          return
        }

        const checkData = await checkResponse.json()
        
        // If user doesn't exist, redirect to signup
        if (!checkData.userExists) {
          router.push(`/signup?redirectTo=/invite/${token}&email=${encodeURIComponent(checkData.email)}`)
          return
        }
        
        // If user exists, redirect to login
        router.push(`/login?redirectTo=/invite/${token}`)
        return
      }

      // Fetch invitation details using GET endpoint (not accept endpoint)
      const response = await fetch(`/api/invitations/${token}`)

      if (response.status === 404) {
        setError("This invitation has been revoked or is no longer valid. Please contact the account owner for a new invitation.")
        setLoading(false)
        return
      }

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 400 && data.error?.includes('expired')) {
          setError("This invitation has expired. Please contact the account owner for a new invitation.")
        } else if (response.status === 403) {
          setError(data.error || "You don't have permission to accept this invitation.")
        } else {
          setError(data.error || "Failed to load invitation")
        }
        setLoading(false)
        return
      }

      // If we get here, we can show the accept button
      const data = await response.json()
      
      // If user is already a member, redirect to dashboard immediately
      if (data.alreadyMember) {
        // Switch to this account and redirect
        try {
          await fetch('/api/budget-accounts/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: data.account.id }),
          })
        } catch (err) {
          console.error('Error switching account:', err)
        }
        
        setLoading(false)
        // Full page reload to ensure all data, features, permissions, and contexts
        // are refreshed for the new account
        window.location.href = '/dashboard'
        return
      }
      
      setInvitation(data)
      setLoading(false)
    } catch (err) {
      console.error('Error checking invitation:', err)
      setError("Failed to load invitation")
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!token) return

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to accept invitation")
        setAccepting(false)
        return
      }

      setSuccess(true)
      setInvitation(data)

      // Redirect to dashboard after 2 seconds with full page reload
      // to ensure all data, features, permissions, and contexts are refreshed
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 2000)
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError("Failed to accept invitation")
      setAccepting(false)
    }
  }

  const handleCreateOwnAccount = async () => {
    setCreatingAccount(true)
    setError(null)

    try {
      // Create a new account for the user
      const response = await fetch('/api/budget-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'My Budget',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to create account')
        setCreatingAccount(false)
        return
      }

      const data = await response.json()
      
      // Switch to the new account
      await fetch('/api/budget-accounts/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: data.account.id }),
      })

      // Redirect to dashboard
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Error creating account:', err)
      setError('Failed to create account')
      setCreatingAccount(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Invitation Not Available
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium mb-2">This invitation is no longer valid</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Possible reasons:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>The invitation has been revoked by the account owner</li>
                <li>The invitation has expired</li>
                <li>The invitation has already been accepted</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Link href="/dashboard" className="flex-1">
                <Button variant="outline" className="w-full">Go to Dashboard</Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button className="w-full">Sign In</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Invitation Accepted!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You've been added to <strong>{invitation?.account?.name || 'Unknown Account'}</strong> as a {invitation?.role}.
            </p>
            {invitation?.account?.ownerEmail && (
              <p className="text-sm text-muted-foreground mb-4">
                Account owner: {invitation.account.ownerEmail}
              </p>
            )}
            {!invitation?.userHasOwnAccount && (
              <p className="text-sm text-muted-foreground mb-4">
                You can create your own account anytime from the account switcher in the header.
              </p>
            )}
            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            You've been invited to collaborate on a budget account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {invitation && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Account:</p>
                <p className="text-lg font-semibold">{invitation.account?.name || 'Unknown Account'}</p>
                {invitation.account?.ownerEmail && (
                  <p className="text-sm text-muted-foreground">Owner: {invitation.account.ownerEmail}</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Role:</p>
                <p className="text-sm text-muted-foreground capitalize">{invitation.role}</p>
              </div>
              {error && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
                  {error}
                </div>
              )}
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full"
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                By accepting, you'll be able to {invitation.role === 'viewer' ? 'view' : 'view and edit'} this account's budget data.
              </p>
              
              {!invitation.userHasOwnAccount && !invitation.hasOtherAccounts && (
                <div className="border-t pt-4 mt-4">
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium">Or create your own account</p>
                    <p className="text-xs text-muted-foreground">
                      You can create your own budget account and still accept this invitation later from the account switcher.
                    </p>
                  </div>
                  <Button
                    onClick={handleCreateOwnAccount}
                    variant="outline"
                    disabled={creatingAccount || accepting}
                    className="w-full"
                  >
                    {creatingAccount ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <User className="mr-2 h-4 w-4" />
                        Create My Own Account
                      </>
                    )}
                  </Button>
                </div>
              )}
              {(invitation.userHasOwnAccount || invitation.hasOtherAccounts) && (
                <div className="border-t pt-4 mt-4">
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium">Or switch to another account</p>
                    <p className="text-xs text-muted-foreground">
                      You can accept this invitation later from the account switcher in the header.
                    </p>
                  </div>
                  <Link href="/account-selection">
                    <Button
                      variant="outline"
                      disabled={accepting}
                      className="w-full"
                    >
                      Go to Account Selector
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


