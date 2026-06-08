'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: number;
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  is_read: boolean;
  created_at: string;
  notification_type_id: string;
  metadata?: Record<string, any>;
}

export function NotificationDetail({ notification }: { notification: Notification }) {
  const router = useRouter();
  const isHtml = notification.metadata?.is_html === true;

  // Only show related action if it's a valid URL that's different from current page
  // Extract pathname from full URL if needed
  const getPathname = (url: string | null): string | null => {
    if (!url) return null;
    try {
      // If it's a full URL, extract the pathname
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const urlObj = new URL(url);
        return urlObj.pathname;
      }
      // If it's already a path, use it as-is
      return url;
    } catch {
      // If URL parsing fails, assume it's a path
      return url;
    }
  };

  const actionPathname = getPathname(notification.action_url);
  const hasValidAction = actionPathname && 
    actionPathname !== '/notifications' &&
    !actionPathname.startsWith('/notifications/');

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/notifications')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Notifications
      </Button>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">{notification.title}</h1>
          {!notification.is_read && (
            <Badge variant="default" className="bg-blue-500">New</Badge>
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
