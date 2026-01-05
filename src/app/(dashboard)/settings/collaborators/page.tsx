"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Mail, UserX, Shield, Edit, Eye, Loader2, X } from "lucide-react"
import { LoadingSpinner } from '@/components/ui/loading-spinner';
// Note: getActiveAccountId is server-only, we'll get accountId from API

interface Member {
  userId: string
  email: string
  role: 'owner' | 'editor' | 'viewer'
  isOwner: boolean
  joinedAt: string
}

interface Invitation {
  id: number
  email: string
  role: 'editor' | 'viewer'
  expires_at: string
  invited_by?: string
}

export default function CollaboratorsPage() {
  const router = useRouter()
  const [accountId, setAccountId] = useState<number | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')
  const [inviting, setInviting] = useState(false)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [cancellingInvitation, setCancellingInvitation] = useState<number | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [invitationToCancel, setInvitationToCancel] = useState<number | null>(null)

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      loadData();
    }
  }, []);

  const loadData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      // Get active budget account
      const accountsResponse = await fetch('/api/budget-accounts');
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        const activeId = accountsData.activeAccountId;
        setAccountId(activeId);
        
        if (activeId) {
          await Promise.all([
            loadMembers(activeId),
            loadInvitations()
          ]);
        }
      } else {
        toast.error('Failed to load account information');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load collaborators');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const loadMembers = async (id: number) => {
    try {
      const [membersResponse, accountsResponse] = await Promise.all([
        fetch(`/api/budget-accounts/${id}/members`),
        fetch('/api/budget-accounts')
      ]);
      
      if (membersResponse.ok) {
        const data = await membersResponse.json();
        
        // Ensure members is always an array
        if (data && Array.isArray(data.members)) {
          setMembers(data.members);
        } else {
          console.error('Invalid members data:', data);
          setMembers([]);
        }
      }
      
      // Check if current user is owner
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        const currentAccount = accountsData.accounts?.find((a: any) => a.accountId === id);
        setIsOwner(currentAccount?.isOwner || currentAccount?.role === 'owner' || false);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      setMembers([]); // Set empty array on error
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/invitations');
      if (response.ok) {
        const data = await response.json();
        
        // Ensure invitations is always an array
        if (data && Array.isArray(data.invitations)) {
          setInvitations(data.invitations);
        } else {
          console.error('Invalid invitations data:', data);
          setInvitations([]);
        }
      } else {
        setInvitations([]);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
      setInvitations([]); // Set empty array on error
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email is required')
      return
    }

    setInviting(true)
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to send invitation')
        return
      }

      toast.success('Invitation sent successfully')
      setShowInviteDialog(false)
      setInviteEmail("")
      setInviteRole('editor')
      await loadInvitations()
    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!accountId) return

    setRemovingMember(userId)
    try {
      const response = await fetch(`/api/budget-accounts/${accountId}/members/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove member')
        return
      }

      toast.success('Member removed successfully')
      await loadMembers(accountId)
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
    } finally {
      setRemovingMember(null)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'editor' | 'viewer') => {
    if (!accountId) return

    setUpdatingRole(userId)
    try {
      const response = await fetch(`/api/budget-accounts/${accountId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to update role')
        return
      }

      toast.success('Role updated successfully')
      await loadMembers(accountId)
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update role')
    } finally {
      setUpdatingRole(null)
    }
  }

  const handleCancelInvitationClick = (invitationId: number) => {
    setInvitationToCancel(invitationId)
    setShowCancelDialog(true)
  }

  const handleCancelInvitation = async () => {
    if (!invitationToCancel) return

    setCancellingInvitation(invitationToCancel)
    try {
      const response = await fetch(`/api/invitations/${invitationToCancel}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Failed to cancel invitation')
        return
      }

      toast.success('Invitation revoked successfully')
      setShowCancelDialog(false)
      setInvitationToCancel(null)
      await loadInvitations()
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      toast.error('Failed to cancel invitation')
    } finally {
      setCancellingInvitation(null)
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!accountId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Account</CardTitle>
          <CardDescription>Please select an account to manage collaborators.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // isOwner is now a state variable set from API response

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Collaborators</CardTitle>
                <CardDescription>
                  Manage who can access and edit this budget account
                </CardDescription>
              </div>
              {isOwner && (
                <Button onClick={() => setShowInviteDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite User
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.email}</span>
                        <Badge variant={member.role === 'owner' ? 'default' : member.role === 'editor' ? 'secondary' : 'outline'}>
                          {member.role === 'owner' && <Shield className="mr-1 h-3 w-3" />}
                          {member.role === 'editor' && <Edit className="mr-1 h-3 w-3" />}
                          {member.role === 'viewer' && <Eye className="mr-1 h-3 w-3" />}
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {isOwner && !member.isOwner && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleUpdateRole(member.userId, value as 'editor' | 'viewer')}
                        disabled={updatingRole === member.userId}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(member.userId)}
                        disabled={removingMember === member.userId}
                      >
                        {removingMember === member.userId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserX className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No collaborators yet. Invite someone to get started!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations that haven't been accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{invitation.email}</span>
                        <Badge variant="outline">{invitation.role}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitationClick(invitation.id)}
                        disabled={cancellingInvitation === invitation.id}
                      >
                        {cancellingInvitation === invitation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to collaborate on this budget account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInvite()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as 'editor' | 'viewer')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Editor</div>
                        <div className="text-xs text-muted-foreground">Can view and edit</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <div>
                        <div className="font-medium">Viewer</div>
                        <div className="text-xs text-muted-foreground">Can only view</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowInviteDialog(false)
                setInviteEmail("")
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!inviteEmail.trim() || inviting}>
              {inviting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Invitation Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this invitation? The user will not be able to access the account using this invitation link. 
              If they haven't accepted yet, they will need a new invitation to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCancelDialog(false)
              setInvitationToCancel(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvitation}
              disabled={cancellingInvitation !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancellingInvitation !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoking...
                </>
              ) : (
                'Revoke Invitation'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


