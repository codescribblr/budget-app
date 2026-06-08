"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, UserPlus, User } from "lucide-react"
import Link from "next/link"

export default function ChooseAccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<Array<{
    token: string
    account: { id: number; name: string; ownerEmail?: string | null }
    role: string
  }>>([])

  useEffect(() => {
    checkInvitations()
  }, [])

  const checkInvitations = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // User not logged in - redirect to login
        router.push('/login')
        return
      }

      // Fetch pending invitations
      const response = await fetch('/api/invitations/my-invitations')

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to load invitations')
        setLoading(false)
        return
      }

      const data = await response.json()
      
      if (!data.invitations || data.invitations.length === 0) {
        // No pending invitations - redirect to dashboard
        // This shouldn't happen if they're on this page, but handle it gracefully
        router.push('/dashboard')
        return
      }

      setInvitations(data.invitations)
      setLoading(false)
    } catch (err) {
      console.error('Error checking invitations:', err)
      setError("Failed to load invitations")
      setLoading(false)
    }
  }

  const handleCreateOwnAccount = async () => {
    try {
      // Get user email to generate account name
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const accountName = user?.email?.split('@')[0] || 'My Budget'
      
      // Create a new account for the user
      const response = await fetch('/api/budget-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Failed to create account')
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
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error && invitations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive mb-4">{error}</p>
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
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>You have a pending invitation</CardTitle>
          <CardDescription>
            You've been invited to collaborate on a budget account. Choose how you'd like to proceed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invitations.map((invitation, index) => (
            <div key={invitation.token} className="border rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{invitation.account.name}</h3>
                {invitation.account.ownerEmail && (
                  <p className="text-sm text-muted-foreground">
                    Invited by: {invitation.account.ownerEmail}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Role: <span className="capitalize">{invitation.role}</span>
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push(`/invite/${invitation.token}`)}
                  className="flex-1"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Accept Invitation
                </Button>
              </div>
            </div>
          ))}

          <div className="border-t pt-6">
            <div className="space-y-2 mb-4">
              <h3 className="font-semibold">Or create your own account</h3>
              <p className="text-sm text-muted-foreground">
                You can create your own budget account and still accept invitations later from the account switcher.
              </p>
            </div>
            <Button
              onClick={handleCreateOwnAccount}
              variant="outline"
              className="w-full"
            >
              <User className="mr-2 h-4 w-4" />
              Create My Own Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
