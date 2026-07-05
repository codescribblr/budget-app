'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Archive, ArchiveRestore, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Notification {
  id: number;
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  is_read: boolean;
  is_archived?: boolean;
  archived_at?: string | null;
  created_at: string;
  notification_type_id: string;
  metadata?: Record<string, any>;
}

export function NotificationDetail({ notification: initialNotification }: { notification: Notification }) {
  const router = useRouter();
  const [notification, setNotification] = useState({
    ...initialNotification,
    is_read: initialNotification.is_read || true,
  });
  const isHtml = notification.metadata?.is_html === true;

  const getPathname = (url: string | null): string | null => {
    if (!url) return null;
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        return urlObj.pathname;
      }
      return url;
    } catch {
      return url;
    }
  };

  const actionPathname = getPathname(notification.action_url);
  const hasValidAction = actionPathname &&
    actionPathname !== '/notifications' &&
    !actionPathname.startsWith('/notifications/');

  const handleMarkAsRead = async () => {
    if (notification.is_read) return;

    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setNotification(prev => ({ ...prev, is_read: true }));
        toast.success('Notification marked as read');
        return;
      }

      const data = await response.json().catch(() => ({}));
      toast.error(data.error || 'Failed to mark notification as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleArchive = async () => {
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Notification archived');
        router.push('/notifications?filter=archived');
        return;
      }

      const data = await response.json().catch(() => ({}));
      toast.error(data.error || 'Failed to archive notification');
    } catch (error) {
      console.error('Error archiving notification:', error);
      toast.error('Failed to archive notification');
    }
  };

  const handleUnarchive = async () => {
    try {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false }),
      });

      if (response.ok) {
        setNotification(prev => ({ ...prev, is_archived: false, archived_at: null }));
        toast.success('Notification restored to inbox');
        return;
      }

      const data = await response.json().catch(() => ({}));
      toast.error(data.error || 'Failed to restore notification');
    } catch (error) {
      console.error('Error restoring notification:', error);
      toast.error('Failed to restore notification');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <Button variant="outline" onClick={() => router.push('/notifications')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Notifications
        </Button>
        <div className="flex gap-2">
          {!notification.is_read && !notification.is_archived && (
            <Button variant="outline" onClick={handleMarkAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark as read
            </Button>
          )}
          {notification.is_archived ? (
            <Button variant="outline" onClick={handleUnarchive}>
              <ArchiveRestore className="h-4 w-4 mr-2" />
              Restore to inbox
            </Button>
          ) : (
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{notification.title}</h1>
          {!notification.is_read && !notification.is_archived && (
            <Badge variant="default" className="bg-blue-500">New</Badge>
          )}
          {notification.is_archived && (
            <Badge variant="secondary">Archived</Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-2">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Content</CardTitle>
        </CardHeader>
        <CardContent>
          {isHtml ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: notification.message }}
            />
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {notification.message}
            </div>
          )}
        </CardContent>
      </Card>

      {hasValidAction && (
        <Card>
          <CardHeader>
            <CardTitle>Related Action</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push(notification.action_url!)}
              variant="default"
            >
              {notification.action_label || 'View'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
