'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { RichTextEditor } from './RichTextEditor';
import { SearchableSelect, type SearchableSelectOption } from './SearchableSelect';
import { useDebounceValue } from '@/hooks/use-debounce';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdminNotification {
  id: number;
  createdBy: string | null;
  title: string;
  content: string;
  pushTitle: string | null;
  pushBody: string | null;
  targetType: 'global' | 'account' | 'user';
  targetId: string | null;
  status: 'draft' | 'sent';
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Account {
  id: string;
  name: string;
  ownerEmail: string;
}

interface User {
  id: string;
  email: string;
}

export function AdminNotificationForm({ notificationId }: { notificationId?: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(!!notificationId);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [notification, setNotification] = useState<AdminNotification | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountOptions, setAccountOptions] = useState<SearchableSelectOption[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userOptions, setUserOptions] = useState<SearchableSelectOption[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);

  // Debounce search values
  const debouncedAccountSearch = useDebounceValue(accountSearch, 300);
  const debouncedUserSearch = useDebounceValue(userSearch, 300);

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [targetType, setTargetType] = useState<'global' | 'account' | 'user'>('global');
  const [targetId, setTargetId] = useState<string>('');

  useEffect(() => {
    if (notificationId) {
      fetchNotification();
    }
  }, [notificationId]);

  // Fetch accounts when account search changes (debounced)
  useEffect(() => {
    if (targetType === 'account') {
      fetchAccounts(debouncedAccountSearch);
    }
  }, [debouncedAccountSearch, targetType]);

  // Fetch users when user search changes (debounced)
  useEffect(() => {
    if (targetType === 'user') {
      searchUsers(debouncedUserSearch);
    }
  }, [debouncedUserSearch, targetType]);

  const fetchNotification = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/notifications/${notificationId}`);
      if (response.ok) {
        const data = await response.json();
        const notif = data.notification;
        setNotification(notif);
        setTitle(notif.title);
        setContent(notif.content);
        setPushTitle(notif.pushTitle || '');
        setPushBody(notif.pushBody || '');
        setTargetType(notif.targetType);
        setTargetId(notif.targetId || '');

        // Load account/user options if target is set
        if (notif.targetType === 'account' && notif.targetId) {
          await fetchAccounts('');
          // Find and set the selected account option
          const accountResponse = await fetch('/api/admin/notifications/accounts');
          if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            const fetchedAccounts = accountData.accounts || [];
            setAccounts(fetchedAccounts);
            setAccountOptions(
              fetchedAccounts.map((account: Account) => ({
                value: account.id,
                label: account.name,
                description: account.ownerEmail,
              }))
            );
          }
        } else if (notif.targetType === 'user' && notif.targetId) {
          await searchUsers('');
          // Find and set the selected user option
          const userResponse = await fetch('/api/admin/notifications/users?limit=100');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            const fetchedUsers = userData.users || [];
            setUsers(fetchedUsers);
            setUserOptions(
              fetchedUsers.map((user: User) => ({
                value: user.id,
                label: user.email,
              }))
            );
          }
        }
      } else {
        toast.error('Failed to load notification');
        router.push('/admin/notifications');
      }
    } catch (error) {
      console.error('Error fetching notification:', error);
      toast.error('Failed to load notification');
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async (search: string = '') => {
    try {
      setAccountLoading(true);
      const params = new URLSearchParams();
      if (search) {
        params.set('search', search);
      }
      const response = await fetch(`/api/admin/notifications/accounts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedAccounts = data.accounts || [];
        setAccounts(fetchedAccounts);
        setAccountOptions(
          fetchedAccounts.map((account: Account) => ({
            value: account.id,
            label: account.name,
            description: account.ownerEmail,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to fetch accounts');
    } finally {
      setAccountLoading(false);
    }
  };

  const searchUsers = async (search: string = '') => {
    try {
      setUserLoading(true);
      const params = new URLSearchParams();
      if (search) {
        params.set('search', search);
      }
      params.set('limit', '50');
      const response = await fetch(`/api/admin/notifications/users?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedUsers = data.users || [];
        setUsers(fetchedUsers);
        setUserOptions(
          fetchedUsers.map((user: User) => ({
            value: user.id,
            label: user.email,
          }))
        );
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setUserLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    if (targetType !== 'global' && !targetId) {
      toast.error('Please select a target');
      return;
    }

    try {
      setSaving(true);
      const url = notificationId
        ? `/api/admin/notifications/${notificationId}`
        : '/api/admin/notifications';
      const method = notificationId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content,
          pushTitle: pushTitle || null,
          pushBody: pushBody || null,
          targetType,
          targetId: targetId || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(notificationId ? 'Notification updated' : 'Notification created');
        router.push(`/admin/notifications/${notificationId || data.id}/edit`);
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to save notification');
      }
    } catch (error) {
      console.error('Error saving notification:', error);
      toast.error('Failed to save notification');
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!notificationId) {
      toast.error('Please save the notification first');
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    if (!confirm('Are you sure you want to send this notification? This action cannot be undone.')) {
      return;
    }

    try {
      setSending(true);
      const response = await fetch(`/api/admin/notifications/${notificationId}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Notification sent successfully');
        router.push('/admin/notifications');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  const isDraft = !notification || notification.status === 'draft';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          {notificationId ? 'Edit Notification' : 'New Notification'}
        </h1>
        <p className="text-muted-foreground mt-2">
          Create a notification to send to users
        </p>
      </div>

      {!isDraft && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This notification has already been sent and cannot be edited.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Notification Content</CardTitle>
          <CardDescription>
            Create the main notification content that users will see
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              disabled={!isDraft}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Enter notification content..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Push Notification (Optional)</CardTitle>
          <CardDescription>
            Customize the push notification message. If left empty, users will receive a default message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pushTitle">Push Notification Title</Label>
            <Input
              id="pushTitle"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              placeholder="Leave empty for default"
              disabled={!isDraft}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pushBody">Push Notification Body</Label>
            <Textarea
              id="pushBody"
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              placeholder="Leave empty for default"
              rows={3}
              disabled={!isDraft}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target Audience</CardTitle>
          <CardDescription>
            Select who should receive this notification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetType">Target Type *</Label>
            <Select
              value={targetType}
              onValueChange={(value: 'global' | 'account' | 'user') => {
                setTargetType(value);
                setTargetId('');
                setAccountSearch('');
                setUserSearch('');
                // Load initial data when switching to account or user
                if (value === 'account') {
                  fetchAccounts('');
                } else if (value === 'user') {
                  searchUsers('');
                }
              }}
              disabled={!isDraft}
            >
              <SelectTrigger id="targetType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">All Users (Global)</SelectItem>
                <SelectItem value="account">All Users in Account</SelectItem>
                <SelectItem value="user">Single User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === 'account' && (
            <div className="space-y-2">
              <Label htmlFor="targetAccount">Account *</Label>
              <SearchableSelect
                options={accountOptions}
                value={targetId}
                onValueChange={setTargetId}
                placeholder="Search and select an account..."
                searchPlaceholder="Search accounts by name..."
                emptyMessage="No accounts found."
                disabled={!isDraft}
                loading={accountLoading}
                onSearchChange={setAccountSearch}
              />
            </div>
          )}

          {targetType === 'user' && (
            <div className="space-y-2">
              <Label htmlFor="targetUser">User *</Label>
              <SearchableSelect
                options={userOptions}
                value={targetId}
                onValueChange={setTargetId}
                placeholder="Search and select a user..."
                searchPlaceholder="Search users by email..."
                emptyMessage="No users found."
                disabled={!isDraft}
                loading={userLoading}
                onSearchChange={setUserSearch}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button
          onClick={handleSave}
          disabled={saving || sending || !isDraft}
        >
          {saving ? 'Saving...' : notificationId ? 'Update Draft' : 'Save Draft'}
        </Button>
        {notificationId && isDraft && (
          <Button
            onClick={handleSend}
            disabled={saving || sending}
            variant="default"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => router.push('/admin/notifications')}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
